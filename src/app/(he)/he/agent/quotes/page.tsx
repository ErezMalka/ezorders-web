import Link from "next/link";
import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { QuotesTable } from "@/components/agent/QuotesTable";
import { listQuotes } from "@/lib/agent/quotes";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ההצעות שלי - ezorders",
  robots: { index: false, follow: false },
};

export default async function AgentQuotesPage() {
  const session = await requireAgentSession();
  const quotes = await listQuotes();

  return (
    <AgentShell
      session={session}
      active="/he/agent/quotes"
      title="ההצעות שלי"
      lead={session.isManager ? "כל ההצעות במערכת, מכל הסוכנים" : "כל ההצעות שיצרת"}
      action={
        <Link
          href="/he/agent/new"
          className="rounded-pill bg-brand-pinkStrong px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkInk"
        >
          + הצעה חדשה
        </Link>
      }
    >
      <section className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
        <QuotesTable quotes={quotes} showAgent={session.isManager} />
      </section>
    </AgentShell>
  );
}
