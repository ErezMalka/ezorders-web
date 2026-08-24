// Pricing engine unit tests. Run with Node's built-in type stripping so the TS
// source is imported directly, no build step.  npm test
//
// These tests exist because src/lib/pricing.ts is the only place a price is
// produced — the public calculator and the agent portal both read it. A silent
// change here reprices live quotes, so the rules are pinned rather than trusted.
//
// The independent-oracle test at the bottom is the important one: it re-derives
// every total from PRICING_CONFIG by a different route and compares. A typo in
// computeQuote that still "looks right" fails there.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRICING_CONFIG,
  getDiscount,
  nextTier,
  amountToNextTier,
  buildInitialState,
  sanitizeState,
  computeQuote,
  selectedLines,
  groupOf,
  isDiscountableGroup,
  withMoney,
  allPricingItems,
} from "../src/lib/pricing.ts";

// ── helpers ──────────────────────────────────────────────────
/** Build a calculator state from `{id: qty}`; qty defaults to 1. */
function pick(spec) {
  const state = buildInitialState();
  for (const [id, qty] of Object.entries(spec)) state[id] = { enabled: true, qty: qty ?? 1 };
  return state;
}

// ── discount tiers ───────────────────────────────────────────
test("discount tiers use STRICT greater-than at every boundary", () => {
  // Landing exactly on a threshold earns the tier BELOW it. This is the single
  // most breakable rule in the file — >= instead of > silently reprices every
  // package that lands on a round number.
  assert.equal(getDiscount(599), 0);
  assert.equal(getDiscount(600), 0);
  assert.equal(getDiscount(601), 20);

  assert.equal(getDiscount(1000), 20);
  assert.equal(getDiscount(1001), 25);

  assert.equal(getDiscount(1500), 25);
  assert.equal(getDiscount(1501), 30);

  assert.equal(getDiscount(2000), 30);
  assert.equal(getDiscount(2001), 40);
});

test("an empty package earns no discount", () => {
  assert.equal(getDiscount(0), 0);
});

test("the top tier is 40% and nothing exceeds it", () => {
  assert.equal(getDiscount(50_000), 40);
  const max = Math.max(...PRICING_CONFIG.discountTiers.map((t) => t.pct));
  assert.equal(max, 40);
});

test("tiers are declared in descending threshold order", () => {
  // getDiscount returns the FIRST match, so a mis-ordered list would hand out
  // the wrong tier without any other test noticing.
  const thresholds = PRICING_CONFIG.discountTiers.map((t) => t.threshold);
  assert.deepEqual(thresholds, [...thresholds].sort((a, b) => b - a));
});

// ── next-tier nudge ──────────────────────────────────────────
test("nextTier points at the next threshold up, and the gap reaches it", () => {
  const tier = nextTier(1850);
  assert.equal(tier.threshold, 2000);
  assert.equal(tier.pct, 40);

  const gap = amountToNextTier(1850, tier);
  assert.equal(gap, 151);
  // Crossing the gap must actually earn the advertised tier.
  assert.equal(getDiscount(1850 + gap), 40);
});

test("nextTier is undefined once the top tier is earned", () => {
  assert.equal(nextTier(2001), undefined);
});

test("the advertised gap always earns the advertised tier", () => {
  for (let eligible = 0; eligible <= 2500; eligible += 7) {
    const tier = nextTier(eligible);
    if (!tier) continue;
    assert.equal(
      getDiscount(eligible + amountToNextTier(eligible, tier)),
      tier.pct,
      `gap from ${eligible} did not reach ${tier.pct}%`
    );
  }
});

// ── initial state ────────────────────────────────────────────
test("a fresh state has every component off at quantity 1", () => {
  const state = buildInitialState();
  const items = allPricingItems();
  assert.equal(Object.keys(state).length, items.length);
  for (const item of items) {
    assert.equal(state[item.id].enabled, false);
    assert.equal(state[item.id].qty, 1);
  }
});

test("the mandatory setup is charged even when nothing is selected", () => {
  const totals = computeQuote(buildInitialState());
  assert.equal(totals.finalSetupTotal, 1950);
  assert.equal(totals.finalMonthlyTotal, 0);
  assert.equal(totals.hasAnyEnabled, false);
});

// ── worked example ───────────────────────────────────────────
test("worked example: 3 POS + website + loyalty", () => {
  const totals = computeQuote(pick({ pos: 3, website: 1, loyalty: 1 }));

  // monthly eligible = 350*3 + 450 + 350 = 1850  ->  >1500  ->  30%
  assert.equal(totals.eligibleMonthlySubtotal, 1850);
  assert.equal(totals.discountPct, 30);
  assert.equal(totals.discountAmt, 555);
  assert.equal(totals.eligibleAfterDiscount, 1295);
  assert.equal(totals.nonDiscountableMonthly, 0);
  assert.equal(totals.finalMonthlyTotal, 1295);

  // setup = 1950 base + 490*3 POS + 490 website + 0 loyalty = 3910
  assert.equal(totals.finalSetupTotal, 3910);
});

