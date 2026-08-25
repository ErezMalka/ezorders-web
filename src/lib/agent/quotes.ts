import "server-only";

import {
  DEFAULT_TERM_MONTHS,
  DEFAULT_VALID_DAYS,
  DEFAULT_VAT_PERCENT,
  computeQuote,
  sanitizeState,
  selectedLines,
  type CalcState,
  type ItemGroup,
} from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Quote persistence.
 *
 * The shape of the contract with the browser is deliberately narrow: the client
 * sends WHICH COMPONENTS were selected, never what they cost. Prices are looked
 * up here from PRICING_CONFIG and the totals are recomputed by the database, so
 * the worst a tampered request can do is order a different package -- not the
 * same package for less.
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
  /** The calculator selection. Sanitised before use. */
  calc: unknown;
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
export function normalizeCreateInput(input: CreateQuoteInput): {
  customer: Required<Omit<QuoteCustomer, "contact" | "phone" | "email" | "taxId">> & QuoteCustomer;
  calc: CalcState;
  vatPercent: number;
  termMonths: number;
  validDays: number;
  notes: string;
} {
  const name = clean(input.customer?.name);
  if (!name) throw new QuoteValidationError("שם הלקוח חסר");

  const calc = sanitizeState(input.calc);
  if (!computeQuote(calc).hasAnyEnabled) {
    throw new QuoteValidationError("לא נבחרו רכיבים להצעה");
  }

  return {
    customer: {
      name,
      contact: clean(input.customer?.contact),
      phone: clean(input.customer?.phone, 40),
      email: clean(input.customer?.email),
      taxId: clean(input.customer?.taxId, 40),
    },
    calc,
    vatPercent: clampNumber(input.vatPercent, DEFAULT_VAT_PERCENT, 0, 100),
    termMonths: Math.round(clampNumber(input.termMonths, DEFAULT_TERM_MONTHS, 1, 120)),
    validDays: Math.round(clampNumber(input.validDays, DEFAULT_VALID_DAYS, 1, 365)),
    notes: clean(input.notes, MAX_NOTES),
  };
}

// ── writes ───────────────────────────────────────────────────
/**
 * Create a quote for the signed-in agent.
 *
 * Written in three steps -- header, lines, recalc -- because the totals are the
 * database's job. The header is inserted with zeroed money and recalc_quote()
 * fills it in from the lines that were actually stored.
 */
export async function createQuote(input: CreateQuoteInput, agentId: string): Promise<QuoteRow> {
  const normalized = normalizeCreateInput(input);
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
    })
    .select()
    .single();

  if (insertError || !quote) {
    throw new Error(`Could not create quote: ${insertError?.message ?? "no row returned"}`);
  }

  const lines = selectedLines(normalized.calc);
  const { error: itemsError } = await supabase.from("quote_items").insert(
    lines.map((line, index) => ({
      quote_id: quote.id,
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
    }))
  );

  if (itemsError) {
    // Leave nothing half-written: without lines the quote would price as empty.
    await supabase.from("quotes").delete().eq("id", quote.id);
    throw new Error(`Could not create quote lines: ${itemsError.message}`);
  }

  // The base setup fee is deliberately not passed. It used to be an argument,
  // which meant a caller reaching the RPC directly could set it to zero and
  // reprice their own quote; it now lives in public.pricing_settings, where only
  // the service role can change it. See supabase/migrations/0007.
  const { error: recalcError } = await supabase.rpc("recalc_quote", {
    p_quote: quote.id,
  });
  if (recalcError) throw new Error(`Could not price quote: ${recalcError.message}`);

  await supabase.from("quote_events").insert({
    quote_id: quote.id,
    event_type: "created",
    actor_id: agentId,
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
