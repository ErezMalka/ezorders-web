// KDS and CDS: ₪250 setup, ₪150/month, discountable and counting toward the
// volume tier.
//
// These sit in a file that is the fallback for a database table, so the two can
// drift — and a drift here means /he/price and an agent's quote name different
// numbers for the same package, which is the failure the pricing module was
// written to prevent. The numbers are pinned because they were specified, not
// derived: nothing else in the codebase can tell you they are wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pricing = readFileSync(fileURLToPath(new URL("../src/lib/pricing.ts", import.meta.url)), "utf8");
const calculator = readFileSync(
  fileURLToPath(new URL("../src/components/PricingCalculator.tsx", import.meta.url)),
  "utf8",
);

/** The addonsIncluded block, which is the discountable add-on group. */
const includedBlock = pricing.match(/addonsIncluded: \[([\s\S]*?)\n  \]/)[1];

function item(id) {
  const line = includedBlock.split("\n").find((l) => l.includes(`id: "${id}"`));
  if (!line) return null;
  const num = (k) => Number((line.match(new RegExp(`${k}: (\\d+)`)) || [])[1]);
  return {
    label: (line.match(/label: "([^"]+)"/) || [])[1],
    setup: num("setup"),
    monthly: num("monthly"),
    maxQty: num("maxQty"),
    icon: (line.match(/icon: "([^"]+)"/) || [])[1],
  };
}

for (const [id, name] of [["kds", "KDS"], ["cds", "CDS"]]) {
  test(`${name} is priced at the agreed ₪250 setup and ₪150 a month`, () => {
    const it = item(id);
    assert.ok(it, `${id} must exist in addonsIncluded`);
    assert.equal(it.setup, 250);
    assert.equal(it.monthly, 150);
  });

  test(`${name} is discountable and raises the tier`, () => {
    // addon_included is in DISCOUNTABLE_GROUPS; core would be too, but core
    // also feeds the public AggregateOffer and would drop its floor to ₪150.
    assert.ok(item(id), `${id} must be in addonsIncluded, not addonsExcluded`);
    assert.match(
      pricing,
      /DISCOUNTABLE_GROUPS: readonly ItemGroup\[\] = \["core", "addon_included"\]/,
      "addon_included must stay discountable, or these two silently start billing at full price",
    );
  });

  test(`${name} has an icon the calculator can actually draw`, () => {
    // A missing key renders an empty <svg> instead of throwing, so the row
    // looks broken and nothing reports it.
    const icon = item(id).icon;
    assert.match(
      calculator,
      new RegExp(`\\n\\s*${icon}: <path`),
      `PricingCalculator needs a path for the "${icon}" icon`,
    );
  });
}

test("the two screens stay out of the public AggregateOffer", () => {
  // product-schema.ts reads coreProducts alone to build lowPrice/highPrice.
  // Moving either screen into core would advertise a ₪150 floor on the product
  // pages, which is not what the core products cost.
  const coreBlock = pricing.match(/coreProducts: \[([\s\S]*?)\n  \]/)[1];
  for (const id of ["kds", "cds"]) {
    assert.doesNotMatch(coreBlock, new RegExp(`id: "${id}"`), `${id} belongs in addonsIncluded, not core`);
  }
});

test("setup fees are never discounted, only the monthly is", () => {
  // Stated so the pinned ₪250 cannot be misread as a discountable figure.
  assert.match(
    pricing,
    /The volume discount applies to the monthly charge only/,
    "the module must keep documenting that the discount is monthly-only",
  );
});
