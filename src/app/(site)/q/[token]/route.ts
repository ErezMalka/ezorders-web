import { createHash } from "node:crypto";

import { renderQuoteDocument } from "@/lib/agent/quote-html";
import {
  renderExpiredPanel,
  renderResponseDone,
  renderResponsePanel,
  withResponsePanel,
} from "@/lib/agent/quote-response-html";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEFAULT_CATALOGUE, type ItemGroup } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The customer's view of a quote, and the place they answer it.
 *
 * No account, no login: the 24-byte token in the URL is the capability. That is
 * a deliberate trade — a customer will not create an account to read a price,
 * and a link they can forward to their partner is a feature, not a leak.
 *
 * The token is never used to query the table directly. It goes to
 * quote_by_token(), a security-definer function that returns only display
 * fields, refuses drafts, and records the view. So a caller with a guessed or
 * stolen token learns exactly what the intended reader would, and nothing about
 * any other quote.
 *
 * POST is the acceptance. It re-renders the document server-side and hashes it,
 * so what gets recorded is the document as the database can reproduce it — not
 * a value the browser was trusted to report.
 */

interface PublicQuote {
  quote_number: string;
  created_at: string;
  valid_until: string;
  status: string;
  customer_name: string;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_tax_id: string | null;
  setup_total: string | number;
  hardware_total: string | number;
  monthly_eligible: string | number;
  discount_percent: string | number;
  discount_amount: string | number;
  monthly_non_eligible: string | number;
  monthly_total: string | number;
  vat_percent: string | number;
  term_months: string | number;
  notes: string | null;
  agent_name: string | null;
  is_expired: boolean;
  responded: boolean;
  response: "accepted" | "rejected" | null;
  responded_at: string | null;
  order_number: string | null;
  items: Array<{
    label: string;
    note: string | null;
    item_group: ItemGroup;
    image: string | null;
    quantity: string | number;
    setup_unit: string | number;
    setup_total: string | number;
    monthly_total: string | number;
  }>;
}

// Hebrew for the handful of ways an answer can bounce. Anything unlisted is a
// bug on our side and says so rather than blaming the customer.
const ERRORS: Record<string, string> = {
  expired: "תוקף ההצעה פג, ולכן לא ניתן לאשר אותה. פנו אלינו ונשלח הצעה מעודכנת.",
  signer_required: "צריך למלא שם מלא כדי לאשר את ההצעה.",
  consent_required: "צריך לסמן את תיבת האישור.",
  bad_response: "משהו השתבש בשליחה. נסו שוב.",
  failed: "לא הצלחנו לרשום את התשובה כרגע. נסו שוב בעוד רגע.",
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isTokenShaped(token)) return notFoundResponse();

  const quote = await loadQuote(token, true);
  if (quote === "error") return errorResponse();
  if (!quote) return notFoundResponse();

  const errorCode = new URL(request.url).searchParams.get("e");
  return new Response(renderPage(quote, token, errorCode), { headers: htmlHeaders });
}

/**
 * The answer.
 *
 * Redirects rather than rendering, so a refresh after answering re-reads the
 * quote instead of re-posting it — and the customer lands on their confirmation
 * rather than a browser dialogue asking whether to submit the form again.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isTokenShaped(token)) return notFoundResponse();

  // A cross-site POST would need the token to be useful at all, so this is not
  // the security boundary — but rejecting an obviously foreign origin costs one
  // comparison and removes a class of accident.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return notFoundResponse();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirectBack(request, token, "bad_response");
  }

  const responseKind = String(form.get("response") ?? "");
  if (responseKind !== "accepted" && responseKind !== "rejected") {
    return redirectBack(request, token, "bad_response");
  }

  if (responseKind === "accepted" && form.get("consent") !== "1") {
    return redirectBack(request, token, "consent_required");
  }

  // Read without counting a view: the customer is answering, not browsing, and
  // this read exists only so the document can be hashed.
  const quote = await loadQuote(token, false);
  if (quote === "error") return errorResponse();
  if (!quote) return notFoundResponse();

  // The hash is of the document alone — no response panel, no error banner — so
  // it can be recomputed from the stored lines at any point in the future and
  // compared. This is the evidence: not that someone drew a signature, but that
  // the document has not changed since they agreed to it.
  const documentHash =
    responseKind === "accepted"
      ? createHash("sha256").update(renderDocument(quote), "utf8").digest("hex")
      : null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("quote_respond_by_token", {
    p_token: token,
    p_response: responseKind,
    p_signer_name: field(form, "signer_name", 120),
    p_signer_role: field(form, "signer_role", 80),
    p_signer_tax_id: field(form, "signer_tax_id", 40),
    p_signer_email: field(form, "signer_email", 120),
    p_signer_phone: field(form, "signer_phone", 40),
    p_reason: field(form, "reason", 500),
    p_document_hash: documentHash,
    p_ip: clientIp(request),
    p_user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    console.error("[q/token] respond failed", error);
    return redirectBack(request, token, "failed");
  }

  const result = (data ?? {}) as { ok?: boolean; code?: string };
  if (result.ok !== true) {
    return redirectBack(request, token, result.code === "not_found" ? null : (result.code ?? "failed"));
  }

  return redirectBack(request, token, null);
}

// ── helpers ──────────────────────────────────────────────────
/** The token is hex from gen_random_bytes(24); anything else is a probe. */
function isTokenShaped(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token);
}

