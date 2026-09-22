import "server-only";

import { BITE_TENBIS_TABLE, biteEnabled, createBiteClient } from "@/lib/bite";
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

export interface TenbisProvisioningRow {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  agent_id: string;
  accepted_at: string;
  order_status: string;
  state: TenbisState;
  last_error: string | null;
  instructed_at: string | null;
  verified_at: string | null;
  delivered_at: string | null;
  bite_branch_id: number | null;
  account_updated_at: string | null;
  has_password: boolean;
  sort_rank: number;
}

/**
 * Everything sold, and where each one stands. Worst first.
 *
 * The question nobody could answer before: an integration paid for four months
 * ago and never connected looked exactly like one sold yesterday, because the
 * sale is here, the onboarding task is in the CRM, and the credentials reach
 * the operational system by hand.
 *
 * Scope is the view's business — it is security_invoker, so the same policies
 * that govern orders and tenbis_accounts choose the rows. An agent gets their
 * own, a manager gets everyone's, and this function states neither rule.
 */
export async function listTenbisProvisioning(limit = 200): Promise<TenbisProvisioningRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenbis_provisioning")
    .select("*")
    .order("sort_rank", { ascending: true })
    .order("accepted_at", { ascending: false })
    .limit(limit);

  if (error) throw new TenbisError(`לא הצלחנו לטעון את רשימת ההקמות: ${error.message}`);
  return (data ?? []) as TenbisProvisioningRow[];
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

/**
 * The phone the order was taken on — the one thing that can find the branch.
 *
 * Read through the caller's own session, which is what makes the branch
 * suggestion safe: an agent who cannot see the order gets no phone, so there is
 * nothing to look up. The route above it holds no check of its own, and should
 * not grow one.
 */
export async function getOrderPhone(orderId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new TenbisError(`לא הצלחנו לטעון את פרטי ההזמנה: ${error.message}`);
  return (data?.customer_phone as string | null) ?? null;
}

/**
 * Record the branch a person confirmed.
 *
 * Separate from saveTenbisAccount because it happens at a different moment and
 * for a different reason: the branch can be settled the day the order is
 * accepted, long before תן ביס has sent the customer anything to type in. Going
 * through the credentials form would mean either blocking the confirmation on
 * fields nobody has yet, or letting an empty form overwrite them.
 *
 * It deliberately does not touch `state`. Knowing which branch this is does not
 * make unproven credentials proven, and a confirmation is not progress through
 * the state machine — it is a fact recorded beside it.
 */
export async function setBiteBranch(
  orderId: string,
  biteBranchId: number | null,
  actorId: string,
): Promise<TenbisAccount> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tenbis_accounts")
    .upsert({ order_id: orderId, bite_branch_id: biteBranchId, updated_by: actorId }, { onConflict: "order_id" })
    .select(SELECT)
    .single();

  if (error) throw new TenbisError(`לא הצלחנו לשמור את מזהה הסניף: ${error.message}`);
  return present(data as AccountRow);
}

/**
 * Hand the credentials to the operational system.
 *
 * This is the last hop, and the one that has always been a person retyping a
 * password out of an email into another database. It is a button and not an
 * automatic consequence of a successful verification: this writes into a
 * different company-critical system, against a branch id somebody confirmed
 * from a phone number, and a write like that should happen because an agent
 * decided it should.
 *
 * Three preconditions, each of which is a different mistake being refused:
 *
 * - **Configured.** No key, no delivery, and the feature says so rather than
 *   half-writing.
 * - **A confirmed branch.** Writing another company's credentials against a
 *   branch nobody looked at is exactly what the suggest-and-confirm shape
 *   exists to prevent; a guess must not become a write here either.
 * - **Verified.** Unproven credentials must not be delivered. The operational
 *   system has no way to tell a typo from a password that has since changed —
 *   it will simply fail to pull orders, quietly, weeks later.
 *
 * `delivered` is allowed back in on purpose: a branch confirmed wrongly, or a
 * password reissued by תן ביס, both have to be re-delivered, and a rule that
 * only ever runs once would send that back to being done by hand.
 */
