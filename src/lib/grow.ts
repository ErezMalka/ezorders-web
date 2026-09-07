import "server-only";

/**
 * GROW (Meshulam) — the card processor.
 *
 * The "Light Server" API: two calls and a callback. createPaymentProcess turns
 * an amount and a payer into a hosted payment page; getPaymentProcessInfo says
 * what became of it; and once the customer pays, GROW POSTs a form to the
 * notifyUrl we gave it. The same integration runs the client platform's
 * billing (new-client → grow-payment-create / grow-approve-webhook), and the
 * shapes below are the ones seen there in production — including the two
 * error formats and the bracketed `data[...]` keys on the notification.
 *
 * Credentials never leave the server: GROW_USER_ID and GROW_PAGE_CODE are read
 * here and nowhere else. No card number is ever seen by this site.
 */

const API_PATH = "/api/light/server/1.0";
const LIVE_HOST = "https://secure.meshulam.co.il";

export class GrowError extends Error {
  constructor(message: string, readonly code: number | null = null, readonly raw: string | null = null) {
    super(message);
  }
}

export interface GrowConfig {
  userId: string;
  pageCode: string;
  apiBase: string;
}

/** Null when the integration is switched off — the callers degrade quietly. */
export function growConfig(): GrowConfig | null {
  const userId = (process.env.GROW_USER_ID ?? "").trim();
  const pageCode = (process.env.GROW_PAGE_CODE ?? "").trim();
  if (!userId || !pageCode) return null;

  let base = (process.env.GROW_BASE_URL ?? "").trim() || LIVE_HOST;
  if (!/^https?:\/\//.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, "");
  if (!base.includes("/api/light/server")) base += API_PATH;

  return { userId, pageCode, apiBase: base };
}

export function growEnabled(): boolean {
  return growConfig() !== null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * GROW refuses a single-word name (error 717). The contact name on a contract
 * is often one word, and a business name is what the customer actually typed,
 * so: two words minimum, three at most, and a harmless filler otherwise.
 */
export function growFullName(...candidates: Array<string | null | undefined>): string {
  for (const raw of candidates) {
    const parts = String(raw ?? "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 3).join(" ");
    if (parts.length === 1) return `${parts[0]} EZOrders`;
  }
  return "לקוח EZOrders";
}

/** An Israeli number as 0XXXXXXXXX, or null when nothing usable was given. */
export function growPhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let out = digits;
  if (digits.startsWith("972") && digits.length >= 12) out = `0${digits.slice(3)}`;
  return out.length >= 9 && out.length <= 10 && out.startsWith("0") ? out : null;
}

/**
 * GROW answers in two shapes. Success is { data: {...}, err: 0 }. A failure is
 * { err: NNN, description } — or, for a rejected parameter,
 * { status: 0, err: { id, message }, data: "" }. Both are read here.
 */
function parseGrowResponse(rawText: string): Record<string, unknown> {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new GrowError("GROW החזיר תשובה שאינה JSON", null, rawText.slice(0, 500));
  }

  const rawErr = json["err"] ?? json["error"];
  const errObj = rawErr && typeof rawErr === "object" ? (rawErr as Record<string, unknown>) : null;
  const code = errObj ? Number(errObj["id"] ?? -1) : Number(rawErr ?? -1);

  if (code !== 0) {
    const desc = String(
      errObj?.["message"] ?? json["description"] ?? json["errorDescription"] ?? "GROW error"
    );
    throw new GrowError(desc, Number.isFinite(code) ? code : null, rawText.slice(0, 500));
  }

  return (json["data"] as Record<string, unknown> | undefined) ?? json;
}

async function post(config: GrowConfig, method: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ userId: config.userId, pageCode: config.pageCode, ...params });

  let response: Response;
  try {
    response = await fetch(`${config.apiBase}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (error) {
    throw new GrowError(`לא ניתן להגיע ל-GROW: ${String(error)}`);
  }

  const text = await response.text();
  if (!response.ok) throw new GrowError(`GROW השיב ${response.status}`, response.status, text.slice(0, 500));
  return parseGrowResponse(text);
}

// ── createPaymentProcess ─────────────────────────────────────────────────────

export interface CreatePaymentInput {
  /** Shekels, VAT included. Two decimals at most. */
  amount: number;
  fullName: string;
  phone: string;
  email?: string | null;
  /** What the customer sees on the page and the receipt. */
  description: string;
  maxInstallments: number;
  successUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  /** Echoed back on the notification, so it can be matched without trusting the URL. */
  reference: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  processId: string | null;
  processToken: string | null;
}

export async function createPaymentProcess(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const config = growConfig();
  if (!config) throw new GrowError("GROW אינו מוגדר (GROW_USER_ID / GROW_PAGE_CODE)");

  const sum = Math.round(input.amount * 100) / 100;
  if (!(sum > 0)) throw new GrowError("הסכום חייב להיות גדול מאפס");

  const data = await post(config, "createPaymentProcess", {
    sum: String(sum),
    description: input.description.slice(0, 250),
    "pageField[fullName]": input.fullName,
    "pageField[phone]": input.phone,
    ...(input.email ? { "pageField[email]": input.email } : {}),
    maxPaymentNum: String(Math.max(1, Math.min(36, Math.floor(input.maxInstallments)))),
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    notifyUrl: input.notifyUrl,
    cField1: input.reference,
  });

  const paymentUrl = String(data["url"] ?? data["paymentUrl"] ?? "").trim();
  if (!paymentUrl) throw new GrowError("GROW לא החזיר כתובת לדף תשלום", null, JSON.stringify(data).slice(0, 500));

  return {
    paymentUrl,
    processId: String(data["processId"] ?? "").trim() || null,
    processToken: String(data["processToken"] ?? "").trim() || null,
  };
}

// ── getPaymentProcessInfo ────────────────────────────────────────────────────

export type GrowOutcome = "paid" | "pending" | "cancelled";

export interface PaymentInfo {
  outcome: GrowOutcome;
  statusText: string;
  transactionId: string | null;
  transactionToken: string | null;
  sum: number | null;
  raw: Record<string, unknown>;
}

/**
 * The outcome sits in data.transactions[0], in GROW's own words: statusCode "2"
 * with "שולם" for a payment that went through, "0" / "לא שולם" for one that
 * has not, and "בוטל" for one the customer abandoned.
 */
export async function getPaymentProcessInfo(processId: string, processToken: string): Promise<PaymentInfo> {
  const config = growConfig();
  if (!config) throw new GrowError("GROW אינו מוגדר (GROW_USER_ID / GROW_PAGE_CODE)");

  const data = await post(config, "getPaymentProcessInfo", { processId, processToken });
  const txs = Array.isArray(data["transactions"]) ? (data["transactions"] as Record<string, unknown>[]) : [];
  const tx = txs[0] ?? {};

  const statusCode = String(tx["statusCode"] ?? "").trim();
  const statusText = String(tx["status"] ?? data["status"] ?? "").trim();

  let outcome: GrowOutcome = "pending";
  if (statusCode === "2" || (statusText.includes("שולם") && !statusText.includes("לא שולם"))) outcome = "paid";
  else if (statusText.includes("בוטל")) outcome = "cancelled";

  const sumRaw = Number(tx["sum"] ?? data["sum"]);

  return {
    outcome,
    statusText: statusText || statusCode || "pending",
    transactionId: String(tx["transactionId"] ?? "").trim() || null,
    transactionToken: String(tx["transactionToken"] ?? "").trim() || null,
    sum: Number.isFinite(sumRaw) ? sumRaw : null,
    raw: data,
  };
}

// ── the notification ─────────────────────────────────────────────────────────

export interface GrowNotification {
  paid: boolean;
  statusCode: string;
  statusText: string;
  transactionId: string | null;
  transactionToken: string | null;
  processId: string | null;
  sum: number | null;
  reference: string | null;
  fields: Record<string, string>;
}

/**
 * GROW posts a form whose interesting keys are bracketed — data[statusCode],
 * data[transactionId] — with a few flat ones beside them. Flattened here, the
 * bracketed keys winning. Nothing in it is trusted on its own: the caller
 * confirms the outcome with getPaymentProcessInfo before recording a payment.
 */
export function parseGrowNotification(raw: Record<string, string>): GrowNotification {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (!/^data\[/.test(k)) fields[k] = v;
  for (const [k, v] of Object.entries(raw)) {
    const m = k.match(/^data\[([^\]]+)\]$/);
    if (m) fields[m[1]!] = v;
  }

  const statusCode = (fields["statusCode"] ?? "").trim();
  const statusText = (fields["status"] ?? "").trim();
  const sumRaw = Number(fields["sum"]);

  return {
    paid: statusCode === "2" || (statusText.includes("שולם") && !statusText.includes("לא שולם")),
    statusCode,
    statusText,
    transactionId: (fields["transactionId"] ?? "").trim() || null,
    transactionToken: (fields["transactionToken"] ?? "").trim() || null,
    processId: (fields["processId"] ?? "").trim() || null,
    sum: Number.isFinite(sumRaw) ? sumRaw : null,
    reference: (fields["cField1"] ?? "").trim() || null,
    fields,
  };
}
