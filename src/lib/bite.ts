import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The operational system — a separate Supabase project — reached with its own
 * service key. Server-only, and only from the תן ביס delivery in
 * lib/agent/tenbis.ts.
 *
 * Shaped exactly like lib/crm.ts, deliberately: two ways of reaching two other
 * projects would be two places to get the "off when unset" wrong. Unset means
 * the delivery button is not offered and everything else in the feature still
 * works — an integration whose credentials are captured, proven and attached to
 * its order is already worth having, even if the last hop is still a person
 * typing them in.
 *
 * The key bypasses that project's row security, which is why nothing here takes
 * a table or an id from a request: the one caller writes one row, keyed by a
 * branch id a person confirmed.
 */

export function biteConfig(): { url: string; key: string } | null {
  const url = (process.env.BITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.BITE_SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) return null;
  return { url, key };
}

export function biteEnabled(): boolean {
  return biteConfig() !== null;
}

export function createBiteClient(): SupabaseClient {
  const config = biteConfig();
  if (!config) {
    throw new Error("Bite is not configured (BITE_SUPABASE_URL / BITE_SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Where a branch's תן ביס credentials live over there.
 *
 * `tenbis_branch_config`, primary key `branch_id`, columns checked against the
 * live project rather than assumed. The password column is plain text there and
 * that is not something this repo can fix from here — what it can do is not be
 * the second place it sits in clear, which is why the copy below is decrypted
 * in the one function that performs the write and never held anywhere else.
 */
export const BITE_TENBIS_TABLE = "tenbis_branch_config";
