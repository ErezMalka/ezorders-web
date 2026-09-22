// The rules the תן ביס module enforces, and the promise it makes.
//
// This module reaches Supabase, so unlike the cipher and the API client it
// cannot simply be imported and run here. What can be checked without a
// database is the part most worth checking: that no code path returns the
// password, that the state machine cannot leave a proven tick on credentials
// that have since changed, and that an outage is never recorded as the
// customer's fault.
//
// Those are asserted against the source, the way this repo already guards
// hand-authored details it cannot otherwise reach. The two things that CAN be
// run for real — the cipher and the API client — have their own suites and are
// run for real there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const lib = src("../src/lib/agent/tenbis.ts");
const routeMain = src("../src/app/api/agent/orders/[id]/tenbis/route.ts");
const routeVerify = src("../src/app/api/agent/orders/[id]/tenbis/verify/route.ts");

/** The body of one exported function, so an assertion cannot pass on another. */
function body(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start > -1, `${name} is gone`);
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("the password has exactly one way out of the database, and it is not a response", () => {
  // present() is the only thing that turns a row into something a caller sees.
  //
  // The first version of this test asserted that the destructuring and the
  // `!!password_enc` were both present — and passed happily when the column was
  // added back into the returned object, which is the exact bug it existed to
  // prevent. Both halves it checked were still there; the leak was a third
  // mention. So the assertion is now about what present() may SAY, not about
  // what it contains: two mentions of the column, the ones that drop it and
  // test it, and no third.
  const fn = lib.slice(lib.indexOf("function present("), lib.indexOf("/** Whether the feature"));
  const mentions = fn.match(/password_enc/g) ?? [];
  assert.equal(
    mentions.length, 2,
    `present() mentions password_enc ${mentions.length} times; a third is a leak`,
  );
  assert.match(fn, /const \{ password_enc, \.\.\.rest \} = row/);
  assert.match(fn, /hasPassword: !!password_enc/);

  // And the shape a screen receives must not carry it at all.
  const iface = lib.slice(lib.indexOf("export interface TenbisAccount"), lib.indexOf("interface AccountRow"));
  assert.ok(!/password_enc|password:/.test(iface), "TenbisAccount gained a password field");
  assert.ok(iface.includes("hasPassword"));
});

test("decryptSecret is called in exactly two places — the verification and the delivery", () => {
  // Every additional caller is another chance for a plaintext password to end
  // up somewhere it is not expected. Delivery to Bite added the second, which
  // is why this number moved — deliberately, in the step that earned it. The
  // delivery's own half of the rule lives in test/tenbis-delivery.test.mjs.
  const calls = lib.match(/decryptSecret\(/g) ?? [];
  assert.equal(calls.length, 2, `decryptSecret is called ${calls.length} times`);
  assert.ok(body(lib, "verifyTenbisAccount").includes("decryptSecret("));
  assert.ok(body(lib, "deliverTenbisAccount").includes("decryptSecret("));
});

test("no route returns a password, or the row that holds one", () => {
  for (const [name, route] of [["main", routeMain], ["verify", routeVerify]]) {
    assert.ok(!/password_enc/.test(route), `${name} route touches password_enc`);
    // The save route reads body.password, which is correct — it accepts one.
    // What it must never do is put one in a response.
    const responses = route.match(/NextResponse\.json\([^)]*\)/g) ?? [];
    for (const r of responses) {
      assert.ok(!/password/i.test(r), `${name} route may return a password: ${r}`);
    }
  }
});

test("a changed secret loses its tick", () => {
  // A verified row whose password, username or restaurant id has since changed
  // is not verified. Leaving the tick on is how a typo reaches delivery looking
  // proven.
  const save = body(lib, "saveTenbisAccount");
  assert.match(save, /patch\.password_enc = encryptSecret/);
  assert.match(save, /patch\.state = "entered"/);
  assert.match(save, /patch\.verified_at = null/);
  assert.match(save, /existing\.tenbis_user !== user \|\| existing\.restaurant_id !== restaurantId/);
});

test("an absent password does not clear the stored one", () => {
  // The form never shows a password, so submitting it must not wipe one.
  const save = body(lib, "saveTenbisAccount");
  assert.match(save, /password !== undefined && password !== ""/);
  assert.ok(
    !/patch\.password_enc = null/.test(save),
    "a save path sets password_enc to null",
  );
});

test("an outage is never recorded as the customer's fault", () => {
  // The distinction the whole result type exists for. An unreachable service
  // proves nothing about the credentials, so the row must not move to failed.
  const verify = body(lib, "verifyTenbisAccount");
  const unreachable = verify.slice(verify.indexOf('result.reason === "unreachable"'));
  const untilFailed = unreachable.slice(0, unreachable.indexOf('state: "failed"'));
  assert.ok(
    untilFailed.includes("return"),
    "the unreachable branch falls through to marking the row failed",
  );
  assert.match(verify, /blame: "service"/);
  assert.match(verify, /blame: "customer"/);
});

test("a key that cannot decrypt is our problem, not the customer's", () => {
  // A rotated or mis-pasted key looks exactly like a wrong password unless it
  // is told apart, and "wrong password" would send the agent to the customer.
  const verify = body(lib, "verifyTenbisAccount");
  assert.match(verify, /TenbisCryptoError/);
  assert.match(verify, /מפתח ההצפנה/);
});

