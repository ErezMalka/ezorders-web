import "server-only";

import {
  DEFAULT_CATALOGUE,
  DEFAULT_TERM_MONTHS,
  DEFAULT_VALID_DAYS,
  DEFAULT_VAT_PERCENT,
  computeQuote,
  sanitizeOverrides,
  sanitizeState,
  selectedLines,
  type CalcState,
  type Catalogue,
  type ItemGroup,
  type PriceOverrides,
  type SelectedLine,
} from "@/lib/pricing";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Quote persistence.
 *
 * The client sends WHICH COMPONENTS were selected and, since 0026, may name a
 * price for any of them, for the base fee, and for the discount. Anything it
 * does not name is priced from the catalogue. The totals are still the
 * database's: recalc_quote sums the stored lines and applies the stored
 * overrides, so a figure the agent typed and a figure the list supplied are
 * both on the row, side by side, and nothing is silent. See 0026.
 */

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";

export interface QuoteCustomer {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

export interface CreateQuoteInput {
  customer: QuoteCustomer;
  /** The calculator selection, with any per-line prices. Sanitised before use. */
  calc: unknown;
  /** The base fee and discount the agent set by hand, if any. Sanitised before use. */
  overrides?: unknown;
  vatPercent?: number;
  termMonths?: number;
  validDays?: number;
  notes?: string;
}

export interface QuoteListRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  customer_name: string;
  customer_contact: string | null;
  setup_total: number;
  hardware_total: number;
  monthly_total: number;
  discount_percent: number;
  contract_value: number;
  term_months: number;
  valid_until: string;
  created_at: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  view_count: number;
  public_token: string;
  agent_id: string;
  agent_name: string;
  item_count: number;
  is_expired: boolean;
  price_overridden: boolean;
}

export interface QuoteItemRow {
  component_key: string;
  item_group: ItemGroup;
  label: string;
  note: string | null;
  image: string | null;
  quantity: number;
  setup_unit: number;
  monthly_unit: number;
  setup_total: number;
  monthly_total: number;
  is_discountable: boolean;
  sort_order: number;
  /** The list price on the day. Equal to setup_unit / monthly_unit unless the agent set a price. */
  list_setup_unit: number | null;
  list_monthly_unit: number | null;
  price_overridden: boolean;
}

/** One hand-set price, beside the list price it replaced. */
export interface QuotePriceChange {
  id: number;
  at: string;
  agent_id: string;
  field: "base_setup" | "discount_pct" | "setup_unit" | "monthly_unit";
  component_key: string | null;
  label: string | null;
  list_value: number | null;
  new_value: number;
}

export interface QuoteRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  agent_id: string;
  customer_name: string;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_tax_id: string | null;
  setup_total: number;
  hardware_total: number;
  monthly_eligible: number;
  discount_percent: number;
  discount_amount: number;
  monthly_non_eligible: number;
  monthly_total: number;
  vat_percent: number;
  term_months: number;
  valid_days: number;
  valid_until: string;
  notes: string | null;
  public_token: string;
  created_at: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  view_count: number;
  pdf_path: string | null;
  base_setup_override: number | null;
  discount_override_pct: number | null;
  price_overridden: boolean;
  price_alert_sent_at: string | null;
  /** 1 = the original document; 2 = with the equipment/setup/monthly summary. Frozen on acceptance. */
  layout_version: number;
}

export interface QuoteWithItems extends QuoteRow {
  items: QuoteItemRow[];
  agent_name: string;
}

// ── input validation ─────────────────────────────────────────
const MAX_TEXT = 200;
const MAX_NOTES = 2000;

