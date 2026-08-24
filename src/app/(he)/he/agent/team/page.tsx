import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { TeamManager } from "@/components/agent/TeamManager";
import { requireAdminSession } from "@/lib/agent/session";
import { listTeam } from "@/lib/agent/team";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "צוות - ezorders",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const session = await requireAdminSession();
  const team = await listTeam();

  return (
    <AgentShell
      session={session}
      active="/he/agent/team"
      title="צוות"
      lead="הוספה, השבתה ואיפוס סיסמה לסוכנים"
    >
      <TeamManager team={team} currentAgentId={session.id} />
    </AgentShell>
  );
}
