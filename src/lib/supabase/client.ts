"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Browser-side Supabase client. Used only for the sign-in / sign-out calls,
 * which need to run where the session cookie can be written. Everything that
 * reads or writes a quote goes through the server, so the anon key never has to
 * be trusted with anything beyond authentication.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
