import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTenbisCredentials } from "@/lib/tenbis-api";
import {
  decryptSecret,
  encryptSecret,
  tenbisKey,
  TenbisCryptoError,
} from "./tenbis-crypto";

/**
 * תן ביס — the half that starts once it has been sold.
 *
 * The portal has been able to put the תן ביס integration on a quote since the
 * catalogue was written, and has never been able to deliver one: the contract
 * syncs to the CRM, the CRM raises a task saying "send the customer the
 * instructions", and the credentials that come back are typed into the
 * operational system by hand with nothing tying them to the order that sold
 * them. This module is that missing middle.
 *
 * Scope is RLS's decision throughout, as everywhere else here — the policy on
 * tenbis_accounts reaches through to the order, so an agent sees their own and
 * a manager sees everyone's without a single check in this file. That is
 * deliberate and worth not undoing: the implementation this borrows from put
 * its check in the route, and the check looked at the wrong thing.
 *
 * The password never leaves. It is encrypted on the way in, decrypted only in
 * the two places that talk to another system, and no function here returns it.
 */

/**
 * The catalogue key that means this order bought the integration.
 *
 * Matched against quote_items.component_key — the column is named for the
 * component the line came from, not for a product. Nine live quotes carry it
 * today, in the
 * `integrations` group beside wolt and mishloha.
 */
export const TENBIS_COMPONENT_KEY = "tenbis";

export type TenbisState =
  | "sold"        // on the order, nothing done yet — the absence of a row
  | "instructed"  // the customer has been told what to ask תן ביס for
  | "entered"     // credentials captured, not yet proven
  | "verified"    // תן ביס accepted them
  | "failed"      // תן ביס refused them; last_error says why
  | "delivered";  // written into the operational system

export class TenbisError extends Error {}

/**
 * What a screen is allowed to know.
 *
 * `hasPassword` rather than the password: there is no readback anywhere in this
 * feature. An agent who needs to know the credentials work asks for a
 * verification, which is a fact about them rather than a copy of them.
 */
export interface TenbisAccount {
  order_id: string;
  tenbis_user: string;
  restaurant_id: string;
  bite_branch_id: number | null;
  state: TenbisState;
  last_error: string | null;
  hasPassword: boolean;
  instructed_at: string | null;
  verified_at: string | null;
  delivered_at: string | null;
  updated_at: string;
}

interface AccountRow {
  order_id: string;
  tenbis_user: string;
  restaurant_id: string;
  bite_branch_id: number | null;
  state: TenbisState;
  last_error: string | null;
  password_enc: string | null;
  instructed_at: string | null;
  verified_at: string | null;
  delivered_at: string | null;
  updated_at: string;
}

// One string literal, not a concatenation: supabase-js parses the select at
// the type level, and a built-up constant comes back as GenericStringError.
const SELECT =
  "order_id, tenbis_user, restaurant_id, bite_branch_id, state, last_error, password_enc, instructed_at, verified_at, delivered_at, updated_at";

/** The row, minus the one column that must not travel. */
function present(row: AccountRow): TenbisAccount {
  const { password_enc, ...rest } = row;
  return { ...rest, hasPassword: !!password_enc };
}

/** Whether the feature can work at all. Mirrors crmEnabled(). */
export function tenbisEnabled(): boolean {
  return tenbisKey() !== null;
}

// ── reads ─────────────────────────────────────────────────────────────────────

/**
 * Whether this order actually bought the integration.
 *
 * The panel is drawn from this rather than shown everywhere, because an order
 * that did not buy תן ביס has no business collecting a customer's credentials
 * for it — and an agent seeing the form on every order would eventually fill
 * one in.
 */
export async function orderHasTenbis(orderId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("quote_id, quotes!inner(quote_items!inner(component_key))")
    .eq("id", orderId)
    .eq("quotes.quote_items.component_key", TENBIS_COMPONENT_KEY)
    .maybeSingle();

  if (error) throw new TenbisError(`לא הצלחנו לבדוק את פריטי ההזמנה: ${error.message}`);
  return !!data;
}

export async function getTenbisAccount(orderId: string): Promise<TenbisAccount | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenbis_accounts")
    .select(SELECT)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw new TenbisError(`לא הצלחנו לטעון את הגדרות תן ביס: ${error.message}`);
  return data ? present(data as AccountRow) : null;
}

// ── writes ────────────────────────────────────────────────────────────────────

export interface SaveInput {
  user: string;
  /** Omitted leaves the stored one alone — a form that shows no password must not clear it. */
  password?: string;
  restaurantId: string;
  biteBranchId?: number | null;
}

/**
 * Save what the agent typed.
 *
 * A changed password sends the row back to `entered`: credentials that have not
 * been proven since they changed are unproven credentials, and leaving the row
 * on `verified` would let a typo sail through to delivery wearing a tick.
 */
