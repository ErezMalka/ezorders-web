import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AgentSession {
  id: string;
  email: string;
  fullName: string;
  role: "agent" | "manager" | "admin";
  /** Sees every agent's quotes. True for managers and admins alike. */
  isManager: boolean;
  /** May also manage the team. Admins only. */
  isAdmin: boolean;
  /** An admin set this password; the portal blocks everything until it changes. */
  mustChangePassword: boolean;
}

/**
 * The signed-in agent, or null.
 *
 * Uses getUser() rather than getSession(): getSession reads the cookie and
 * trusts it, while getUser verifies the token with the auth server. On a route
 * that decides what a person is allowed to see, the verified answer is the only
 * one worth having.
 *
 * A user who authenticates but has no agents row -- or whose row is deactivated
 * -- is treated as signed out. Deactivating an agent is then a single flag, and
 * it takes effect on their next request.
 */
export async function getAgentSession(): Promise<AgentSession | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: agent } = await supabase
    .from("agents")
    .select("id, full_name, email, role, is_active, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!agent || !agent.is_active) return null;

  return {
    id: agent.id,
    email: agent.email ?? user.email ?? "",
    fullName: agent.full_name,
    role: agent.role,
    // An admin outranks a manager, so it must satisfy every manager check too.
    isManager: agent.role === "manager" || agent.role === "admin",
    isAdmin: agent.role === "admin",
    mustChangePassword: agent.must_change_password === true,
  };
}

/**
 * The signed-in agent, or a redirect.
 *
 * Also the choke point for the forced password change: an agent carrying a
 * password someone else chose is sent to change it and cannot reach any other
 * page until they have. Every protected page calls this, so there is no route
 * that quietly skips the check.
 */
export async function requireAgentSession(): Promise<AgentSession> {
  const session = await getAgentSession();
  if (!session) redirect("/he/agent/login");
  if (session.mustChangePassword) redirect("/he/agent/password");
  return session;
}

/** Like requireAgentSession, but without the password-change bounce. */
export async function requireAgentSessionRaw(): Promise<AgentSession> {
  const session = await getAgentSession();
  if (!session) redirect("/he/agent/login");
  return session;
}

/** The signed-in admin, or a redirect. Team management only. */
export async function requireAdminSession(): Promise<AgentSession> {
  const session = await requireAgentSession();
  if (!session.isAdmin) redirect("/he/agent");
  return session;
}