function clean(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export class QuoteValidationError extends Error {}

/**
 * Normalise a create request. Throws QuoteValidationError on the one thing that
 * genuinely cannot be defaulted -- an unnamed customer or an empty package.
 */
export function normalizeCreateInput(
  input: CreateQuoteInput,
  catalogue: Catalogue = DEFAULT_CATALOGUE
): {
  customer: Required<Omit<QuoteCustomer, "contact" | "email" | "taxId">> & QuoteCustomer;
  calc: CalcState;
  overrides: PriceOverrides;
  vatPercent: number;
  termMonths: number;
  validDays: number;
  notes: string;
} {
  const name = clean(input.customer?.name);
  if (!name) throw new QuoteValidationError("שם הלקוח חסר");

  // A quote nobody can be called back about is a quote nobody follows up. The
  // email is optional because plenty of customers do not give one and the link
  // goes out on WhatsApp; the number is not.
  const phone = clean(input.customer?.phone, 40);
  if (!phone) throw new QuoteValidationError("טלפון הלקוח חסר");

  const calc = sanitizeState(input.calc, catalogue);
  const overrides = sanitizeOverrides(input.overrides);
  // A base fee typed back as the list's is not an override, same as for lines.
  if (overrides.baseSetup !== undefined && overrides.baseSetup === catalogue.baseSetup) {
    delete overrides.baseSetup;
  }
  const totals = computeQuote(calc, catalogue, overrides);
  if (!totals.hasAnyEnabled) {
    throw new QuoteValidationError("לא נבחרו רכיבים להצעה");
  }
  // Likewise a discount typed back as the tier it would have earned anyway.
  if (overrides.discountPct !== undefined && overrides.discountPct === totals.listDiscountPct) {
    delete overrides.discountPct;
  }

  return {
    customer: {
      name,
      phone,
      contact: clean(input.customer?.contact),
      email: clean(input.customer?.email),
      taxId: clean(input.customer?.taxId, 40),
    },
    calc,
    overrides,
    vatPercent: clampNumber(input.vatPercent, DEFAULT_VAT_PERCENT, 0, 100),
    termMonths: Math.round(clampNumber(input.termMonths, DEFAULT_TERM_MONTHS, 1, 120)),
    validDays: Math.round(clampNumber(input.validDays, DEFAULT_VALID_DAYS, 1, 365)),
    notes: clean(input.notes, MAX_NOTES),
  };
}

// ── writes ───────────────────────────────────────────────────
/** A quote_items row from a priced line. One place, so create and update cannot differ. */
function lineRow(quoteId: string, line: SelectedLine, index: number) {
  return {
    quote_id: quoteId,
    component_key: line.componentKey,
    item_group: line.group,
    label: line.label,
    note: line.note || null,
    image: line.image,
    quantity: line.qty,
    setup_unit: line.setupUnit,
    monthly_unit: line.monthlyUnit,
    setup_total: line.setupTotal,
    monthly_total: line.monthlyTotal,
    is_discountable: line.discountable,
    sort_order: index,
    list_setup_unit: line.listSetupUnit,
    list_monthly_unit: line.listMonthlyUnit,
    price_overridden: line.priceOverridden,
  };
}

/**
 * Write the trail for every figure the agent set by hand.
 *
 * Append-only and written on every save, so editing a draft three times
 * leaves three entries — which is the history a manager actually wants when
 * asking "how did this get to ₪200". Best-effort: a quote must not fail to
 * save because its audit row did, but the failure is logged loudly.
 */
async function recordPriceChanges(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  quoteId: string,
  agentId: string,
  lines: SelectedLine[],
  overrides: PriceOverrides,
  catalogue: Catalogue,
  listDiscountPct: number
): Promise<void> {
  const rows: Array<{
    quote_id: string; agent_id: string; field: string;
    component_key: string | null; label: string | null;
    list_value: number | null; new_value: number;
  }> = [];

  if (overrides.baseSetup !== undefined) {
    rows.push({
      quote_id: quoteId, agent_id: agentId, field: "base_setup",
      component_key: null, label: null,
      list_value: catalogue.baseSetup, new_value: overrides.baseSetup,
    });
  }
  if (overrides.discountPct !== undefined) {
    rows.push({
      quote_id: quoteId, agent_id: agentId, field: "discount_pct",
      component_key: null, label: null,
      list_value: listDiscountPct, new_value: overrides.discountPct,
    });
  }
  for (const line of lines) {
    if (line.setupUnit !== line.listSetupUnit) {
      rows.push({
        quote_id: quoteId, agent_id: agentId, field: "setup_unit",
        component_key: line.componentKey, label: line.label,
        list_value: line.listSetupUnit, new_value: line.setupUnit,
      });
    }
    if (line.monthlyUnit !== line.listMonthlyUnit) {
      rows.push({
        quote_id: quoteId, agent_id: agentId, field: "monthly_unit",
        component_key: line.componentKey, label: line.label,
        list_value: line.listMonthlyUnit, new_value: line.monthlyUnit,
      });
    }
  }
  if (rows.length === 0) return;

  const { error } = await supabase.from("quote_price_changes").insert(rows);
  if (error) console.error("[quotes] price audit rows were not written", { quoteId, error: error.message });
}

/**
 * Create a quote for the signed-in agent.
 *
 * Written in three steps -- header, lines, recalc -- because the totals are the
 * database's job. The header is inserted with zeroed money and recalc_quote()
 * fills it in from the lines that were actually stored.
 */
export async function createQuote(
  input: CreateQuoteInput,
  agentId: string,
  options: {
    /**
     * True when this quote exists only to carry a contract's package — never
     * sent, never listed. Passed as an argument rather than read from the body,
     * because a caller must not be able to hide their own quote from the
     * pipeline by adding a field to a POST. See 0024.
     */
    directContract?: boolean;
  } = {}
): Promise<QuoteRow> {
  // Priced from the catalogue an agent may actually sell, which is the database
  // with the shipped file behind it. It used to be priced from the file alone,
  // and the file carries no hardware at all — so a kiosk an agent ticked was
  // dropped on the way to the quote without anybody being told.
  const catalogue = await loadAgentCatalogue();
  const normalized = normalizeCreateInput(input, catalogue);
  const supabase = await createSupabaseServerClient();

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + normalized.validDays);

  const { data: quote, error: insertError } = await supabase
    .from("quotes")
    .insert({
      agent_id: agentId,
      customer_name: normalized.customer.name,
      customer_contact: normalized.customer.contact || null,
      customer_phone: normalized.customer.phone || null,
      customer_email: normalized.customer.email || null,
      customer_tax_id: normalized.customer.taxId || null,
      vat_percent: normalized.vatPercent,
      term_months: normalized.termMonths,
      valid_days: normalized.validDays,
      valid_until: validUntil.toISOString().slice(0, 10),
      notes: normalized.notes || null,
      direct_contract: options.directContract ?? false,
      base_setup_override: normalized.overrides.baseSetup ?? null,
      discount_override_pct: normalized.overrides.discountPct ?? null,
    })
    .select()
    .single();

  if (insertError || !quote) {
    throw new Error(`Could not create quote: ${insertError?.message ?? "no row returned"}`);
  }

  const lines = selectedLines(normalized.calc, catalogue);
  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(lines.map((line, index) => lineRow(quote.id, line, index)));

  if (itemsError) {
    // Leave nothing half-written: without lines the quote would price as empty.
    await supabase.from("quotes").delete().eq("id", quote.id);
    throw new Error(`Could not create quote lines: ${itemsError.message}`);
  }

  // The base setup fee comes from public.pricing_settings unless this quote
  // carries its own (base_setup_override, written above and audited below).
  // See supabase/migrations/0007 and 0026.
  const { error: recalcError } = await supabase.rpc("recalc_quote", {
    p_quote: quote.id,
  });
  if (recalcError) throw new Error(`Could not price quote: ${recalcError.message}`);

  const totals = computeQuote(normalized.calc, catalogue, normalized.overrides);
  await recordPriceChanges(
    supabase, quote.id, agentId, lines, normalized.overrides, catalogue, totals.listDiscountPct
  );

  await supabase.from("quote_events").insert({
    quote_id: quote.id,
    event_type: "created",
    actor_id: agentId,
    meta: totals.priceOverridden ? { price_overridden: true } : null,
  });

  const { data: priced } = await supabase.from("quotes").select("*").eq("id", quote.id).single();
  return (priced ?? quote) as QuoteRow;
}