export async function saveTenbisAccount(
  orderId: string,
  input: SaveInput,
  actorId: string,
): Promise<TenbisAccount> {
  const key = tenbisKey();
  if (!key) throw new TenbisError("תן ביס אינו מוגדר במערכת (חסר TENBIS_ENC_KEY)");

  const user = input.user.trim();
  const restaurantId = input.restaurantId.trim();
  const password = input.password;

  const supabase = await createSupabaseServerClient();
  const existing = await getTenbisAccount(orderId);

  const patch: Record<string, unknown> = {
    order_id: orderId,
    tenbis_user: user,
    restaurant_id: restaurantId,
    updated_by: actorId,
  };
  if (input.biteBranchId !== undefined) patch.bite_branch_id = input.biteBranchId;

  if (password !== undefined && password !== "") {
    patch.password_enc = encryptSecret(password, key);
    patch.state = "entered";
    patch.verified_at = null;
    patch.last_error = null;
  } else if (!existing) {
    // A first save with no password is a half-filled form, not a credential.
    patch.state = "entered";
  } else if (
    (existing.tenbis_user !== user || existing.restaurant_id !== restaurantId) &&
    existing.state === "verified"
  ) {
    // The username or the restaurant id moved. Same reasoning as the password:
    // what was proven is no longer what is stored.
    patch.state = "entered";
    patch.verified_at = null;
  }

  const { data, error } = await supabase
    .from("tenbis_accounts")
    .upsert(patch, { onConflict: "order_id" })
    .select(SELECT)
    .single();

  if (error) throw new TenbisError(`לא הצלחנו לשמור את הגדרות תן ביס: ${error.message}`);
  return present(data as AccountRow);
}

/**
 * Log in to תן ביס with what is stored, and record what happened.
 *
 * The token is thrown away. The portal has no use for a session with their
 * service — the only question being asked is whether these credentials are
 * real, and keeping the token would mean holding a second secret for nothing.
 */
export async function verifyTenbisAccount(
  orderId: string,
): Promise<{ ok: true } | { ok: false; message: string; blame: "customer" | "service" }> {
  const key = tenbisKey();
  if (!key) throw new TenbisError("תן ביס אינו מוגדר במערכת (חסר TENBIS_ENC_KEY)");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenbis_accounts")
    .select(SELECT)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw new TenbisError(`לא הצלחנו לטעון את הגדרות תן ביס: ${error.message}`);
  if (!data) throw new TenbisError("אין עדיין פרטי תן ביס להזמנה הזו");

  const row = data as AccountRow;
  if (!row.password_enc) throw new TenbisError("חסרה סיסמה לבדיקה");

  let password: string;
  try {
    password = decryptSecret(row.password_enc, key);
  } catch (e) {
    // Almost always a rotated or mis-pasted key. Saying "wrong password" here
    // would send the agent to the customer over our own configuration.
    if (e instanceof TenbisCryptoError) {
      throw new TenbisError("לא ניתן לפענח את הסיסמה השמורה. ייתכן שמפתח ההצפנה השתנה — יש להזין אותה מחדש.");
    }
    throw e;
  }

  const result = await verifyTenbisCredentials({
    user: row.tenbis_user,
    password,
    restaurantId: row.restaurant_id,
  });

  if (result.ok) {
    await supabase
      .from("tenbis_accounts")
      .update({ state: "verified", verified_at: new Date().toISOString(), last_error: null })
      .eq("order_id", orderId);
    return { ok: true };
  }

  // An outage must not mark the customer's credentials failed — they were never
  // tested. Only a refusal from תן ביס is evidence about them.
  if (result.reason === "unreachable") {
    return { ok: false, message: result.message, blame: "service" };
  }

  await supabase
    .from("tenbis_accounts")
    .update({ state: "failed", last_error: result.message, verified_at: null })
    .eq("order_id", orderId);
  return { ok: false, message: result.message, blame: "customer" };
}

/** Record that the customer has been sent the instructions. */
export async function markInstructed(orderId: string, actorId: string): Promise<TenbisAccount> {
  const supabase = await createSupabaseServerClient();
  const existing = await getTenbisAccount(orderId);

  const { data, error } = await supabase
    .from("tenbis_accounts")
    .upsert(
      {
        order_id: orderId,
        instructed_at: new Date().toISOString(),
        updated_by: actorId,
        // Only moves the state forward out of the empty one. An order already
        // carrying verified credentials does not regress because somebody
        // re-sent the instructions.
        ...(existing && existing.state !== "sold" ? {} : { state: "instructed" }),
      },
      { onConflict: "order_id" },
    )
    .select(SELECT)
    .single();

  if (error) throw new TenbisError(`לא הצלחנו לעדכן את הסטטוס: ${error.message}`);
  return present(data as AccountRow);
}
