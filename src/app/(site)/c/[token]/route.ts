import { createHash } from "node:crypto";

import {
  renderContractDocument,
  type ContractDocumentData,
  type ContractEvent,
  type ContractLine,
  type ContractSection,
} from "@/lib/agent/contract-html";
import {
  renderCancelledPanel,
  renderSignPanel,
  renderSignedPanel,
} from "@/lib/agent/contract-sign-html";
import { sendSignedContractCopy } from "@/lib/agent/contract-email";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The customer's contract, by token.
 *
 * A route handler rather than a page, for the same reason the quote is one: the
 * bytes this returns are the bytes that get hashed, and a React tree rendered
 * and then hydrated has no single canonical serialisation.
 *
 * The signing panel is appended after the document and is never part of the
 * hash — it carries an error banner sometimes, and a document whose fingerprint
 * changed because the customer mistyped their name would be useless.
 */

interface PublicContract {
  contract_number: string;
  status: "sent" | "viewed" | "signed" | "cancelled";
  created_at: string;
  signed_at: string | null;
  customer_name: string;
  customer_tax_id: string | null;
  customer_address: string | null;
  business_phone: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  customer_email: string | null;
  pos_company: string | null;
  term_months: number;
  notes: string | null;
  signer_name: string | null;
  signer_id_number: string | null;
  signer_role: string | null;
  signature_png: string | null;
  document_hash: string | null;
  agent_name: string | null;
  agent_email: string | null;
  template_version: number;
  template_title: string;
  sections: ContractSection[];
  quote_number: string | null;
  setup_total: string | number;
  hardware_total: string | number | null;
  monthly_total: string | number;
  vat_percent: string | number;
  items: Array<{
    label: string;
    note: string | null;
    agent_note: string | null;
    item_group: ContractLine["item_group"];
    quantity: string | number;
    setup_total: string | number;
    monthly_total: string | number;
  }>;
  events: ContractEvent[];
}

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  // A contract is not a page to be cached by anything between us and the
  // customer, and certainly not indexed.
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isTokenShaped(token)) return notFoundResponse();

  const contract = await loadContract(request, token, true);
  if (contract === "error") return errorResponse();
  if (!contract) return notFoundResponse();

  const errorCode = new URL(request.url).searchParams.get("e");
  return new Response(renderPage(contract, token, errorCode), { headers: htmlHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isTokenShaped(token)) return notFoundResponse();

  // Nothing below is allowed to reach the customer as a blank 500. A page that
  // says "HTTP ERROR 500" after someone has drawn their signature tells them
  // nothing, and tells us nothing either.
  try {
    return await sign(request, token);
  } catch (error) {
    console.error("[c/token] sign threw", error);
    return redirectBack(request, token, "unexpected");
  }
}

async function sign(request: Request, token: string): Promise<Response> {
  /**
   * Read the posted fields.
   *
   * The panel posts a plain urlencoded form, so the body is parsed as text
   * rather than through formData(). It is the most primitive reader there is,
   * it cannot be defeated by a multipart edge case, and this is not a place
   * that can afford a parser having an opinion — a customer has already drawn
   * their signature by the time this runs.
   */
  let form: URLSearchParams;
  try {
    form = await readForm(request);
  } catch (error) {
    console.error("[c/token] could not read the posted form", error);
    return redirectBack(request, token, "body_unreadable");
  }

  if (form.get("consent") !== "1") return redirectBack(request, token, "consent_required");

  const signature = form.get("signature") ?? "";
  if (!signature.startsWith("data:image/png;base64,") || signature.length < 200) {
    return redirectBack(request, token, "signature_required");
  }
  // A pad that fits on a phone produces tens of kilobytes. Anything far past
  // that is not a signature, and there is no reason to hand it to the database.
  if (signature.length > 400_000) return redirectBack(request, token, "signature_required");

  // Read without counting a view: the customer is signing, not browsing, and
  // this read exists so the document can be hashed.
  const contract = await loadContract(request, token, false);
  if (contract === "error") return errorResponse();
  if (!contract) return notFoundResponse();
  if (contract.status === "cancelled") return redirectBack(request, token, "cancelled");

  // The terms as they were shown, with no signature and no annex — the one
  // rendering that can be reproduced from stored fields years from now.
  const documentHash = createHash("sha256")
    .update(renderDocument(contract, { signed: false }), "utf8")
    .digest("hex");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("contract_sign_by_token", {
    p_token: token,
    p_signer: field(form, "signer_name", 120) ?? "",
    p_id_number: field(form, "signer_id", 40) ?? "",
    p_role: field(form, "signer_role", 80) ?? "",
    p_signature: signature,
    p_hash: documentHash,
    p_ip: clientIp(request),
    p_ua: request.headers.get("user-agent")?.slice(0, 400) ?? null,
  });

  if (error) {
    console.error("[c/token] sign failed", error);
    return redirectBack(request, token, "failed");
  }

  const result = (data ?? {}) as { ok?: boolean; code?: string };
  if (result.ok !== true) return redirectBack(request, token, result.code ?? "failed");

  // Only on the transition. Signing is idempotent, and a customer who refreshes
  // should not send themselves a second copy.
  if (result.code === "signed") {
    await mailSignedCopy(request, token);
  }

  return redirectBack(request, token, null);
}