/** Mark a quote as sent. Idempotent for a quote that has already gone out. */
export async function markQuoteSent(quoteId: string, channel: string, agentId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_channel: channel })
    .eq("id", quoteId)
    .eq("status", "draft");

  await supabase.from("quote_events").insert({
    quote_id: quoteId,
    event_type: "sent",
    actor_id: agentId,
    channel,
  });
}

/**
 * Rewrite a quote that has not gone out yet.
 *
 * Editing is a draft-only act. Once a quote has been sent, the document at
 * /q/<token> is what the customer is reading, and if they press the button its
 * SHA-256 is stored as the evidence of what they agreed to; changing the text
 * afterwards would leave a fingerprint that disagrees with it. A change after
 * that starts life as a duplicate instead — see duplicateQuote.
 *
 * The status guard is written three times on purpose: here, on the UPDATE
 * itself, and as a trigger in the database (0022). This function is not the
 * only thing holding a session that RLS lets write to these tables.
 */
export async function updateQuote(
  quoteId: string,
  input: CreateQuoteInput,
  agentId: string
): Promise<QuoteRow> {
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .maybeSingle();

  if (readError) throw new Error(`Could not load quote: ${readError.message}`);
  if (!existing) throw new QuoteValidationError("ההצעה לא נמצאה");
  if ((existing as { status: QuoteStatus }).status !== "draft") {
    throw new QuoteValidationError("אפשר לערוך רק טיוטה — שכפלו את ההצעה כדי לשנות אותה");
  }

  const catalogue = await loadAgentCatalogue();
  const normalized = normalizeCreateInput(input, catalogue);

  // Counted from today rather than from the day the draft was started: the
  // agent is editing it because they are about to send it now.
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + normalized.validDays);

  const { error: headerError } = await supabase
    .from("quotes")
    .update({
      customer_name: normalized.customer.name,
      customer_contact: normalized.customer.contact || null,
      customer_phone: normalized.customer.phone,
      customer_email: normalized.customer.email || null,
      customer_tax_id: normalized.customer.taxId || null,
      vat_percent: normalized.vatPercent,
      term_months: normalized.termMonths,
      valid_days: normalized.validDays,
      valid_until: validUntil.toISOString().slice(0, 10),
      notes: normalized.notes || null,
      base_setup_override: normalized.overrides.baseSetup ?? null,
      discount_override_pct: normalized.overrides.discountPct ?? null,
    })
    .eq("id", quoteId)
    .eq("status", "draft");

  if (headerError) throw new Error(`Could not update quote: ${headerError.message}`);

  // Lines are replaced rather than reconciled, because a line is not a thing
  // with an identity — it is what the package came to on the day it was priced.
  //
  // The window between the delete and the insert is the one place this function
  // can leave a draft worse than it found it: an empty package, priced as the
  // base fee alone. The alternative — an RPC that accepts prices and swaps them
  // atomically — would hand every caller of /rest/v1/rpc/ the ability to price
  // their own quote, which is the hole 0007 closed. A draft the agent can see
  // and fix is the cheaper failure.
  const { error: deleteError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  if (deleteError) throw new Error(`Could not clear quote lines: ${deleteError.message}`);

  const lines = selectedLines(normalized.calc, catalogue);
  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(lines.map((line, index) => lineRow(quoteId, line, index)));

  if (itemsError) {
    throw new Error(
      `Could not write quote lines, and the previous ones are gone: ${itemsError.message}`
    );
  }

  const { error: recalcError } = await supabase.rpc("recalc_quote", { p_quote: quoteId });
  if (recalcError) throw new Error(`Could not price quote: ${recalcError.message}`);

  const totals = computeQuote(normalized.calc, catalogue, normalized.overrides);
  await recordPriceChanges(
    supabase, quoteId, agentId, lines, normalized.overrides, catalogue, totals.listDiscountPct
  );

  await supabase.from("quote_events").insert({
    quote_id: quoteId,
    event_type: "updated",
    actor_id: agentId,
    meta: totals.priceOverridden ? { price_overridden: true } : null,
  });

  const { data: priced } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  return priced as QuoteRow;
}

