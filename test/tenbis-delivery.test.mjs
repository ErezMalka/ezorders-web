// The last hop: writing a customer's תן ביס credentials into the operational
// system.
//
// This is the one function in the feature that decrypts a password for a
// purpose other than proving it, and it writes into a different Supabase
// project with a service key that bypasses everything over there. So what is
// asserted here is not that it works — a round trip into another company's
// database is not something a unit test should have — but the three refusals
// that stand between a sale and that write, and the places a plaintext password
// must not end up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const lib = src("../src/lib/agent/tenbis.ts");
const bite = src("../src/lib/bite.ts");
const route = src("../src/app/api/agent/orders/[id]/tenbis/deliver/route.ts");
const panel = src("../src/components/agent/TenbisPanel.tsx");

/** The body of the delivery function, so nothing here passes on another one. */
const deliver = (() => {
  const start = lib.indexOf("export async function deliverTenbisAccount");
  assert.ok(start > -1, "deliverTenbisAccount is gone");
  const next = lib.indexOf("\nexport ", start + 1);
  return lib.slice(start, next === -1 ? lib.length : next);
})();

test("nothing is delivered that תן ביס has not accepted", () => {
  // The operational system cannot tell a typo from a password that has since
  // changed. It simply stops pulling orders, quietly, weeks later — which is
  // the failure this whole feature exists to make impossible.
  assert.match(deliver, /row\.state !== "verified" && row\.state !== "delivered"/);
  assert.match(deliver, /נבדקו בהצלחה מול תן ביס/);
});

test("a delivered account can be delivered again", () => {
  // A branch confirmed wrongly and a password reissued by תן ביס both have to
  // be re-delivered. A once-only rule sends that back to being done by hand,
  // which is where it started.
  assert.ok(
    /state !== "verified" && row\.state !== "delivered"/.test(deliver),
    "delivered is not allowed back in",
  );
  assert.match(panel, /העברה מחדש להקמה/);
});

test("nothing is delivered against a branch nobody confirmed", () => {
  // The branch id is a suggestion until a person presses something. Writing
  // another company's credentials against a guess is the exact thing the
  // suggest-and-confirm shape exists to prevent, and it must be refused here
  // too rather than only in the screen.
  assert.match(deliver, /if \(!row\.bite_branch_id\)/);
  assert.ok(
    deliver.indexOf("bite_branch_id") < deliver.indexOf("decryptSecret("),
    "the password is decrypted before the branch has been checked",
  );
});

test("an unconfigured operational system is a refusal, not a half-write", () => {
  assert.match(deliver, /if \(!biteEnabled\(\)\)/);
  assert.ok(
    deliver.indexOf("biteEnabled()") < deliver.indexOf("decryptSecret("),
    "the password is decrypted before we know there is anywhere to send it",
  );
});

test("the write is keyed by the branch, and is not a log of attempts", () => {
  // One row per branch, holding the credentials that work. A second row for the
  // same branch is two answers to a question that has one.
  assert.match(deliver, /onConflict: "branch_id"/);
  assert.match(deliver, /BITE_TENBIS_TABLE/);
  assert.ok(!/insert\(/.test(deliver), "delivery inserts rather than upserts");
});

test("a failed write logs its message and never its payload", () => {
  // A plaintext password travels through this call. An error object logged
  // whole is the classic way one ends up in a place it cannot be taken back
  // from.
  assert.match(deliver, /biteError\.message/);
  assert.ok(!/console\.(log|error)\([^)]*password/i.test(deliver), "the module logs a password");
  const logs = route.match(/console\.error\([\s\S]*?\);/g) ?? [];
  for (const log of logs) {
    assert.ok(
      /error instanceof Error \? error\.message/.test(log),
      `the delivery route logs an error object: ${log}`,
    );
  }
});

test("the password reaches exactly two places, and they are both writes to another system", () => {
  // Raised from one to two by this step, deliberately. Every further caller is
  // another chance for a plaintext password to be held somewhere it was not
  // expected — so this number is a decision, and changing it should be one too.
  const calls = lib.match(/decryptSecret\(/g) ?? [];
  assert.equal(calls.length, 2, `decryptSecret is called ${calls.length} times`);
  assert.ok(deliver.includes("decryptSecret("));
});

test("the delivery route returns no password and holds no rules of its own", () => {
  // Comments stripped first: the route's own explains why it logs a message
  // rather than an object, and the word "password" in that sentence is not a
  // password travelling anywhere. Asserting on prose is how a source test goes
  // wrong, and this suite has already been bitten by it twice.
  const code = route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/password/i.test(code), "the delivery route handles a password");
  // Every precondition lives in the module. A copy here is the copy that
  // drifts, and it would drift towards being more permissive.
  assert.ok(!/bite_branch_id|verified/.test(code), "the route restates the module's rules");
  assert.ok(!/createSupabaseAdminClient/.test(code), "the route uses the admin client");
});

test("delivery is a press, never a consequence of a successful verification", () => {
  // Automatic-on-verify was considered and refused: it writes into another
  // company-critical system on a keystroke.
  const calls = panel.match(/deliver\(\)/g) ?? [];
  const byClick = panel.match(/onClick=\{deliver\}/g) ?? [];
  assert.equal(calls.length, 0, "deliver() is called from code, not from a button");
  assert.equal(byClick.length, 1, "the deliver button is gone or duplicated");
  const verify = panel.slice(panel.indexOf("const verify = async"), panel.indexOf("const copyInstructions"));
  assert.ok(!/deliver/.test(verify), "the verification triggers a delivery");
});

test("the operational system is off when unset, exactly like the CRM", () => {
  // Two shapes for reaching two other projects would be two places to get
  // "off when unset" wrong.
  const crm = src("../src/lib/crm.ts");
  for (const [name, source, prefix] of [["bite", bite, "bite"], ["crm", crm, "crm"]]) {
    assert.match(source, new RegExp(`export function ${prefix}Config\\(\\)`), `${name} lost its config`);
    assert.match(source, new RegExp(`export function ${prefix}Enabled\\(\\)`), `${name} lost its switch`);
    assert.match(source, /if \(!url \|\| !key\) return null;/, `${name} does not turn itself off`);
    assert.match(source, /import "server-only";/, `${name} can be imported by a browser`);
  }
});

test("a screen is told why it cannot deliver yet", () => {
  // A disabled button with no reason is a support call.
  assert.match(panel, /deliverBlocker/);
  assert.match(panel, /אינה מוגדרת בשרת/);
  assert.match(panel, /צריך קודם בדיקת חיבור/);
  assert.match(panel, /צריך לקבוע סניף/);
});