/**
 * Send both parties their copy.
 *
 * Everything in here is best-effort. The signature is already recorded and the
 * customer is already on their way to the confirmation; a provider having a bad
 * afternoon must not turn that into a page saying the signing failed. Failures
 * are logged, and signed_email_sent_at stays null so an unsent copy is visible
 * rather than assumed.
 */
async function mailSignedCopy(request: Request, token: string): Promise<void> {
  try {
    // Re-read without counting a view: this is the signed state, and the
    // document it renders is the one that gets attached.
    const signed = await loadContract(request, token, false);
    if (signed === "error" || !signed || signed.status !== "signed") return;

    const sent = await sendSignedContractCopy({
      contractNumber: signed.contract_number,
      customerName: signed.customer_name,
      customerEmail: signed.customer_email,
      contactName: signed.contact_name,
      agentName: signed.agent_name,
      agentEmail: signed.agent_email,
      signerName: signed.signer_name,
      signedAt: signed.signed_at ? new Date(signed.signed_at) : new Date(),
      documentHash: signed.document_hash ?? "",
      setupTotal: Number(signed.setup_total),
      hardwareTotal: Number(signed.hardware_total ?? 0),
      monthlyTotal: Number(signed.monthly_total),
      termMonths: Number(signed.term_months),
      documentHtml: renderDocument(signed, { signed: true }),
      url: new URL(`/c/${token}`, request.url).toString(),
    });

    if (!sent) return;

    const supabase = createSupabaseAdminClient();
    await supabase
      .from("contracts")
      .update({ signed_email_sent_at: new Date().toISOString() })
      .eq("public_token", token);
  } catch (error) {
    console.error("[c/token] sending the signed copy failed", error);
  }
}

// ── helpers ──────────────────────────────────────────────────
/** The token is hex from gen_random_bytes(24); anything else is a probe. */
function isTokenShaped(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token);
}

async function loadContract(
  request: Request,
  token: string,
  recordView: boolean
): Promise<PublicContract | null | "error"> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("contract_by_token", {
    p_token: token,
    p_ip: clientIp(request),
    p_ua: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    p_record: recordView,
  });

  if (error) {
    console.error("[c/token] lookup failed", error);
    return "error";
  }
  return (data as PublicContract | null) ?? null;
}

function field(form: URLSearchParams, name: string, max: number): string | null {
  const raw = form.get(name);
  if (raw === null) return null;
  const value = raw.trim().slice(0, max);
  return value.length > 0 ? value : null;
}

/** The posted fields, however the browser chose to encode them. */
async function readForm(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") params.append(key, value);
    }
    return params;
  }
  return new URLSearchParams(await request.text());
}

/**
 * The first address in X-Forwarded-For. Whatever the proxy reported is what we
 * record; the database stores null rather than guessing when it is not shaped
 * like an address, and never fails the signature over it.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64) || null;
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

/*
 * There is no same-origin check here, and that is deliberate.
 *
 * There was one. It compared the browser's Origin header with the host in
 * request.url, then with every name we could think of that this deployment
 * answers to, and it went on refusing real signatures from the real domain —
 * because behind a proxy those strings are not the same string, and the list of
 * ways they can differ is not one we get to finish.
 *
 * What it was protecting is the question. Posting here requires the 48-hex
 * token from gen_random_bytes(24), which is sent to one customer and appears in
 * no page we serve to anybody else. An attacker who has it can simply open the
 * link and sign; one who does not cannot forge this request from any origin.
 * The check guarded nothing the token was not already guarding, and it cost the
 * one screen where the whole product is trust.
 *
 * The token is the boundary. The database re-checks the contract's state, and
 * the evidence annex records the address every signature actually came from.
 */

