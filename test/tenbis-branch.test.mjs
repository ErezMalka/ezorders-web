// Finding the Bite branch for an order, and the one rule around it.
//
// The matching runs for real here — the module takes its Supabase client as an
// argument exactly so it can — because the interesting failures are in the
// normalisation and in what happens when a phone matches more than one branch.
// Both are cases the live data produces: 1,151 of the CRM's 1,170 cached
// branches carry a phone, hand-formatted, and chains share switchboard numbers.
//
// The rule, asserted from source at the bottom: the suggestion is never the
// decision. Nothing may write a branch id that came out of a match without a
// person confirming it, because what gets written against that id is another
// company's credentials.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  findBranchById,
  loadBranchCache,
  matchBranches,
  normalisePhone,
} from "../src/lib/bite-branches.ts";

const src = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/** Rows shaped like the CRM's, formatted the several ways it formats them. */
const ROWS = [
  { bite_branch_id: 1104, bite_franchise_id: 11, franchise_name: "ג׳פניקה רעננה", branch_phone: "09-7777777" },
  { bite_branch_id: 1180, bite_franchise_id: 11, franchise_name: "ג׳פניקה כפר סבא", branch_phone: "+972-9-7777777" },
  { bite_branch_id: 2001, bite_franchise_id: 22, franchise_name: "פיצה כאן", branch_phone: "052-123-4567" },
  { bite_branch_id: 2002, bite_franchise_id: 23, franchise_name: "בלי טלפון", branch_phone: null },
  { bite_branch_id: null, bite_franchise_id: 24, franchise_name: "בלי מזהה", branch_phone: "052-123-4567" },
];

test("the three ways a phone number is written all mean the same number", () => {
  assert.equal(normalisePhone("03-600-0000"), "36000000");
  assert.equal(normalisePhone("+972-3-6000000"), "36000000");
  assert.equal(normalisePhone("972 3 6000000"), "36000000");
  assert.equal(normalisePhone("036000000"), "36000000");
  assert.equal(normalisePhone("0526000000"), "526000000");
});

test("something too short to be a phone number matches nothing", () => {
  // A phone field with "0" or "05" in it is not rare, and a suffix match on it
  // would propose half the country as candidates.
  for (const junk of ["", null, undefined, "0", "05", "123456", "—"]) {
    assert.equal(normalisePhone(junk), "", `${JSON.stringify(junk)} normalised to a number`);
    assert.deepEqual(matchBranches(ROWS, junk ?? ""), []);
  }
});

test("a phone shared by two branches yields both, never one", () => {
  // This is the case the whole suggest-and-confirm shape exists for: a chain on
  // one switchboard number. Silently taking the first would attach a
  // customer's credentials to the wrong restaurant.
  const out = matchBranches(ROWS, "097777777");
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((b) => b.biteBranchId).sort(), [1104, 1180]);
});

test("a match carries the name, so a person can check it", () => {
  const [only] = matchBranches(ROWS, "+972 52 1234567");
  assert.equal(only.biteBranchId, 2001);
  assert.equal(only.franchiseName, "פיצה כאן");
  assert.equal(only.franchiseId, 22);
});

test("a cached row with no branch id is not a candidate", () => {
  // It shares its phone with 2001 and would otherwise be a second option that
  // cannot be confirmed — or worse, a null written into bite_branch_id.
  const out = matchBranches(ROWS, "0521234567");
  assert.equal(out.length, 1);
  assert.equal(out[0].biteBranchId, 2001);
});

test("the same phone returns the same order every time", () => {
  const a = matchBranches(ROWS, "097777777").map((b) => b.biteBranchId);
  const b = matchBranches([...ROWS].reverse(), "097777777").map((x) => x.biteBranchId);
  assert.deepEqual(a, b, "candidates reorder when the cache does");
});

test("an unmatched phone is an empty answer, not an error", async () => {
  assert.deepEqual(matchBranches(ROWS, "03-9999999"), []);
});

// ── the query ────────────────────────────────────────────────────────────────

