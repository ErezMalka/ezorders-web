// ─── Which branch in Bite is this order? ──────────────────────────────────────
//
// EZORDERS does not know. It never has: a customer's second branch is modelled
// here as a second quote with identical customer details, and nothing in this
// database carries Bite's integer branch id. But delivering a תן ביס account
// into the operational system means writing it against exactly that id, so the
// question has to be answered somewhere.
//
// The CRM answers it, and better than expected. `bite_branches_cache` holds
// 1,170 branches over some 700 franchises, and 1,151 of them carry a phone —
// 98%. (`customers.branch_number` was the obvious candidate and is the wrong
// one: 84 of 1,029 rows filled.) So the route is
//
//   orders.customer_phone → bite_branches_cache.branch_phone → bite_branch_id
//
// with both sides normalised, because one of them was typed by an agent on a
// phone call and the other by whoever set the branch up.
//
// This module is deliberately a pure one — it holds no secret, reads no
// environment, and takes its Supabase client as an argument, the way
// tenbis-api.ts takes its fetch. That is what lets its suite run the matching
// for real against rows shaped like the live ones, instead of asserting on the
// shape of this file.
//
// What it does NOT do is decide. It suggests, and a person confirms; see the
// route and the panel. Writing another company's credentials to a branch picked
// by a phone number without a human in the loop is not a thing to automate.

import type { SupabaseClient } from "@supabase/supabase-js";

/** A row of the CRM's branch cache, as the CRM stores it. */
export interface BranchRow {
  bite_branch_id: number | null;
  bite_franchise_id: number | null;
  franchise_name: string | null;
  branch_phone: string | null;
}

/** One candidate branch, as a screen shows it. */
export interface BranchSuggestion {
  biteBranchId: number;
  franchiseId: number | null;
  franchiseName: string | null;
  branchPhone: string | null;
}

/**
 * An Israeli phone number, reduced to the part that identifies it.
 *
 * Digits only; a country code dropped; then a leading zero dropped. The three
 * forms an agent and the CRM between them actually produce —
 * `03-600-0000`, `+972-3-6000000`, `036000000` — all land on `36000000`.
 *
 * Returns "" for anything with fewer than seven digits left, which is not a
 * phone number but is very much something that gets typed into a phone field.
 * A short string here would match a suffix of half the country.
 */
export function normalisePhone(raw: string | null | undefined): string {
  let digits = (raw ?? "").replace(/\D+/g, "");
  if (digits.startsWith("972")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 7 ? digits : "";
}

/**
 * Every branch whose phone is this phone.
 *
 * Exact equality on the normalised number, and nothing looser. A suffix or
 * "close enough" match would eventually hand an agent a plausible-looking
 * franchise that is not the customer's, and the whole point of the screen this
 * feeds is that what it shows is worth confirming.
 *
 * Several matches is the normal case, not the edge: a chain with four branches
 * on one switchboard number is exactly how chains work. Which is why this
 * returns a list and the caller never takes `[0]`.
 */
export function matchBranches(rows: BranchRow[], phone: string): BranchSuggestion[] {
  const wanted = normalisePhone(phone);
  if (!wanted) return [];

  const seen = new Set<number>();
  const out: BranchSuggestion[] = [];

  for (const row of rows) {
    if (row.bite_branch_id == null) continue;
    if (normalisePhone(row.branch_phone) !== wanted) continue;
    if (seen.has(row.bite_branch_id)) continue;
    seen.add(row.bite_branch_id);
    out.push({
      biteBranchId: row.bite_branch_id,
      franchiseId: row.bite_franchise_id ?? null,
      franchiseName: row.franchise_name ?? null,
      branchPhone: row.branch_phone ?? null,
    });
  }

  // By name, so the same phone number produces the same order of candidates on
  // every load — an agent comparing two similar rows should not have them swap
  // places under the cursor.
  out.sort((a, b) => (a.franchiseName ?? "").localeCompare(b.franchiseName ?? "", "he") || a.biteBranchId - b.biteBranchId);
  return out;
}

/** The columns this needs, named once. */
const BRANCH_SELECT = "bite_branch_id, bite_franchise_id, franchise_name, branch_phone";

/**
 * The whole cache, matched in memory rather than in the query.
 *
 * It looks wasteful and is not: 1,170 rows of four small columns is well under
 * a hundred kilobytes, fetched once when an agent presses a button. The
 * alternative is a LIKE against a hand-formatted column, and there is no
 * pattern that matches `03-600-0000` and `+972 3 6000000` to the same customer
 * without the normalisation this does in JavaScript anyway.
 */
export async function loadBranchCache(crm: SupabaseClient, limit = 5000): Promise<BranchRow[]> {
  const { data, error } = await crm
    .from("bite_branches_cache")
    .select(BRANCH_SELECT)
    .not("branch_phone", "is", null)
    .limit(limit);

  if (error) throw new Error(`לא הצלחנו לקרוא את רשימת הסניפים מה-CRM: ${error.message}`);
  return (data ?? []) as BranchRow[];
}

/**
 * One branch by its id, for showing a name beside an id that was confirmed
 * weeks ago. Null when the cache has never heard of it — which is an answer
 * worth showing rather than hiding, since it means the id came from somewhere
 * else.
 */
export async function findBranchById(crm: SupabaseClient, biteBranchId: number): Promise<BranchSuggestion | null> {
  const { data, error } = await crm
    .from("bite_branches_cache")
    .select(BRANCH_SELECT)
    .eq("bite_branch_id", biteBranchId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`לא הצלחנו לקרוא את פרטי הסניף מה-CRM: ${error.message}`);
  if (!data) return null;
  const row = data as BranchRow;
  return {
    biteBranchId,
    franchiseId: row.bite_franchise_id ?? null,
    franchiseName: row.franchise_name ?? null,
    branchPhone: row.branch_phone ?? null,
  };
}
