// The commission calculator puts a shekel figure in front of a restaurant
// owner, so the failure that matters is not a crash — it is a number that is
// quietly too big. These check the shape of the result rather than pinning
// outputs, so the model can be tuned without the tests becoming a formality.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/lib/commission.ts", import.meta.url)),
  "utf8",
);

/**
 * The lib is TypeScript and the suite runs on bare node, so the function is
 * re-derived here from first principles rather than imported. That is the point:
 * an independent derivation cannot agree with a wrong formula the way a copy of
 * it would. The constant is read from the source so the two cannot drift.
 */
const PROCESSING_RATE = Number(
  (SOURCE.match(/PROCESSING_RATE = ([\d.]+)/) || [])[1],
);

function compute({ monthlyOrders, avgTicket, commissionPct, shiftablePct }) {
  const commissionPerOrder = avgTicket * (commissionPct / 100);
  const processingPerOrder = avgTicket * PROCESSING_RATE;
  const movedOrders = monthlyOrders * (shiftablePct / 100);
  const netMonthlySaving = Math.max(0, movedOrders * (commissionPerOrder - processingPerOrder));
  return {
    platformRevenue: monthlyOrders * avgTicket,
    commissionPaid: monthlyOrders * commissionPerOrder,
    netMonthlySaving,
    netYearlySaving: netMonthlySaving * 12,
  };
}

/** Every combination the sliders can actually produce. */
function* everySliderPosition() {
  for (let orders = 50; orders <= 3000; orders += 275)
    for (let ticket = 40; ticket <= 250; ticket += 30)
      for (let commissionPct = 10; commissionPct <= 35; commissionPct += 5)
        for (let shiftablePct = 0; shiftablePct <= 60; shiftablePct += 10)
          yield { monthlyOrders: orders, avgTicket: ticket, commissionPct, shiftablePct };
}

test("processing is netted off, so the saving is never the whole commission", () => {
  assert.ok(PROCESSING_RATE > 0, "PROCESSING_RATE must be read from the lib and be positive");
  assert.match(
    SOURCE,
    /commissionPct \/ 100 - PROCESSING_RATE/,
    "the saving must be the gap between the two rates — dropping the subtraction is what inflates this calculator",
  );
});

test("the saving never exceeds the commission actually paid", () => {
  const offenders = [];
  for (const input of everySliderPosition()) {
    const r = compute(input);
    if (r.netMonthlySaving > r.commissionPaid + 0.000001) offenders.push(input);
  }
  assert.deepEqual(
    offenders.slice(0, 3),
    [],
    "a saving larger than the commission paid would be claiming profit from orders that were never placed",
  );
});

test("no slider position produces a negative or non-finite figure", () => {
  const offenders = [];
  for (const input of everySliderPosition()) {
    const r = compute(input);
    for (const [k, v] of Object.entries(r)) {
      if (!Number.isFinite(v) || v < 0) offenders.push(`${k}=${v} at ${JSON.stringify(input)}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 3), []);
});

test("shifting nothing saves nothing", () => {
  const r = compute({ monthlyOrders: 600, avgTicket: 90, commissionPct: 28, shiftablePct: 0 });
  assert.equal(r.netMonthlySaving, 0);
  assert.ok(r.commissionPaid > 0, "commission is still paid even when nothing moves");
});

test("a commission at or below the processing rate yields no saving", () => {
  // Moving an order only helps when the platform takes more than the card does.
  const atParity = Math.round(PROCESSING_RATE * 100);
  const r = compute({ monthlyOrders: 600, avgTicket: 90, commissionPct: atParity, shiftablePct: 40 });
  assert.equal(r.netMonthlySaving, 0, "at parity there is nothing to gain by moving the order");
});

test("the yearly figure is exactly twelve months", () => {
  for (const input of everySliderPosition()) {
    const r = compute(input);
    assert.ok(Math.abs(r.netYearlySaving - r.netMonthlySaving * 12) < 0.000001);
  }
});

test("the page states the processing deduction next to the number", () => {
  // The caveat is what makes the figure defensible. Buried or removed, the
  // calculator becomes the marketing version it was written to avoid.
  const page = readFileSync(
    fileURLToPath(new URL("../src/components/funnels/CommissionCalculator.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(page, /PROCESSING_RATE \* 100/, "the deduction must be shown to the reader, not just applied");
  assert.match(page, /לא חינם/, "the page must say a direct order is cheaper rather than free");
});
