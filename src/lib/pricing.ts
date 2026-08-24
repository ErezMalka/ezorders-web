/**
 * EZOrders pricing — the single source of truth.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The public price calculator (/he/price) and the agent portal (/he/agent) must
 * quote the same number for the same package. Before this module the config and
 * the arithmetic lived inside PricingCalculator.tsx, so anything else that
 * needed a price had to re-implement it — and a re-implementation drifts the
 * first time someone edits one copy and not the other. That drift is invisible
 * until a customer holds a PDF that disagrees with the website.
 *
 * So: every price, every rule, and every total is computed here. UI components
 * render what `computeQuote` returns; they never do arithmetic of their own.
 *
 * THE MODEL
 * ---------
 * A quote is a subscription package, not a basket of goods:
 *
 *   - a ONE-TIME setup charge  (mandatory base + per-component setup fees)
 *   - a RECURRING monthly charge
 *
 * The volume discount applies to the monthly charge only, and only to the
 * components flagged discountable — core products and "included" add-ons. The
 * excluded add-ons (BIT, Apple Pay, 3D Secure) and the branded mobile app are
 * always billed at full price and never raise the discount tier.
 *
 * Prices are pre-VAT throughout. VAT is a presentation concern and is applied by
 * the caller, because the rate belongs to the quote (it is stored per quote so a
 * historical document keeps the rate that was in force when it was issued).
 */

// ============================================================
//  PRICING CONFIG — all monetary values live here
// ============================================================
export const PRICING_CONFIG = {
  initialSetup: { id: "initial", label: "הקמת מערכת ראשונית", setup: 1950 },

  coreProducts: [
    { id: "pos", label: "קופה (POS)", note: "המחיר פר קופה", setup: 490, monthly: 350, maxQty: 20, icon: "pos" },
    { id: "website", label: "אתר אינטרנט", note: "המחיר פר סניף", setup: 490, monthly: 450, maxQty: 1, icon: "globe" },
    { id: "kiosk", label: "קיוסק", note: "המחיר פר עמדה", setup: 490, monthly: 350, maxQty: 10, icon: "kiosk" },
  ],

  addonsIncluded: [
    { id: "loyalty", label: "מועדון לקוחות", note: "פר סניף", setup: 0, monthly: 350, maxQty: 1, icon: "users" },
    { id: "ezwallet", label: "EzWallet", note: "", setup: 0, monthly: 150, maxQty: 1, icon: "wallet" },
    { id: "feedback", label: "מודול פידבק", note: "", setup: 0, monthly: 150, maxQty: 1, icon: "chat" },
  ],

  addonsExcluded: [
    { id: "bit", label: "תשלומי BIT", setup: 95, monthly: 25, maxQty: 1, icon: "card", txNote: "" },
    { id: "applepay", label: "Apple Pay / Google Pay", setup: 95, monthly: 50, maxQty: 1, icon: "card", txNote: "" },
    {
      id: "secure3d",
      label: "3D Secure",
      setup: 350,
      monthly: 79,
      maxQty: 1,
      icon: "shield",
      txNote: "+ ₪0.90 לעסקה מאומתת (לא כלול בסה״כ)",
    },
  ],

  mobileApp: { id: "app", label: "אפליקציה ממותגת", setup: 4900, monthly: 190, maxQty: 1, icon: "phone" },

  auth3dsThreshold: 150,

  discountTiers: [
    { threshold: 2000, pct: 40 },
    { threshold: 1500, pct: 30 },
    { threshold: 1000, pct: 25 },
    { threshold: 600, pct: 20 },
  ],
} as const;

// ============================================================
//  Types
// ============================================================
export interface ItemState {
  enabled: boolean;
  qty: number;
}
export type CalcState = Record<string, ItemState>;

/** A priceable component, in the shape the config declares it. */
export interface PricingItem {
  id: string;
  label: string;
  note?: string;
  txNote?: string;
  setup: number;
  monthly: number;
  maxQty: number;
  icon: string;
}

/**
 * Which section of the calculator a component belongs to. This is persisted on
 * every saved quote line, so a stored quote can be re-rendered exactly as it was
 * presented even if the component later moves between groups.
 */
export type ItemGroup =
  | "core"
  | "addon_included"
  | "addon_excluded"
  | "mobile_app"
  /**
   * Physical goods: a screen, a printer, a cash drawer. One-time like setup but
   * not setup — nobody installs a cash drawer — so it is charged and presented
   * separately, and it never feeds the discount tier. See supabase 0008.
   */
  | "hardware";