/** A Supabase client that answers one select, and records what it was asked. */
function crmStub(data, { error = null } = {}) {
  const calls = [];
  const builder = (table) => {
    const call = { table, select: null, filters: [] };
    calls.push(call);
    const api = {
      select(cols) {
        call.select = cols;
        return api;
      },
      not(col, op, val) {
        call.filters.push(["not", col, op, val]);
        return api;
      },
      eq(col, val) {
        call.filters.push(["eq", col, val]);
        return api;
      },
      limit() {
        return api;
      },
      maybeSingle: async () => ({ data: Array.isArray(data) ? (data[0] ?? null) : data, error }),
      then: (resolve) => resolve({ data, error }),
    };
    return api;
  };
  return { client: { from: builder }, calls };
}

test("the cache is read without the rows that cannot match anything", async () => {
  const { client, calls } = crmStub(ROWS);
  const rows = await loadBranchCache(client);
  assert.equal(rows.length, ROWS.length);
  assert.equal(calls[0].table, "bite_branches_cache");
  assert.deepEqual(calls[0].filters, [["not", "branch_phone", "is", null]]);
});

test("a CRM error is a Hebrew sentence, not a stack", async () => {
  const { client } = crmStub(null, { error: { message: "relation does not exist" } });
  await assert.rejects(() => loadBranchCache(client), /רשימת הסניפים/);
});

test("an id the cache has never heard of resolves to null", async () => {
  const { client } = crmStub(null);
  assert.equal(await findBranchById(client, 9999), null);
});

// ── the rule ─────────────────────────────────────────────────────────────────

test("the branch route never looks anything up by an id from the request", () => {
  // The failure being avoided, and it is a real one in the system this feature
  // borrows from: a route takes a branch id out of the request body, and reads
  // that branch's credentials without ever asking whether the caller owns it.
  //
  // Here the CRM client holds a service key and so bypasses everything. It is
  // therefore only ever handed a phone that the caller's OWN session already
  // returned — getOrderPhone goes through RLS — and the id in the body reaches
  // nothing but a write, which RLS governs in turn.
  const route = src("../src/app/api/agent/orders/[id]/tenbis/branch/route.ts");

  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  assert.ok(!/\bbody\b|request\.json/.test(get), "GET reads the request body");
  assert.match(get, /getOrderPhone\(id\)/);
  assert.match(get, /matchBranches\(await loadBranchCache\(crm\), phone\)/);

  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /setBiteBranch\(id, biteBranchId, session\.id\)/);
  // findBranchById in POST is a display lookup on an id already written through
  // the policy — it must not be the thing that authorises the write.
  assert.ok(
    post.indexOf("setBiteBranch") < post.indexOf("findBranchById"),
    "the CRM is consulted before the policy has accepted the write",
  );
});

test("confirming a branch does not move the state machine", () => {
  // Knowing which branch this is says nothing about whether the credentials
  // work. A confirmation that set `verified` would put a tick on an account
  // nobody has tested.
  const lib = src("../src/lib/agent/tenbis.ts");
  const fn = lib.slice(lib.indexOf("export async function setBiteBranch"));
  const body = fn.slice(0, fn.indexOf("\n}") + 2);
  assert.ok(!/state:/.test(body), "setBiteBranch writes a state");
  assert.ok(!/verified_at|delivered_at/.test(body), "setBiteBranch writes a timestamp it has no business writing");
});

test("the panel proposes and never decides", () => {
  const panel = src("../src/components/agent/TenbisPanel.tsx");
  // No path from a suggestion to a write without a press: confirmBranch is
  // called from onClick handlers and from nowhere else.
  const calls = panel.match(/confirmBranch\(/g) ?? [];
  const byClick = panel.match(/onClick=\{\(\) => void confirmBranch\(/g) ?? [];
  assert.ok(calls.length > 0, "the panel no longer confirms a branch at all");
  assert.equal(
    calls.length,
    byClick.length,
    "confirmBranch is called from somewhere that is not a button",
  );
  // And the lookup on mount must not open the picker or nag about the CRM.
  assert.match(panel, /if \(initial\?\.bite_branch_id\) void lookupBranch\(true\)/);
});
