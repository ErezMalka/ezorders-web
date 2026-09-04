import { notFound } from "next/navigation";

import { quoteDocumentData, renderQuoteDocument } from "@/lib/agent/quote-document";
import { getQuote, getQuotePriceChanges } from "@/lib/agent/quotes";
import { getAgentSession } from "@/lib/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The printable quote.
 *
 * A route handler rather than a page, because the document is a complete HTML
 * document of its own — its own <html>, its own @page rules — and must not be
 * wrapped in the site layout. The agent prints from here (Ctrl+P → save as PDF)
 * and the PDF route renders this same markup headlessly, so the two can never
 * disagree.
 *
 * Served no-store: a quote can be edited, and a cached copy of an old price is
 * exactly the wrong thing to hand someone.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  // The list's base fee, when the agent changed it: the document prints it
  // beside the given one. Read from the trail, where it was recorded.
  const listBaseSetup =
    quote.base_setup_override !== null
      ? ([...(await getQuotePriceChanges(quote.id))].reverse().find((c) => c.field === "base_setup")?.list_value ?? null)
      : null;

  const html = renderQuoteDocument(quoteDocumentData(quote, session.email, listBaseSetup));

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
