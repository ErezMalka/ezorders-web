import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AgentShell } from "@/components/agent/AgentShell";
import { QuoteBuilder, type QuoteDraft } from "@/components/agent/QuoteBuilder";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { getQuote } from "@/lib/agent/quotes";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "עריכת הצעה - ezorders",
  robots: { index: false, follow: false },
};

/**
 * Reopen a draft in the same builder that made it.
 *
 * A quote that has been sent does not come here: it is redirected back to
 * itself, where the only offer is to duplicate. The check is a courtesy to the
 * agent rather than the thing that protects the document — the API refuses it
 * too, and so does a trigger in the database.
 *
 * Only the SELECTION is handed to the builder, never the frozen prices. The
 * form reprices from today's catalogue as the agent works, which is the whole
 * reason a draft is worth editing rather than re-typing.
 */
export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAgentSession();
  const { id } = await params;

  const quote = await getQuote(id);
  if (!quote) notFound();
  if (quote.status !== "draft") redirect(`/he/agent/quotes/${id}`);

  const catalogue = await loadAgentCatalogue();

  const draft: QuoteDraft = {
    id: quote.id,
    customer: {
      name: quote.customer_name,
      contact: quote.customer_contact ?? "",
      phone: quote.customer_phone ?? "",
      email: quote.customer_email ?? "",
      taxId: quote.customer_tax_id ?? "",
    },
    selection: Object.fromEntries(quote.items.map((item) => [item.component_key, item.quantity])),
    validDays: quote.valid_days,
    notes: quote.notes ?? "",
  };

  return (
    <AgentShell
      session={session}
      active="/he/agent/quotes"
      title={`עריכת ${quote.quote_number}`}
      lead="הצעה בטיוטה — אפשר לשנות הכול. אחרי שליחה אפשר יהיה רק לשכפל."
    >
      <QuoteBuilder catalogue={catalogue} draft={draft} />
    </AgentShell>
  );
}