export const GROUP_LABELS: Record<ItemGroup, string> = {
  core: "מוצרים ראשיים",
  addon_included: "תוספות כלולות בהנחה",
  addon_excluded: "תוספות ללא הנחה",
  mobile_app: "אפליקציה",
  hardware: "מוצרים וחומרה",
};

// ============================================================
//  The catalogue
// ============================================================
/**
 * A priceable component together with the group it sells in.
 *
 * PRICING_CONFIG above is the DEFAULT catalogue, not the only one. An admin can
 * edit the real list from /he/agent/products, which lives in public.products —
 * so every function below takes a catalogue and falls back to the file.
 *
 * The fallback is load-bearing rather than defensive. The marketing site is
 * built to work with no Supabase configuration at all, and /he/price must keep
 * rendering prices when the database is unreachable: a price list that goes
 * blank during an outage is worse than one that is briefly out of date.
 */
export interface CatalogueItem extends PricingItem {
  group: ItemGroup;
}

export interface Catalogue {
  /** The mandatory one-time charge, before any component. */
  baseSetup: number;
  /** Every sellable component, in display order. */
  items: CatalogueItem[];
}

const withGroup = (items: readonly unknown[], group: ItemGroup): CatalogueItem[] =>
  (items as PricingItem[]).map((item) => ({ ...item, group }));

/** The catalogue as shipped in this file. Used when the database has nothing to say. */
export const DEFAULT_CATALOGUE: Catalogue = {
  baseSetup: PRICING_CONFIG.initialSetup.setup,
  items: [
    ...withGroup(PRICING_CONFIG.coreProducts, "core"),
    ...withGroup(PRICING_CONFIG.addonsIncluded, "addon_included"),
    ...withGroup(PRICING_CONFIG.addonsExcluded, "addon_excluded"),
    ...withGroup([PRICING_CONFIG.mobileApp], "mobile_app"),
  ],
};

/** The components of one group, in the order the catalogue lists them. */
export function itemsInGroup(group: ItemGroup, catalogue: Catalogue = DEFAULT_CATALOGUE): CatalogueItem[] {
  return catalogue.items.filter((item) => item.group === group);
}

/** The label for the mandatory base charge. Not a catalogue item: it has no quantity. */
export const BASE_SETUP_LABEL = PRICING_CONFIG.initialSetup.label;

/** Discountable groups feed the tier threshold; the others never do. */
export const DISCOUNTABLE_GROUPS: readonly ItemGroup[] = ["core", "addon_included"];

export function isDiscountableGroup(group: ItemGroup): boolean {
  return DISCOUNTABLE_GROUPS.includes(group);
}