// ── what the discount does and does not touch ────────────────
test("excluded add-ons never raise the tier and are never discounted", () => {
  // 3D Secure is ₪79/mo. On its own it must earn nothing.
  const alone = computeQuote(pick({ secure3d: 1 }));
  assert.equal(alone.eligibleMonthlySubtotal, 0);
  assert.equal(alone.discountPct, 0);
  assert.equal(alone.nonDiscountableMonthly, 79);
  assert.equal(alone.finalMonthlyTotal, 79);

  // Added to a discounted package it must pass through at full price.
  const base = computeQuote(pick({ pos: 3, website: 1, loyalty: 1 }));
  const withAddon = computeQuote(pick({ pos: 3, website: 1, loyalty: 1, secure3d: 1 }));
  assert.equal(withAddon.eligibleMonthlySubtotal, base.eligibleMonthlySubtotal);
  assert.equal(withAddon.discountPct, base.discountPct);
  assert.equal(withAddon.finalMonthlyTotal, base.finalMonthlyTotal + 79);
});

test("the branded app is charged in full and never raises the tier", () => {
  const base = computeQuote(pick({ pos: 2 }));
  const withApp = computeQuote(pick({ pos: 2, app: 1 }));
  assert.equal(withApp.eligibleMonthlySubtotal, base.eligibleMonthlySubtotal);
  assert.equal(withApp.finalMonthlyTotal, base.finalMonthlyTotal + 190);
  assert.equal(withApp.finalSetupTotal, base.finalSetupTotal + 4900);
});

test("included add-ons DO raise the tier", () => {
  // 2 POS = 700 eligible -> 20%. Adding loyalty (+350) reaches 1050 -> 25%.
  const without = computeQuote(pick({ pos: 2 }));
  assert.equal(without.eligibleMonthlySubtotal, 700);
  assert.equal(without.discountPct, 20);

  const withLoyalty = computeQuote(pick({ pos: 2, loyalty: 1 }));
  assert.equal(withLoyalty.eligibleMonthlySubtotal, 1050);
  assert.equal(withLoyalty.discountPct, 25);
});

test("group membership matches the discount rule", () => {
  assert.equal(groupOf("pos"), "core");
  assert.equal(groupOf("loyalty"), "addon_included");
  assert.equal(groupOf("secure3d"), "addon_excluded");
  assert.equal(groupOf("app"), "mobile_app");
  assert.equal(groupOf("nope"), undefined);

  assert.equal(isDiscountableGroup("core"), true);
  assert.equal(isDiscountableGroup("addon_included"), true);
  assert.equal(isDiscountableGroup("addon_excluded"), false);
  assert.equal(isDiscountableGroup("mobile_app"), false);
});

// ── quantities ───────────────────────────────────────────────
test("quantity multiplies both setup and monthly", () => {
  const one = computeQuote(pick({ pos: 1 }));
  const five = computeQuote(pick({ pos: 5 }));
  assert.equal(five.eligibleMonthlySubtotal, one.eligibleMonthlySubtotal * 5);
  assert.equal(five.finalSetupTotal - 1950, (one.finalSetupTotal - 1950) * 5);
});

// ── sanitize ─────────────────────────────────────────────────
test("sanitizeState clamps quantities into the configured range", () => {
  const state = sanitizeState({ pos: { enabled: true, qty: 999 }, kiosk: { enabled: true, qty: 0 } });
  assert.equal(state.pos.qty, 20); // maxQty
  assert.equal(state.kiosk.qty, 1); // floor
});

test("sanitizeState drops unknown components and junk input", () => {
  const state = sanitizeState({ hackerman: { enabled: true, qty: 5 }, pos: "nope" });
  assert.equal(state.hackerman, undefined);
  assert.equal(state.pos.enabled, false);

  for (const junk of [null, undefined, 42, "x", []]) {
    assert.deepEqual(sanitizeState(junk), buildInitialState());
  }
});

test("sanitizeState treats only a literal true as enabled", () => {
  const state = sanitizeState({ pos: { enabled: "yes", qty: 2 } });
  assert.equal(state.pos.enabled, false);
});

test("a sanitized hostile payload cannot beat the honest price", () => {
  // The client sends state, not money. Even a doctored payload has to price
  // through the same config.
  const hostile = sanitizeState({ pos: { enabled: true, qty: 1e9 } });
  assert.equal(hostile.pos.qty, 20);
  assert.equal(computeQuote(hostile).eligibleMonthlySubtotal, 350 * 20);
});

// ── selected lines ───────────────────────────────────────────
test("selectedLines returns only enabled components, with correct totals", () => {
  const lines = selectedLines(pick({ pos: 2, secure3d: 1 }));
  assert.equal(lines.length, 2);

  const pos = lines.find((l) => l.componentKey === "pos");
  assert.equal(pos.qty, 2);
  assert.equal(pos.setupTotal, 980);
  assert.equal(pos.monthlyTotal, 700);
  assert.equal(pos.discountable, true);

  const tds = lines.find((l) => l.componentKey === "secure3d");
  assert.equal(tds.discountable, false);
  assert.ok(tds.txNote.includes("0.90"));
});