/**
 * Copy a quote into a new draft.
 *
 * This is how a sent quote is changed: the original keeps its number, its link
 * and the words the customer read, and the new one starts as a draft with its
 * own number and its own link.
 *
 * The copy carries the SELECTION — which components, how many — and is priced
 * again from today's catalogue rather than inheriting frozen figures. A quote
 * is a promise about today's price list, and re-sending last quarter's numbers
 * under a new date is a promise nobody made. A component that has since been
 * retired cannot be sold, so it does not survive the copy; the caller is told
 * which ones went, because an agent must not discover it by reading the total.
 */
export async function duplicateQuote(
  quoteId: string,
  agentId: string
): Promise<{ quote: QuoteRow; dropped: string[] }> {
  const source = await getQuote(quoteId);
  if (!source) throw new QuoteValidationError("ההצעה לא נמצאה");

  // A price the agent set by hand travels with the copy: the point of
  // duplicating a sent quote is usually to change one thing, not to lose the
  // deal that was already agreed. List-priced lines are re-priced from today.
  const calc: CalcState = {};
  for (const item of source.items) {
    calc[item.component_key] = {
      enabled: true,
      qty: item.quantity,
      ...(item.price_overridden
        ? { setupUnit: Number(item.setup_unit), monthlyUnit: Number(item.monthly_unit) }
        : {}),
    };
  }
  const overrides: PriceOverrides = {};
  if (source.base_setup_override !== null) overrides.baseSetup = Number(source.base_setup_override);
  if (source.discount_override_pct !== null) overrides.discountPct = Number(source.discount_override_pct);

  const quote = await createQuote(
    {
      customer: {
        name: source.customer_name,
        contact: source.customer_contact ?? "",
        phone: source.customer_phone ?? "",
        email: source.customer_email ?? "",
        taxId: source.customer_tax_id ?? "",
      },
      calc,
      overrides,
      vatPercent: source.vat_percent,
      termMonths: source.term_months,
      validDays: source.valid_days,
      notes: source.notes ?? "",
    },
    agentId
  );

  const supabase = await createSupabaseServerClient();
  const { data: copiedItems } = await supabase
    .from("quote_items")
    .select("component_key")
    .eq("quote_id", quote.id);

  const kept = new Set((copiedItems ?? []).map((row) => (row as { component_key: string }).component_key));
  const dropped = source.items
    .filter((item) => !kept.has(item.component_key))
    .map((item) => item.label);

  await supabase.from("quote_events").insert([
    {
      quote_id: quote.id,
      event_type: "duplicated_from",
      actor_id: agentId,
      meta: { source_id: source.id, source_number: source.quote_number, dropped },
    },
    {
      quote_id: source.id,
      event_type: "duplicated_to",
      actor_id: agentId,
      meta: { new_id: quote.id, new_number: quote.quote_number },
    },
  ]);

  return { quote, dropped };
}

