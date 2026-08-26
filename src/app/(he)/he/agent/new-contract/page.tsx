import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { QuoteBuilder } from "@/components/agent/QuoteBuilder";
import { getCurrentTemplate } from "@/lib/agent/contracts";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הסכם ישיר - ezorders",
  robots: { index: false, follow: false },
};

/**
 * A contract with no proposal in front of it.
 *
 * The same builder as a quote, because it is the same question — which
 * components, how many, for whom. What differs is where it lands: a contract in
 * draft, ready to send for signature, and no proposal in the customer's inbox.
 *
 * The unapproved-terms check is made here as well as in the database. Finding
 * out that nobody has read the current terms after filling in a package is a
 * worse way to learn it than being told before starting.
 */
export default async function NewContractPage() {
  const session = await requireAgentSession();
  const [catalogue, template] = await Promise.all([loadAgentCatalogue(), getCurrentTemplate()]);
  const ready = Boolean(template?.is_approved);

  return (
    <AgentShell
      session={session}
      active="/he/agent/new-contract"
      title="הסכם ישיר"
      lead="לסגירה שנעשתה בטלפון — בונים את החבילה וההסכם יוצא לחתימה, בלי הצעת מחיר ללקוח"
    >
      {ready ? (
        <QuoteBuilder catalogue={catalogue} mode="contract" />
      ) : (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-amber-900">אין נוסח הסכם מאושר</h2>
          <p className="mt-1 text-sm text-amber-800">
            הגרסה הנוכחית של התנאים עדיין לא אושרה, ולכן אי אפשר להפיק ממנה הסכם. מנהל מערכת מאשר
            אותה במסך <span className="font-semibold">נוסח הסכם</span>.
          </p>
        </div>
      )}
    </AgentShell>
  );
}
