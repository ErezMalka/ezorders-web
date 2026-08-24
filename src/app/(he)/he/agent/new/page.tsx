import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { QuoteBuilder } from "@/components/agent/QuoteBuilder";
import { loadAgentCatalogue } from "@/lib/agent/products";
import { requireAgentSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הצעה חדשה - ezorders",
  robots: { index: false, follow: false },
};

export default async function NewQuotePage() {
  const session = await requireAgentSession();

  // Read on the server and handed down, so the browser never decides what a
  // component costs — it only says which ones were ticked.
  const catalogue = await loadAgentCatalogue();

  return (
    <AgentShell
      session={session}
      active="/he/agent/new"
      title="הצעה חדשה"
      lead="סמנו את הרכיבים — ההנחה החודשית מתעדכנת אוטומטית, עד 40%"
    >
      <QuoteBuilder catalogue={catalogue} />
    </AgentShell>
  );
}