/**
 * See the customer back to their own contract.
 *
 * Deliberately a hand-built response rather than Response.redirect(): that
 * helper returns a response whose headers are immutable, and the framework adds
 * its own headers on the way out. The result was an exception thrown after the
 * handler had already returned — no signature written, no log the customer
 * could see, and a blank "HTTP ERROR 500" on the one screen where trust is the
 * entire product.
 */
function redirectBack(request: Request, token: string, errorCode: string | null) {
  const url = new URL(`/c/${token}`, request.url);
  if (errorCode) url.searchParams.set("e", errorCode);
  else url.hash = "sign";
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString(), "Cache-Control": "no-store, max-age=0" },
  });
}

function toDocument(c: PublicContract, opts: { signed: boolean }): ContractDocumentData {
  return {
    contractNumber: c.contract_number,
    issuedAt: new Date(c.created_at),
    templateVersion: c.template_version,
    templateTitle: c.template_title,
    sections: c.sections ?? [],

    customerName: c.customer_name,
    customerTaxId: c.customer_tax_id,
    customerAddress: c.customer_address,
    businessPhone: c.business_phone,
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    customerEmail: c.customer_email,
    posCompany: c.pos_company,
    termMonths: Number(c.term_months),
    notes: c.notes,

    quoteNumber: c.quote_number,
    agentName: c.agent_name,
    items: (c.items ?? []).map((i) => ({
      label: i.label,
      note: i.note,
      agent_note: i.agent_note,
      item_group: i.item_group,
      quantity: Number(i.quantity),
      setup_total: Number(i.setup_total),
      monthly_total: Number(i.monthly_total),
    })),
    setupTotal: Number(c.setup_total),
    hardwareTotal: Number(c.hardware_total ?? 0),
    monthlyTotal: Number(c.monthly_total),
    vatPercent: Number(c.vat_percent),

    ...(opts.signed
      ? {
          signerName: c.signer_name,
          signerIdNumber: c.signer_id_number,
          signerRole: c.signer_role,
          signaturePng: c.signature_png,
          signedAt: c.signed_at ? new Date(c.signed_at) : null,
          documentHash: c.document_hash,
          events: c.events ?? [],
        }
      : {}),
  };
}

function renderDocument(c: PublicContract, opts: { signed: boolean }): string {
  return renderContractDocument(toDocument(c, opts));
}

function renderPage(c: PublicContract, token: string, errorCode: string | null): string {
  const signed = c.status === "signed";
  const document = renderDocument(c, { signed });

  const panel = signed
    ? renderSignedPanel(c.contract_number)
    : c.status === "cancelled"
      ? renderCancelledPanel()
      : renderSignPanel(
          token,
          { name: c.contact_name, taxId: c.customer_tax_id },
          errorCode
        );

  return document.replace("</body>", `<div id="sign"></div>${panel}\n</body>`);
}

function notFoundResponse() {
  return new Response(
    `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
     <title>הסכם לא נמצא</title></head><body style="font-family:Arial,sans-serif;padding:48px;text-align:center">
     <h1 style="font-size:20px">ההסכם לא נמצא</h1>
     <p style="color:#5F6575">ייתכן שהקישור שגוי או שההסכם הוסר. פנו לסוכן שלכם.</p>
     </body></html>`,
    { status: 404, headers: htmlHeaders }
  );
}

function errorResponse() {
  return new Response(
    `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
     <title>תקלה</title></head><body style="font-family:Arial,sans-serif;padding:48px;text-align:center">
     <h1 style="font-size:20px">אירעה תקלה</h1>
     <p style="color:#5F6575">נסו לרענן בעוד רגע.</p>
     </body></html>`,
    { status: 500, headers: htmlHeaders }
  );
}