async function loadQuote(token: string, recordView: boolean): Promise<PublicQuote | null | "error"> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("quote_by_token", {
    p_token: token,
    p_record_view: recordView,
  });

  if (error) {
    console.error("[q/token] lookup failed", error);
    return "error";
  }
  return (data as PublicQuote | null) ?? null;
}

function field(form: FormData, name: string, max: number): string | null {
  const raw = form.get(name);
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, max);
  return value.length > 0 ? value : null;
}

/**
 * The first address in X-Forwarded-For. Whatever the proxy reported is what we
 * record; the database refuses anything that is not shaped like an address
 * rather than failing the acceptance over it.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64) || null;
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

function redirectBack(request: Request, token: string, errorCode: string | null) {
  const url = new URL(`/q/${token}`, request.url);
  if (errorCode) url.searchParams.set("e", errorCode);
  else url.hash = "respond";
  return Response.redirect(url, 303);
}

function renderDocument(quote: PublicQuote): string {
  return renderQuoteDocument({
    quoteNumber: quote.quote_number,
    issuedAt: new Date(quote.created_at),
    validUntil: new Date(quote.valid_until),
    customerName: quote.customer_name,
    customerContact: quote.customer_contact,
    customerPhone: quote.customer_phone,
    customerEmail: quote.customer_email,
    customerTaxId: quote.customer_tax_id,
    agentName: quote.agent_name ?? "EZOrders",
    items: quote.items.map((item) => ({
      label: item.label,
      note: item.note,
      item_group: item.item_group,
      image: item.image,
      quantity: Number(item.quantity),
      setup_unit: Number(item.setup_unit),
      setup_total: Number(item.setup_total),
      monthly_total: Number(item.monthly_total),
    })),
    baseSetup: DEFAULT_CATALOGUE.baseSetup,
    setupTotal: Number(quote.setup_total),
    hardwareTotal: Number(quote.hardware_total ?? 0),
    monthlyEligible: Number(quote.monthly_eligible),
    discountPercent: Number(quote.discount_percent),
    discountAmount: Number(quote.discount_amount),
    monthlyNonEligible: Number(quote.monthly_non_eligible),
    monthlyTotal: Number(quote.monthly_total),
    vatPercent: Number(quote.vat_percent),
    termMonths: Number(quote.term_months),
    notes: quote.notes,
  });
}

/**
 * Document plus whichever panel the quote's state calls for. The order of these
 * branches is the product decision: an answered quote shows its answer even
 * after it expires, because "you already accepted this" is more useful than
 * "this is out of date".
 */
function renderPage(quote: PublicQuote, token: string, errorCode: string | null): string {
  const document = renderDocument(quote);

  if (quote.responded && quote.response) {
    return withResponsePanel(
      document,
      renderResponseDone({
        response: quote.response,
        orderNumber: quote.order_number,
        respondedAt: quote.responded_at ? new Date(quote.responded_at) : null,
        agentName: quote.agent_name,
      })
    );
  }

  if (quote.is_expired) {
    return withResponsePanel(document, renderExpiredPanel(new Date(quote.valid_until), quote.agent_name));
  }

  return withResponsePanel(
    document,
    renderResponsePanel({
      action: `/q/${token}`,
      customerName: quote.customer_name,
      customerTaxId: quote.customer_tax_id,
      customerEmail: quote.customer_email,
      customerPhone: quote.customer_phone,
      validUntil: new Date(quote.valid_until),
      error: errorCode ? (ERRORS[errorCode] ?? ERRORS.failed!) : null,
    })
  );
}

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  // Prices change, views are counted, and an answered quote must stop showing
  // buttons. A cached copy would break all three.
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * One response for "no such quote" and for "not sent yet". Distinguishing them
 * would tell a caller whether a token they guessed exists.
 */
function notFoundResponse() {
  return new Response(page("ההצעה אינה זמינה", "ייתכן שהקישור שגוי או שההצעה כבר אינה בתוקף."), {
    status: 404,
    headers: htmlHeaders,
  });
}

function errorResponse() {
  return new Response(page("אירעה שגיאה", "לא הצלחנו לטעון את ההצעה כרגע. נסו שוב בעוד רגע."), {
    status: 500,
    headers: htmlHeaders,
  });
}

function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — EZOrders</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;padding:24px">
  <div style="max-width:420px;text-align:center">
    <p style="font-size:24px;font-weight:800;color:#191D2A;margin:0 0 20px">EZ<span style="color:#F05D86">ORDERS</span></p>
    <h1 style="font-size:19px;color:#191D2A;margin:0 0 10px">${title}</h1>
    <p style="color:#5F6575;font-size:14px;margin:0">${body}</p>
  </div>
</body></html>`;
}
