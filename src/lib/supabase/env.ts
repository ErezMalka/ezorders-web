/**
 * Supabase configuration, read lazily.
 *
 * These are read inside functions rather than at module scope on purpose: the
 * marketing pages are statically generated at build time, and a module-level
 * throw would fail `next build` on any machine that has not been given the
 * portal's environment variables. The portal routes are dynamic, so they read
 * these per request and fail loudly there instead — where the person who can
 * fix it will actually see the message.
 */

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return value;
}

/**
 * Server-only. Bypasses RLS, so it is used exclusively where the request has
 * already been authorised by other means: the customer-facing quote link, which
 * is authorised by an unguessable token, and the send/PDF routes, which check
 * the agent's session first.
 */
export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return value;
}

/** True when the portal has enough configuration to run. */
export function isPortalConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
