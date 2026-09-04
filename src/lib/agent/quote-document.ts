import "server-only";

import { renderQuoteDocument, type QuoteDocumentData } from "./quote-html";
import type { QuoteWithItems } from "./quotes";

/**
 * Adapt a stored quote into the document model.
 *
 * Postgres numerics arrive as strings over the wire, so every money field is
 * coerced here rather than at each use site — a stray string would silently
 * concatenate instead of adding and put a nonsense total on a customer's PDF.
 */
/**
 * The base fee a quote was priced with.
 *
 * setup_total is base + every software line's setup (recalc_quote, 0008), so
 * the base is what is left after the lines are taken back out. Never below
 * zero, which can only happen to a row somebody edited by hand.
 */
export function baseSetupOf(
  setupTotal: number,
  items: ReadonlyArray<{ item_group: string; setup_total: number }>
): number {
  const lines = items
    .filter((i) => i.item_group !== "hardware")
    .reduce((acc, i) => acc + i.setup_total, 0);
  return Math.max(0, setupTotal - lines);
}

export function quoteDocumentData(
  quote: QuoteWithItems,
  agentEmail?: string | null,
  /** What the list said for the base fee, when the agent changed it (from the audit trail). */
  listBaseSetup?: number | null
): QuoteDocumentData {
  return {
    quoteNumber: quote.quote_number,
    issuedAt: new Date(quote.created_at),
    validUntil: new Date(quote.valid_until),

    customerName: quote.customer_name,
    customerContact: quote.customer_contact,
    customerPhone: quote.customer_phone,
    customerEmail: quote.customer_email,
    customerTaxId: quote.customer_tax_id,

    agentName: quote.agent_name,
    agentEmail: agentEmail ?? null,

    items: quote.items.map((item) => ({
      label: item.label,
      note: item.note,
      item_group: item.item_group,
      image: item.image,
      quantity: Number(item.quantity),
      setup_unit: Number(item.setup_unit),
      setup_total: Number(item.setup_total),
      monthly_total: Number(item.monthly_total),
      ...(item.list_setup_unit != null ? { list_setup_unit: Number(item.list_setup_unit) } : {}),
      ...(item.list_monthly_unit != null ? { list_monthly_unit: Number(item.list_monthly_unit) } : {}),
    })),
    layoutVersion: Number(quote.layout_version ?? 1),
    ...(listBaseSetup != null ? { listBaseSetup: Number(listBaseSetup) } : {}),

    // Derived from the quote's own figures, so an agent's base fee — or a list
    // price that has since moved — prints as it was on the day.
    baseSetup: baseSetupOf(
      Number(quote.setup_total),
      quote.items.map((i) => ({ item_group: i.item_group, setup_total: Number(i.setup_total) }))
    ),
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
  };
}

export { renderQuoteDocument };
