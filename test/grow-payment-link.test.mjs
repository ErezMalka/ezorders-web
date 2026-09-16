// The rules GROW's payment-link API enforces silently.
//
// A signed contract could only ever be paid by card, because createPaymentProcess
// opens a payment PAGE and ours is configured card-only. Asking that page for a
// bank transfer returns status 1 and a card page anyway — which is why months
// went by reading GROW's success as our bug. Transfers come from a different
// service, CreatePaymentLink, with its own credentials and its own contract.
//
// Two of that contract's rules fail in ways that look like something else, and
// neither is visible in a type. They are asserted against the source here, the
// way the repo already guards hand-authored details it cannot otherwise reach.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const grow = readFileSync(fileURLToPath(new URL("../src/lib/grow.ts", import.meta.url)), "utf8");
const payments = readFileSync(fileURLToPath(new URL("../src/lib/agent/payments.ts", import.meta.url)), "utf8");

/** The body of createPaymentLink, so assertions cannot pass on the page call. */
function createPaymentLinkBody() {
  const start = grow.indexOf("export async function createPaymentLink");
  assert.ok(start > -1, "createPaymentLink is gone");
  const end = grow.indexOf("\n}", grow.indexOf("return {", start));
  return grow.slice(start, end);
}

test("the link is sent as multipart, with no Content-Type set by hand", () => {
  const body = createPaymentLinkBody();
  // Setting it by hand makes fetch omit the boundary, and nothing parses.
  assert.ok(body.includes("new FormData()"), "must post FormData");
  assert.ok(
    !/headers:\s*\{[^}]*["']Content-Type["']/i.test(body),
    "Content-Type must not be set by hand — fetch writes it with the boundary"
  );
  assert.ok(/["']x-api-key["']/.test(body), "the key goes in x-api-key");
});

test("all three payment methods are asked for", () => {
  // 15 is the whole point. 1 and 6 are what the customer already had.
  for (const method of ["card", "bit", "bank"]) {
    assert.ok(
      payments.includes(`"${method}"`),
      `the contract payment must offer ${method}`
    );
  }
  assert.match(grow.slice(grow.indexOf("TRANSACTION_TYPE")), /bank:\s*15/);
});

test("the notify URL for a link carries no query string", () => {
  // GROW: "do not include any special characters in any parameter". A ?p=&s=
  // is enough for the whole call to be refused, and the refusal does not say
  // which parameter was at fault.
  const match = payments.match(/const linkNotify\s*=\s*`([^`]+)`/);
  assert.ok(match, "the link notify URL should be built in one named place");
  assert.ok(!match[1].includes("?"), `link notify URL must have no query string: ${match[1]}`);
  assert.ok(!match[1].includes("&"), `link notify URL must have no query string: ${match[1]}`);

  // And the route it points at must exist, or every notification 404s.
  const route = new URL("../src/app/api/pay/grow/notify/link/route.ts", import.meta.url);
  assert.ok(readFileSync(fileURLToPath(route), "utf8").includes("export async function POST"));
});

test("the page flow keeps its own signed notify URL", () => {
  // Removing the secret from the link route is deliberate and explained there.
  // It must not spread to the page route, which can carry one and does.
  assert.match(payments, /\/api\/pay\/grow\/notify\?p=\$\{id\}&s=\$\{notifySecret\(\)\}/);
});

test("a missing link configuration falls back to the card page", () => {
  // Until GROW_PR_* exists in the deployment, a contract that cannot be paid at
  // all would be far worse than one payable only by card.
  assert.ok(payments.includes("growLinkEnabled()"), "the link must be conditional");
  assert.ok(
    payments.includes("created ??= await createPaymentProcess("),
    "the card page must still run when no link was minted"
  );
});

test("the link's two handles are read under both of GROW's names", () => {
  // The link answers with paymentLinkProcessId/Token where the page answers
  // processId/Token. Reading only the page's names stores nulls, and a payment
  // with no process id can never be confirmed — it sits pending forever.
  const body = createPaymentLinkBody();
  assert.ok(body.includes("paymentLinkProcessId"));
  assert.ok(body.includes("paymentLinkProcessToken"));
});

test("typographic characters are folded before they reach GROW", () => {
  // Measured against the live API: an em dash alone is refused with
  // status 0 / "גוף הבקשה אינו תקין", naming no field — while quotes, commas,
  // periods, parentheses and plain hyphens all pass. The contract title is
  // "EZOrders — הסכם A-2026-0017", so every payment fell back to the card page.
  assert.ok(grow.includes("export function growSafeText"), "the sanitiser is gone");

  const body = createPaymentLinkBody();
  assert.ok(body.includes("growSafeText(input.title)"), "the title must be sanitised");
  assert.ok(body.includes("growSafeText(input.fullName)"), "the payer name must be sanitised");

  // Folded to an ASCII twin, not deleted: "EZOrders - הסכם" reads; the title
  // with the dash simply removed does not.
  const fn = grow.slice(grow.indexOf("export function growSafeText"));
  assert.match(fn, /replace\(\/\[[^/]*\]\/g,\s*"-"\)/, "dashes fold to a hyphen");
});

test("a successful payment link is not read as an error", () => {
  // GROW's two services disagree about what success looks like:
  //   page: { err: 0, data: {...} }
  //   link: { status: 1, err: {}, data: {...} }
  // An EMPTY error object has no id, the id defaults to -1, and -1 is not 0 —
  // so every successful link threw, was swallowed by the fallback, and served
  // a card page. The link existed at GROW every time.
  const parser = grow.slice(
    grow.indexOf("function parseGrowResponse"),
    grow.indexOf("async function post(")
  );
  assert.ok(parser.length > 0, "parseGrowResponse is gone");

  assert.ok(parser.includes("errIsEmpty"), "the empty-error shape must be recognised");

  // Order is the whole bug: the success branch has to return before the
  // throw, or recognising the shape changes nothing.
  const success = parser.indexOf("errIsEmpty");
  const thrown = parser.indexOf("throw new GrowError(desc");
  assert.ok(success > -1 && thrown > -1);
  assert.ok(success < thrown, "the empty-error success branch must come before the throw");
});
