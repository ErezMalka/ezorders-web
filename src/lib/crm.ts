import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The CRM — BITECRM2026, a separate Supabase project — reached with its own
 * service key. Server-only, and only from the sync in lib/agent/crm-sync.ts.
 *
 * The key bypasses the CRM's row security, which is exactly what a machine
 * writing an order on a manager's behalf needs and exactly why it must never
 * be exposed: it lives in Vercel as CRM_SUPABASE_SERVICE_ROLE_KEY and nowhere
 * in the browser. Unset = the integration is off and the portal says so.
 */

export function crmConfig(): { url: string; key: string } | null {
  const url = (process.env.CRM_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.CRM_SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) return null;
  return { url, key };
}

export function crmEnabled(): boolean {
  return crmConfig() !== null;
}

export function createCrmClient(): SupabaseClient {
  const config = crmConfig();
  if (!config) throw new Error("CRM is not configured (CRM_SUPABASE_URL / CRM_SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The CRM's own vocabulary, by id. These are rows in its statuses tables, not
 * enums, so they are named here once rather than looked up by Hebrew string
 * on every push.
 */
export const CRM = {
  orderStatus: {
    awaitingPayment: "37a899d6-68f9-4359-a1da-54e75a0c663f", // ממתינה לאישור תשלום
    approved: "6c5b55c3-d03e-4d60-9eac-093b9c8f2b75", // אושרה
  },
  customerStatus: {
    onboarding: "040a95cc-1e7b-4410-9b68-7a38de609458", // בהקמה
  },
  sourceType: "ezorders_web",
  skuPrefix: "EZ-",
} as const;