test("line monthly totals reconcile with the computed subtotals", () => {
  const state = pick({ pos: 4, kiosk: 2, website: 1, ezwallet: 1, applepay: 1, app: 1 });
  const lines = selectedLines(state);
  const totals = computeQuote(state);

  const eligible = lines.filter((l) => l.discountable).reduce((s, l) => s + l.monthlyTotal, 0);
  const nonEligible = lines.filter((l) => !l.discountable).reduce((s, l) => s + l.monthlyTotal, 0);
  const setup = lines.reduce((s, l) => s + l.setupTotal, 0) + PRICING_CONFIG.initialSetup.setup;

  assert.equal(eligible, totals.eligibleMonthlySubtotal);
  assert.equal(nonEligible, totals.nonDiscountableMonthly);
  assert.equal(setup, totals.finalSetupTotal);
});

// ── VAT & contract value ─────────────────────────────────────
test("withMoney applies VAT and derives the contract value", () => {
  const totals = computeQuote(pick({ pos: 3, website: 1, loyalty: 1 })); // 3910 setup / 1295 monthly
  const money = withMoney(totals, 18, 24);

  assert.equal(money.setupVat, 3910 * 0.18);
  assert.equal(money.setupInclVat, 3910 * 1.18);
  assert.equal(money.monthlyInclVat, 1295 * 1.18);
  assert.equal(money.contractValue, 3910 + 1295 * 24);
  assert.equal(money.annualSaving, 555 * 12);
});

test("zero VAT leaves the totals untouched", () => {
  const money = withMoney(computeQuote(pick({ pos: 1 })), 0, 12);
  assert.equal(money.setupInclVat, money.finalSetupTotal);
  assert.equal(money.monthlyInclVat, money.finalMonthlyTotal);
});

// ── independent oracle ───────────────────────────────────────
test("computeQuote matches an independently derived oracle over 500 packages", () => {
  // A second implementation written from the config by a different route. If
  // computeQuote is edited into something subtly wrong, this is what catches it.
  const oracle = (calc) => {
    let setup = PRICING_CONFIG.initialSetup.setup;
    let eligible = 0;
    let nonEligible = 0;

    for (const item of allPricingItems()) {
      const s = calc[item.id];
      if (!s?.enabled) continue;
      setup += item.setup * s.qty;
      const monthly = item.monthly * s.qty;
      if (isDiscountableGroup(groupOf(item.id))) eligible += monthly;
      else nonEligible += monthly;
    }

    let pct = 0;
    for (const t of PRICING_CONFIG.discountTiers) {
      if (eligible > t.threshold) {
        pct = t.pct;
        break;
      }
    }
    const amt = Math.round((eligible * pct) / 100);
    return { setup, eligible, pct, amt, monthly: eligible - amt + nonEligible };
  };

  // Deterministic pseudo-random sweep — a failure is always reproducible.
  let seed = 20260816;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const items = allPricingItems();
  for (let i = 0; i < 500; i++) {
    const calc = buildInitialState();
    for (const item of items) {
      calc[item.id] = { enabled: rnd() < 0.5, qty: 1 + Math.floor(rnd() * item.maxQty) };
    }

    const got = computeQuote(calc);
    const want = oracle(calc);
    const shape = JSON.stringify(
      Object.fromEntries(Object.entries(calc).filter(([, v]) => v.enabled).map(([k, v]) => [k, v.qty]))
    );

    assert.equal(got.finalSetupTotal, want.setup, `setup mismatch for ${shape}`);
    assert.equal(got.eligibleMonthlySubtotal, want.eligible, `eligible mismatch for ${shape}`);
    assert.equal(got.discountPct, want.pct, `pct mismatch for ${shape}`);
    assert.equal(got.discountAmt, want.amt, `discount mismatch for ${shape}`);
    assert.equal(got.finalMonthlyTotal, want.monthly, `monthly mismatch for ${shape}`);
  }
});

test("totals are internally consistent for every package", () => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const items = allPricingItems();

  for (let i = 0; i < 200; i++) {
    const calc = buildInitialState();
    for (const item of items) {
      calc[item.id] = { enabled: rnd() < 0.5, qty: 1 + Math.floor(rnd() * item.maxQty) };
    }
    const t = computeQuote(calc);

    assert.equal(t.eligibleAfterDiscount, t.eligibleMonthlySubtotal - t.discountAmt);
    assert.equal(t.finalMonthlyTotal, t.eligibleAfterDiscount + t.nonDiscountableMonthly);
    assert.equal(
      t.finalSetupTotal,
      t.initialSetupAmt + t.productSetupSubtotal + t.addonSetupSubtotal + t.appSetup
    );
    assert.ok(t.discountAmt >= 0 && t.discountAmt <= t.eligibleMonthlySubtotal);
    assert.ok(t.finalMonthlyTotal >= 0);
    assert.ok(t.finalSetupTotal >= PRICING_CONFIG.initialSetup.setup);
  }
});