// ============================================================
//  Formatting
// ============================================================
/** Whole shekels, Hebrew digit grouping. Matches the figures shown on /he/price. */
export function fmt(n: number): string {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Shekels with agorot — used where an exact figure matters, e.g. VAT lines. */
export function fmtExact(n: number): string {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
//  Discount tiers
// ============================================================
/**
 * The tier for a given eligible monthly subtotal.
 *
 * STRICT greater-than, deliberately: exactly 600 earns no discount, exactly 1000
 * earns 20%, exactly 1500 earns 25%, exactly 2000 earns 30%. Changing this to >=
 * silently reprices every package that lands on a boundary, so if you ever mean
 * to change it, change the tests in the same commit.
 */
export function getDiscount(eligible: number): number {
  for (const tier of PRICING_CONFIG.discountTiers) {
    if (eligible > tier.threshold) return tier.pct;
  }
  return 0;
}

/**
 * The next tier the customer has not reached yet, for the "add X more and you
 * reach Y%" nudge. Returns undefined once the top tier is earned.
 */
export function nextTier(eligible: number): { threshold: number; pct: number } | undefined {
  return [...PRICING_CONFIG.discountTiers].reverse().find((t) => eligible <= t.threshold);
}

/** Extra eligible monthly spend needed to reach `tier`. */
export function amountToNextTier(eligible: number, tier: { threshold: number }): number {
  return tier.threshold + 1 - eligible;
}

// ============================================================
//  State helpers
// ============================================================
/** Every priceable component, in display order. */
export function allPricingItems(catalogue: Catalogue = DEFAULT_CATALOGUE): CatalogueItem[] {
  return catalogue.items;
}

/** A fresh calculator state: nothing selected, every quantity at 1. */
export function buildInitialState(catalogue: Catalogue = DEFAULT_CATALOGUE): CalcState {
  const state: CalcState = {};
  for (const p of catalogue.items) state[p.id] = { enabled: false, qty: 1 };
  return state;
}

/** The group a component id belongs to, or undefined if the id is unknown. */
export function groupOf(id: string, catalogue: Catalogue = DEFAULT_CATALOGUE): ItemGroup | undefined {
  return catalogue.items.find((item) => item.id === id)?.group;
}

/**
 * Clamp a calculator state to what the config allows: unknown ids are dropped
 * and quantities are pulled into 1..maxQty. Anything arriving from a request
 * body or a stored row goes through this before it is priced.
 */
export function sanitizeState(input: unknown, catalogue: Catalogue = DEFAULT_CATALOGUE): CalcState {
  const state = buildInitialState(catalogue);
  if (!input || typeof input !== "object") return state;
  const raw = input as Record<string, unknown>;

  for (const item of catalogue.items) {
    const entry = raw[item.id];
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { enabled?: unknown; qty?: unknown };
    const qty = Number(e.qty);
    state[item.id] = {
      enabled: e.enabled === true,
      qty: Number.isFinite(qty) ? Math.min(item.maxQty, Math.max(1, Math.floor(qty))) : 1,
    };
  }
  return state;
}

// ============================================================
//  Selected lines
// ============================================================
export interface SelectedLine {
  componentKey: string;
  group: ItemGroup;
  label: string;
  note: string;
  txNote: string;
  qty: number;
  setupUnit: number;
  monthlyUnit: number;
  setupTotal: number;
  monthlyTotal: number;
  discountable: boolean;
}

/**
 * The enabled components, expanded with per-line totals. The mandatory initial
 * setup is NOT a line here — it has no quantity and no monthly component, and
 * every consumer renders it separately.
 */
export function selectedLines(calc: CalcState, catalogue: Catalogue = DEFAULT_CATALOGUE): SelectedLine[] {
  const lines: SelectedLine[] = [];

  for (const item of catalogue.items) {
    const state = calc[item.id];
    if (!state?.enabled) continue;
    const qty = state.qty;
    const group = item.group;
    lines.push({
      componentKey: item.id,
      group,
      label: item.label,
      note: item.note ?? "",
      txNote: item.txNote ?? "",
      qty,
      setupUnit: item.setup,
      monthlyUnit: item.monthly,
      setupTotal: item.setup * qty,
      monthlyTotal: item.monthly * qty,
      discountable: isDiscountableGroup(group),
    });
  }

  return lines;
}

// ============================================================
//  Totals
// ============================================================
export interface QuoteTotals {
  /** Mandatory base setup, always charged. */
  initialSetupAmt: number;
  /** Setup fees from the core products only. */
  productSetupSubtotal: number;
  /** Setup fees from every add-on, included and excluded alike. */
  addonSetupSubtotal: number;
  /** Setup fee for the branded app, 0 when it is not selected. */
  appSetup: number;
  /** Everything above — the one-time SERVICES charge. Hardware is not in here. */
  finalSetupTotal: number;

  /**
   * Physical goods, one-time. Kept apart from finalSetupTotal so the document
   * can show what is being installed and what is being bought as two different
   * things, and so a monitor never looks like an installation fee.
   */
  hardwareTotal: number;
  /** finalSetupTotal + hardwareTotal: everything paid once, up front. */
  oneTimeTotal: number;

  /** Monthly charge from discountable components, before the discount. */
  eligibleMonthlySubtotal: number;
  /** The tier earned by `eligibleMonthlySubtotal`: 0, 20, 25, 30 or 40. */
  discountPct: number;
  /** Shekels off the monthly charge, rounded to the nearest whole shekel. */
  discountAmt: number;
  /** `eligibleMonthlySubtotal` less `discountAmt`. */
  eligibleAfterDiscount: number;
  /** Monthly charge from components the discount never touches. */
  nonDiscountableMonthly: number;
  /** The recurring charge the customer actually pays. */
  finalMonthlyTotal: number;

  /** True when at least one optional component is selected. */
  hasAnyEnabled: boolean;
}

/**
 * Price a package. This is the only place these numbers are produced.
 *
 * The discount is rounded to whole shekels (`Math.round`) rather than carried at
 * full precision, because that is the figure the customer is shown and the one
 * that must reconcile against the monthly total on the PDF.
 */
export function computeQuote(calc: CalcState, catalogue: Catalogue = DEFAULT_CATALOGUE): QuoteTotals {
  const inGroups = (...groups: ItemGroup[]) =>
    catalogue.items.filter((item) => groups.includes(item.group));

  const setupOf = (items: readonly { id: string; setup: number }[]) =>
    items.reduce((acc, p) => {
      const s = calc[p.id];
      return s?.enabled ? acc + p.setup * s.qty : acc;
    }, 0);

  const monthlyOf = (items: readonly { id: string; monthly: number }[]) =>
    items.reduce((acc, p) => {
      const s = calc[p.id];
      return s?.enabled ? acc + p.monthly * s.qty : acc;
    }, 0);

  const initialSetupAmt = catalogue.baseSetup;
  const productSetupSubtotal = setupOf(inGroups("core"));
  const addonSetupSubtotal = setupOf(inGroups("addon_included", "addon_excluded"));
  const appSetup = setupOf(inGroups("mobile_app"));
  const appMonthly = monthlyOf(inGroups("mobile_app"));

  const finalSetupTotal = initialSetupAmt + productSetupSubtotal + addonSetupSubtotal + appSetup;

  // Physical goods. Never discountable, never recurring: a monthly charge on an
  // object is a rental, which is a different product and a different contract.
  const hardwareTotal = setupOf(inGroups("hardware"));

  const eligibleMonthlySubtotal = monthlyOf(inGroups("core", "addon_included"));
  const discountPct = getDiscount(eligibleMonthlySubtotal);
  const discountAmt = Math.round((eligibleMonthlySubtotal * discountPct) / 100);
  const eligibleAfterDiscount = eligibleMonthlySubtotal - discountAmt;
  const nonDiscountableMonthly = monthlyOf(inGroups("addon_excluded")) + appMonthly;
  const finalMonthlyTotal = eligibleAfterDiscount + nonDiscountableMonthly;

  return {
    initialSetupAmt,
    productSetupSubtotal,
    addonSetupSubtotal,
    appSetup,
    finalSetupTotal,
    hardwareTotal,
    oneTimeTotal: finalSetupTotal + hardwareTotal,
    eligibleMonthlySubtotal,
    discountPct,
    discountAmt,
    eligibleAfterDiscount,
    nonDiscountableMonthly,
    finalMonthlyTotal,
    hasAnyEnabled: Object.values(calc).some((s) => s.enabled),
  };
}

// ============================================================
//  VAT & contract value
// ============================================================
export interface QuoteMoney extends QuoteTotals {
  vatPercent: number;
  setupVat: number;
  setupInclVat: number;
  hardwareVat: number;
  hardwareInclVat: number;
  /** Setup and hardware together, with VAT — what is actually invoiced up front. */
  oneTimeInclVat: number;
  monthlyVat: number;
  monthlyInclVat: number;
  /** Setup plus `termMonths` of the recurring charge, pre-VAT. */
  contractValue: number;
  termMonths: number;
  /** Discount saved over twelve months, pre-VAT. */
  annualSaving: number;
}

export function withMoney(totals: QuoteTotals, vatPercent: number, termMonths: number): QuoteMoney {
  const setupVat = (totals.finalSetupTotal * vatPercent) / 100;
  const hardwareVat = (totals.hardwareTotal * vatPercent) / 100;
  const monthlyVat = (totals.finalMonthlyTotal * vatPercent) / 100;
  return {
    ...totals,
    vatPercent,
    termMonths,
    setupVat,
    setupInclVat: totals.finalSetupTotal + setupVat,
    hardwareVat,
    hardwareInclVat: totals.hardwareTotal + hardwareVat,
    oneTimeInclVat: totals.oneTimeTotal + setupVat + hardwareVat,
    monthlyVat,
    monthlyInclVat: totals.finalMonthlyTotal + monthlyVat,
    // Hardware is part of what the customer commits to, so it belongs in the
    // contract value even though it never touches the discount.
    contractValue: totals.oneTimeTotal + totals.finalMonthlyTotal * termMonths,
    annualSaving: totals.discountAmt * 12,
  };
}

/** Default VAT rate for new quotes. Stored per quote, so changing it is not retroactive. */
export const DEFAULT_VAT_PERCENT = 18;

/** Default commitment length, in months. */
export const DEFAULT_TERM_MONTHS = 12;

/** How long a new quote stays valid, in days. */
export const DEFAULT_VALID_DAYS = 14;
