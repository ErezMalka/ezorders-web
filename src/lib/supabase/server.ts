import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * A Supabase client bound to the caller's session cookies.
 *
 * Every query made through this client runs as the signed-in agent, so the RLS
 * policies in supabase/migrations/0001_agent_portal.sql are what decide which
 * rows come back. Server code therefore does not need — and must not rely on —
 * its own "where agent_id = me" filtering.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * A client with no session at all: the anon key, no cookies, nothing read from
 * the request.
 *
 * That last part is the point. createSupabaseServerClient() reads cookies, and a
 * Next.js page that reads cookies cannot be statically rendered — so using it on
 * /he/price silently turned a cached marketing page into one that hits the
 * server on every visit. This client lets that page pre-render and revalidate on
 * a timer while still reading the live price list.
 *
 * It holds exactly the privileges anon holds, which after supabase/0004 is no
 * table access whatsoever — only the handful of functions granted by name.
 */
export function createSupabaseAnonClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A client that bypasses RLS. Server-only, and only for requests already
 * authorised another way — see supabaseServiceRoleKey().
 *
 * Never import this into a Client Component: the key must not reach the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
