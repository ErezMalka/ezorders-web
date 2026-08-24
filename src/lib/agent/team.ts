import "server-only";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Team management.
 *
 * Two systems have to move together for an agent to exist: Supabase Auth owns
 * the login, public.agents owns who they are. Creating one without the other
 * leaves an account that can sign in but is treated as signed out, or a name
 * with no way to reach it — so every function here does both, and unwinds the
 * first if the second fails.
 *
 * Reaching the Auth admin API needs the service-role key, which bypasses RLS.
 * That is why every function takes the caller's session and checks it FIRST:
 * once the admin client is in hand, the database is no longer protecting
 * anything, and this module is the only thing standing between a signed-in
 * agent and everyone else's account.
 */

export type AgentRole = "agent" | "manager" | "admin";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AgentRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  quote_count: number;
  last_quote_at: string | null;
}

export class TeamError extends Error {}

const MIN_PASSWORD_LENGTH = 10;

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function assertRole(value: unknown): AgentRole {
  if (value === "agent" || value === "manager" || value === "admin") return value;
  throw new TeamError("תפקיד לא חוקי");
}

/**
 * A password an admin types for someone else is going to be short-lived and
 * shared over something insecure, so the only real requirement is that it not
 * be guessable in the window before it is replaced.
 */
function assertPassword(value: unknown): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new TeamError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
  }
  return password;
}

/** The roster. RLS lets an admin or manager read every row. */
export async function listTeam(): Promise<TeamMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agents_list")
    .select("*")
    .order("is_active", { ascending: false })
    .order("full_name");

  if (error) throw new Error(`Could not load the team: ${error.message}`);
  return (data ?? []) as TeamMember[];
}

/**
 * Create a login and the agent row behind it.
 *
 * The account is created already confirmed: an admin adding a colleague has
 * verified them by other means, and an unconfirmed user cannot sign in, which
 * would make the feature look broken.
 */
export async function createAgent(input: {
  fullName: unknown;
  email: unknown;
  phone?: unknown;
  role?: unknown;
  password: unknown;
  invitedBy: string;
}): Promise<TeamMember> {
  const fullName = cleanText(input.fullName);
  const email = cleanText(input.email).toLowerCase();
  const phone = cleanText(input.phone, 40);
  const role = assertRole(input.role ?? "agent");
  const password = assertPassword(input.password);

  if (!fullName) throw new TeamError("שם הסוכן חסר");
  if (!isEmail(email)) throw new TeamError("כתובת אימייל לא תקינה");

  const admin = createSupabaseAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created?.user) {
    // Supabase reports a duplicate address as a generic failure; say the useful
    // thing instead of echoing it.
    if (authError?.message?.toLowerCase().includes("already")) {
      throw new TeamError("כתובת האימייל הזו כבר רשומה במערכת");
    }
    throw new TeamError(`יצירת המשתמש נכשלה: ${authError?.message ?? "unknown"}`);
  }

  const { error: rowError } = await admin.from("agents").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    phone: phone || null,
    role,
    is_active: true,
    must_change_password: true,
    invited_by: input.invitedBy,
  });

  if (rowError) {
    // Without the agents row the login exists but resolves to "signed out", and
    // the address is now taken so the admin cannot retry. Undo it.
    await admin.auth.admin.deleteUser(created.user.id);
    throw new TeamError(`יצירת הסוכן נכשלה: ${rowError.message}`);
  }

  const { data: row } = await admin.from("agents_list").select("*").eq("id", created.user.id).single();
  return row as TeamMember;
}

/** Activate or deactivate. Takes effect on the agent's next request. */
export async function setAgentActive(agentId: string, isActive: boolean): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("agents").update({ is_active: isActive }).eq("id", agentId);
  if (error) throw new TeamError(translateGuardRail(error.message));
}

export async function setAgentRole(agentId: string, role: unknown): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("agents").update({ role: assertRole(role) }).eq("id", agentId);
  if (error) throw new TeamError(translateGuardRail(error.message));
}

/**
 * Set someone else's password. Flags the account so the portal makes them
 * replace it before they can do anything else.
 */
export async function resetAgentPassword(agentId: string, password: unknown): Promise<void> {
  const newPassword = assertPassword(password);
  const admin = createSupabaseAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(agentId, { password: newPassword });
  if (authError) throw new TeamError(`איפוס הסיסמה נכשל: ${authError.message}`);

  const { error } = await admin.from("agents").update({ must_change_password: true }).eq("id", agentId);
  if (error) throw new TeamError(`איפוס הסיסמה נכשל: ${error.message}`);
}

/**
 * Clear the flag after the agent has chosen their own password. The password
 * change itself happens client-side against Auth, which is the only place that
 * can verify the current session owns the account.
 */
export async function clearMustChangePassword(agentId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("agents")
    .update({ must_change_password: false })
    .eq("id", agentId);
  if (error) throw new Error(`Could not clear the password flag: ${error.message}`);
}

/**
 * The last-admin trigger raises a Hebrew message already; anything else is a
 * database error the agent cannot act on, so it gets a generic one.
 */
function translateGuardRail(message: string): string {
  if (message.includes("המנהל האחרון")) return message;
  return "העדכון נכשל";
}
