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
export function quoteDocumentData(quote: QuoteWithItems, agentEmail?: string | null): QuoteDocumentData {
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
      quantity: Number(item.quantity),
      setup_total: Number(item.setup_total),
      monthly_total: Number(item.monthly_total),
    })),

    setupTotal: Number(quote.setup_total),
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