export async function deliverTenbisAccount(
  orderId: string,
  actorId: string,
): Promise<TenbisAccount> {
  if (!biteEnabled()) {
    throw new TenbisError("ההעברה למערכת התפעולית אינה מוגדרת (חסר BITE_SUPABASE_SERVICE_ROLE_KEY)");
  }
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
  if (!row.bite_branch_id) {
    throw new TenbisError("צריך לקבוע סניף במערכת התפעולית לפני ההעברה");
  }
  if (row.state !== "verified" && row.state !== "delivered") {
    throw new TenbisError("אפשר להעביר רק פרטים שנבדקו בהצלחה מול תן ביס");
  }
  if (!row.password_enc) throw new TenbisError("חסרה סיסמה להעברה");

  let password: string;
  try {
    password = decryptSecret(row.password_enc, key);
  } catch (e) {
    if (e instanceof TenbisCryptoError) {
      throw new TenbisError("לא ניתן לפענח את הסיסמה השמורה. ייתכן שמפתח ההצפנה השתנה — יש להזין אותה מחדש.");
    }
    throw e;
  }

  // Upsert on the branch, because this is the answer to "what are this
  // branch's credentials" and not a log of attempts. A branch whose password
  // was reissued has one row, holding the password that works.
  const bite = createBiteClient();
  const { error: biteError } = await bite
    .from(BITE_TENBIS_TABLE)
    .upsert(
      {
        branch_id: row.bite_branch_id,
        tenbis_user: row.tenbis_user,
        tenbis_password: password,
        restaurant_id: row.restaurant_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "branch_id" },
    );

  if (biteError) {
    // The message, never the payload. An error from a failed write is one of
    // the places a plaintext password has historically ended up in a log.
    throw new TenbisError(`ההעברה למערכת התפעולית נכשלה: ${biteError.message}`);
  }

  const { data: updated, error: markError } = await supabase
    .from("tenbis_accounts")
    .update({
      state: "delivered",
      delivered_at: new Date().toISOString(),
      last_error: null,
      updated_by: actorId,
    })
    .eq("order_id", orderId)
    .select(SELECT)
    .single();

  // The credentials are over there either way. Losing the record of it is a
  // bad outcome but not an undeliverable one, and saying "failed" would have an
  // agent deliver it twice.
  if (markError) {
    throw new TenbisError(
      `הפרטים הועברו למערכת התפעולית, אך לא הצלחנו לעדכן את הסטטוס: ${markError.message}`,
    );
  }

  return present(updated as AccountRow);
}

/**
 * What the order page needs, with no way to take the page down.
 *
 * The two reads above throw, which is right for the API routes — a screen
 * asking for this feature's data deserves to be told the query failed. It is
 * wrong for the order page, where they are two of a dozen things being loaded
 * and the other eleven are what the agent came for. Shipped as it was, a single
 * failing read turned the whole order into a 500; the two migrations behind
 * this feature sat unapplied in production for days, and the only reason nobody
 * met that page is that no agent happened to open one.
 *
 * Settled separately, because the two failures mean different things. An order
 * that never bought תן ביס shows nothing at all even while the accounts table
 * is unreadable — the sale is recorded in quote_items and that read is fine. It
 * is only an order that DID buy it, whose setup cannot be read, that has
 * something worth saying: `unavailable`, which the page turns into a line
 * rather than a panel. Silence there would read as "this order did not buy the
 * integration", which is the one wrong answer available.
 */
export interface TenbisPanelData {
  sold: boolean;
  account: TenbisAccount | null;
  /** The sale is real but its setup could not be read. */
  unavailable: boolean;
}

export async function getTenbisPanelData(orderId: string): Promise<TenbisPanelData> {
  const [soldResult, accountResult] = await Promise.allSettled([
    orderHasTenbis(orderId),
    getTenbisAccount(orderId),
  ]);

  if (soldResult.status === "rejected") {
    // Nothing can be said about this order, so say nothing and keep the page.
    console.error("[agent/tenbis] panel: sold check failed", soldResult.reason);
    return { sold: false, account: null, unavailable: false };
  }

  if (accountResult.status === "rejected") {
    console.error("[agent/tenbis] panel: account read failed", accountResult.reason);
    return { sold: soldResult.value, account: null, unavailable: soldResult.value };
  }

  return { sold: soldResult.value, account: accountResult.value, unavailable: false };
}