// ── reads ────────────────────────────────────────────────────
/**
 * The agent's quotes, newest first. RLS decides the scope: an agent sees their
 * own rows, a manager sees everyone's.
 */
export async function listQuotes(limit = 100): Promise<QuoteListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes_list")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load quotes: ${error.message}`);
  return (data ?? []) as QuoteListRow[];
}

/** Every hand-set price on a quote, oldest first. RLS scopes it like the quote. */
export async function getQuotePriceChanges(quoteId: string): Promise<QuotePriceChange[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_price_changes")
    .select("id, at, agent_id, field, component_key, label, list_value, new_value")
    .eq("quote_id", quoteId)
    .order("at")
    .order("id");
  if (error) throw new Error(`Could not load the price history: ${error.message}`);
  return (data ?? []) as QuotePriceChange[];
}

export async function getQuote(quoteId: string): Promise<QuoteWithItems | null> {
  const supabase = await createSupabaseServerClient();

  const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (error) throw new Error(`Could not load quote: ${error.message}`);
  if (!quote) return null;

  const [{ data: items }, { data: agent }] = await Promise.all([
    supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order"),
    supabase.from("agents").select("full_name").eq("id", quote.agent_id).maybeSingle(),
  ]);

  return {
    ...(quote as QuoteRow),
    items: (items ?? []) as QuoteItemRow[],
    agent_name: agent?.full_name ?? "",
  };
}