test("the token תן ביס returns is not stored anywhere", () => {
  // The portal has no use for a session with their service, and keeping it
  // would mean holding a second secret for no reason.
  assert.ok(!/token/i.test(body(lib, "verifyTenbisAccount").replace(/\*[\s\S]*?\*\//g, "")),
    "the verification keeps the token");
});

test("the routes run as the caller, never as the service role", () => {
  // The security boundary is the RLS policy. A service-role client here would
  // silently bypass it and turn every one of these into the bug being avoided.
  for (const [name, route] of [["main", routeMain], ["verify", routeVerify]]) {
    assert.ok(!/createSupabaseAdminClient/.test(route), `${name} route uses the admin client`);
  }
  assert.ok(!/createSupabaseAdminClient/.test(lib), "the module uses the admin client");
  assert.match(lib, /createSupabaseServerClient/);
});

test("the module does no scoping of its own", () => {
  // "where agent_id = me" in here would be a second, divergent copy of a rule
  // the policy already states — and the one that gets forgotten.
  //
  // Checked as a FILTER rather than as any mention of the column: the list row
  // legitimately carries agent_id, and the first version of this test failed on
  // that field the moment it was added. Reading a column is not scoping by it.
  assert.ok(!/\.eq\(\s*["']agent_id/.test(lib), "the module filters by agent_id");
  assert.ok(!/agent_id\s*(=|===)/.test(lib), "the module compares agent_id itself");
  assert.ok(!/auth\.uid|session\.id\s*===/.test(lib), "the module decides scope itself");
});

test("the catalogue key matches the column the quotes actually use", () => {
  // component_key, not product_key — guessed wrong once, and the live data
  // settled it. Checked against the code with the comments stripped: the first
  // version of this test failed on the sentence explaining the distinction,
  // which is the classic way a source-text assertion goes wrong.
  const code = lib.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.match(code, /quote_items\.component_key/);
  assert.ok(!/product_key/i.test(code), "the query still mentions a product_key");
});

// ── the provisioning list ────────────────────────────────────────────────────

const view = src("../supabase/migrations/0035_tenbis_provisioning.sql");

test("the list view never carries the ciphertext", () => {
  // It is read by a table of every sold integration. There is no reason for an
  // encrypted password to travel to a list screen, and a `select *` on the view
  // is exactly how one would.
  assert.match(view, /\(t\.password_enc is not null\)\s+as has_password/);
  const selected = view.slice(view.indexOf("select"), view.indexOf("from public.orders"));
  assert.ok(
    !/^\s*t\.password_enc\s*,/m.test(selected),
    "the view selects password_enc itself",
  );
});

test("the list runs as the caller, so scope is the policy's business", () => {
  // Without security_invoker a view runs as its definer and quietly hands every
  // agent every customer — the same class of mistake as a check in a route.
  assert.match(view, /with \(security_invoker = true\)/);
  assert.ok(!/agent_id\s*=/.test(view), "the view filters by agent itself");
});

test("an order can only appear once", () => {
  // A quote may carry the line more than once. Joining quote_items would then
  // show the customer twice and double every count on the screen.
  assert.match(view, /where exists \(/);
  assert.ok(!/join public\.quote_items/.test(view), "the view joins quote_items");
});

test("worst first, and ours before theirs", () => {
  // The ordering is the screen's argument: anything broken, then everything
  // waiting on us, then what is waiting on the customer, then what is done.
  const ranks = [...view.matchAll(/when '(\w+)'\s+then (\d)/g)].map((m) => [m[1], Number(m[2])]);
  const rank = Object.fromEntries(ranks);
  assert.equal(rank.failed, 0, "a broken integration is not at the top");
  for (const ours of ["entered", "verified", "sold"]) {
    assert.ok(rank[ours] < rank.instructed, `${ours} sorts below "waiting on the customer"`);
  }
  assert.ok(rank.delivered > rank.instructed, "finished work is not last");
});

test("cancelled orders are not chased", () => {
  assert.match(view, /o\.status <> 'cancelled'/);
});

// ── the order page survives this feature ─────────────────────────────────────

test("no read in this feature can take the order page down", () => {
  // The failure that made this test exist: both migrations behind תן ביס sat
  // unapplied in production while the code that reads their tables was live.
  // getTenbisAccount throws on a failed query — correct for a route, fatal for
  // a server component — so the first agent to open ANY order would have got a
  // 500 on the contract, the payment and the log as well. Nobody did, which is
  // luck and not a property of the code.
  const page = src("../src/app/(he)/he/agent/orders/[id]/page.tsx");

  // The page may only reach this feature through the settling wrapper.
  assert.match(page, /getTenbisPanelData\(order\.id\)/);
  assert.ok(!/getTenbisAccount|orderHasTenbis/.test(page), "the page calls a throwing read directly");

  const fn = body(lib, "getTenbisPanelData");
  assert.match(fn, /Promise\.allSettled/);
  // Settled separately, and it matters: an order that never bought תן ביס must
  // show nothing even while the accounts table is unreadable.
  assert.match(fn, /soldResult\.status === "rejected"/);
  assert.match(fn, /accountResult\.status === "rejected"/);
  assert.ok(!/throw /.test(fn), "the wrapper throws");
});

test("a sale whose setup cannot be read says so, rather than disappearing", () => {
  // Silence would read as "this order did not buy the integration", and the
  // agent would stop looking — the one wrong answer available.
  const fn = body(lib, "getTenbisPanelData");
  assert.match(fn, /unavailable: soldResult\.value/);

  const page = src("../src/app/(he)/he/agent/orders/[id]/page.tsx");
  assert.match(page, /tenbis\.sold && !tenbis\.unavailable/);
  assert.match(page, /tenbis\.unavailable \?/);
  assert.match(page, /ההזמנה כוללת את ממשק תן ביס/);
});
