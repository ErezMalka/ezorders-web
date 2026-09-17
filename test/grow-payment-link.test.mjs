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

// ── splitting a bill ────────────────────────────────────────────────────────
// GROW has no partial payment: no open amount, no allowPartialPayment, and a
// product price is fixed. So paying הקמה by card and עמדה by transfer is two
// links, which makes "is this contract paid" a question about a sum.

test("the parts sum to the contract total exactly", () => {
  // Agorot lost to rounding are a contract that can never settle: the customer
  // pays every part and is still four agorot short, forever. Largest remainder
  // floors each share and hands the leftover to whoever lost the most.
  const fn = payments.slice(
    payments.indexOf("export async function contractPayableParts"),
    payments.indexOf("export interface PaymentSummary")
  );
  assert.ok(fn.length > 0, "contractPayableParts is gone");
  assert.ok(fn.includes("Math.floor"), "shares must be floored, then topped up");
  assert.ok(/left\s*-=\s*1/.test(fn), "the leftover agorot must be handed out");
  assert.ok(fn.includes("dueAgorot"), "the target is the contract total in agorot");

  // Derived, never assumed: the base fee is a pricing setting and moves.
  assert.ok(!/1950/.test(fn), "the base setup fee must not be hardcoded");
});

test("a split never collects more than the contract owes", () => {
  assert.ok(
    payments.includes('mode === "add" && totals && amount > totals.unclaimed'),
    "adding a link must be checked against what is still unclaimed"
  );
  // Two links adding up past the debt is how a customer pays twice, and the
  // refund is a phone call.
  assert.ok(payments.includes("unclaimed"), "totals must expose what has no link yet");
});

test("adding a link does not retire its siblings, and replacing retires all of them", () => {
  // Cancelling the previous link is right when replacing a wrong amount and
  // fatal when splitting, so the cancel is gated on the mode.
  const block = payments.slice(
    payments.indexOf("Only now, with a page in hand"),
    payments.indexOf("const { data: row, error: updateError }")
  );
  assert.ok(block.length > 0, "the cancel step moved; re-point this test");
  assert.ok(
    block.includes('if (mode === "replace")'),
    "only a replacement may cancel what came before"
  );

  // And it must cancel EVERY pending link, not just the newest: with a split
  // there are several, and one left behind is a customer paying twice for the
  // same item.
  assert.ok(block.includes('.eq("status", "pending")'), "all pending links, not just the newest");
  // Excluding the row just created, which is itself already pending.
  assert.ok(block.includes('.neq("id", id)'), "the new link must not cancel itself");
});

test("a paid contract is judged on the sum, not on the newest row", () => {
  // With a split, one row can read "paid" while half the bill is open — and
  // the reverse, which would issue a third link for a settled contract.
  assert.ok(
    payments.includes("totals.outstanding <= 0"),
    "settlement must be decided by the outstanding total"
  );
});

test("each part of a split has its own customer-facing address", () => {
  // /c/<token>/pay means "what is owed" and a split has two of those.
  const route = new URL("../src/app/(site)/c/[token]/pay/[paymentId]/route.ts", import.meta.url);
  const src = readFileSync(fileURLToPath(route), "utf8");
  assert.ok(src.includes("paymentUrlForPart"));
  // A payment id alone must not open somebody else's bill.
  assert.ok(
    payments.includes("contract.public_token !== token"),
    "the token must be checked against the payment's contract"
  );
});

// ── the customer choosing for themselves ────────────────────────────────────

test("the customer posts a selection, never a price", () => {
  // A price in a form is a price a customer can edit. The amount has to be
  // computed on the server from the keys, or a ₪10,000 contract can be settled
  // for ₪1 by anyone who opens the developer tools.
  const fn = payments.slice(
    payments.indexOf("export async function issueCustomerSelection"),
    payments.indexOf("// ── settling ")
  );
  assert.ok(fn.length > 0, "issueCustomerSelection is gone");
  assert.ok(
    fn.includes("chosen.reduce((t, p) => t + p.amount, 0)"),
    "the amount must be summed from the parts the server resolved"
  );

  const route = readFileSync(
    fileURLToPath(new URL("../src/app/(site)/c/[token]/pay/route.ts", import.meta.url)),
    "utf8"
  );
  assert.ok(route.includes('form.getAll("part")'), "the form posts keys");
  assert.ok(!/form\.get\(["']amount["']\)/.test(route), "the form must not post an amount");
});

test("a part that is already paid cannot be selected again", () => {
  const fn = payments.slice(
    payments.indexOf("export async function issueCustomerSelection"),
    payments.indexOf("// ── settling ")
  );
  assert.ok(
    fn.includes('p.claimedBy?.status !== "paid"'),
    "paid parts must be excluded from what a selection can contain"
  );
});

test("what a link covers is stored, not only sent to GROW", () => {
  // The picker could not show that הקמה was already claimed, because nothing
  // recorded which parts a link covered. The agent saw three open checkboxes
  // and was refused for reasons the screen could not explain.
  assert.ok(payments.includes("part_keys: opts.partKeys"), "part keys must be written to the row");
  assert.ok(payments.includes("for_label: opts.forLabel"), "the readable label too");
  assert.ok(payments.includes("claimedBy"), "parts must report who holds them");
});

test("every GROW link names the contract it belongs to", () => {
  // So a charge in GROW's dashboard can be traced back to an agreement without
  // opening this system at all.
  assert.match(
    payments,
    /const title = opts\.forLabel[\s\S]{0,200}הסכם \$\{contract\.contract_number\}/,
    "the contract number must be in the title GROW receives"
  );
});
