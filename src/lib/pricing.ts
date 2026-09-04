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
 * components flagged discountable — core products, "included" add-ons and the
 * platform integrations. The excluded add-ons (BIT, Apple Pay, 3D Secure) and
 * the branded mobile app are always billed at full price and never raise the
 * discount tier.
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
    // The two screens sell as add-ons rather than core products: neither stands
    // alone, since a KDS shows orders a POS took and a CDS faces the customer
    // at one. addon_included is discountable and counts toward the tier
    // threshold, which is what "נכלל בהנחות כמו היתר במדרגות" asks for —
    // and it keeps them out of the AggregateOffer on /he/pos, which reads
    // coreProducts alone and would otherwise advertise a ₪150 floor price.
    { id: "kds", label: "מסך מטבח (KDS)", note: "המחיר פר מסך", setup: 250, monthly: 150, maxQty: 10, icon: "kds" },
    { id: "cds", label: "מסך לקוח (CDS)", note: "המחיר פר עמדה", setup: 250, monthly: 150, maxQty: 20, icon: "cds" },
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

  /**
   * Interfaces to the platforms the restaurant already sells on. Priced per
   * platform, ₪95 to connect and ₪85 a month to keep running, and discountable
   * like the core products — a business on four platforms is a bigger customer
   * than one on none, and the tier should say so.
   */
  integrations: [
    { id: "tenbis", label: "תן ביס", note: "ממשק הזמנות", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
    { id: "cibus", label: "סיבוס", note: "ממשק תשלום", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
    { id: "mishloha", label: "משלוחה", note: "ממשק הזמנות", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
    { id: "wolt", label: "וולט", note: "ממשק הזמנות", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
    { id: "wolt_drive", label: "וולט דרייב", note: "ממשק שליחויות", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
    { id: "haat", label: "האאט", note: "ממשק הזמנות", setup: 95, monthly: 85, maxQty: 1, icon: "integration" },
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
  /**
   * The agent's price for this line, per unit, when it differs from the
   * catalogue. Absent means "the list price". See PriceOverrides.
   */
  setupUnit?: number;
  monthlyUnit?: number;
}
export type CalcState = Record<string, ItemState>;

/**
 * What an agent changed by hand on a quote.
 *
 * The catalogue is still the price list; this is the deal. Every figure here is
 * optional and absent means "as listed" — so a quote with no overrides prices
 * exactly as it always did, and one with overrides says precisely which
 * numbers were a person's decision. That distinction is what the audit trail
 * and the manager's alert are built on, so it is kept explicit rather than
 * baked into the catalogue the quote was priced from.
 */
export interface PriceOverrides {
  /** Replaces the mandatory base setup fee. */
  baseSetup?: number;
  /** Replaces the tier discount. 0 is a valid override (no discount). */
  discountPct?: number;
}

/** The largest figure an agent may type. A typo with one zero too many is caught here. */
export const MAX_OVERRIDE_PRICE = 100_000;

/** A finite, non-negative shekel figure, rounded to whole shekels; undefined otherwise. */
export function cleanPrice(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_OVERRIDE_PRICE) return undefined;
  return Math.round(n);
}

/** Sanitise overrides from a request body or a stored row. Unknown keys are dropped. */
export function sanitizeOverrides(input: unknown): PriceOverrides {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: PriceOverrides = {};
  const base = cleanPrice(raw.baseSetup);
  if (base !== undefined) out.baseSetup = base;
  const pct = Number(raw.discountPct);
  if (raw.discountPct !== null && raw.discountPct !== undefined && raw.discountPct !== "" &&
      Number.isFinite(pct) && pct >= 0 && pct <= 100) {
    out.discountPct = Math.round(pct * 100) / 100;
  }
  return out;
}

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
  /**
   * Interfaces to the platforms a restaurant already sells on — Wolt, Tenbis,
   * Cibus and the rest. A department of its own rather than more add-ons: these
   * are bought one per platform the business is actually on, so an agent needs
   * to see them as a block, and the count varies far more between customers
   * than the add-ons do. Discountable, like core and the included add-ons.
   */
  | "integrations"
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
  integrations: "ממשקים ואינטגרציות",
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
  /** English name, from products.label_en (0027). Null = not translated; the site falls back to label. */
  labelEn?: string | null;
  noteEn?: string | null;
  /** Who makes it. Carried so a long hardware list can be filtered; never priced on. */
  supplier?: string | null;
  /** What kind of thing it is. Merchandising — item_group is what decides the money. */
  category?: string | null;
  /** Site-relative path to a photo. Fourteen kiosk models are one sentence apart in name. */
  image?: string | null;
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
    ...withGroup(PRICING_CONFIG.integrations, "integrations"),
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
export const DISCOUNTABLE_GROUPS: readonly ItemGroup[] = ["core", "addon_included", "integrations"];

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
    const e = entry as { enabled?: unknown; qty?: unknown; setupUnit?: unknown; monthlyUnit?: unknown };
    const qty = Number(e.qty);
    const next: ItemState = {
      enabled: e.enabled === true,
      qty: Number.isFinite(qty) ? Math.min(item.maxQty, Math.max(1, Math.floor(qty))) : 1,
    };
    // An override equal to the list price is not an override. Dropping it here
    // means "agent typed the same number back" leaves no trace, which is right.
    const setupUnit = cleanPrice(e.setupUnit);
    if (setupUnit !== undefined && setupUnit !== item.setup) next.setupUnit = setupUnit;
    const monthlyUnit = cleanPrice(e.monthlyUnit);
    if (monthlyUnit !== undefined && monthlyUnit !== item.monthly) next.monthlyUnit = monthlyUnit;
    state[item.id] = next;
  }
  return state;
}

/** The unit prices a line is priced at: the agent's if set, the catalogue's otherwise. */
export function unitPrices(item: CatalogueItem, state: ItemState | undefined): { setup: number; monthly: number } {
  return {
    setup: state?.setupUnit ?? item.setup,
    monthly: state?.monthlyUnit ?? item.monthly,
  };
}

/** True when anything on this quote departs from the price list. */
export function hasPriceOverrides(calc: CalcState, overrides: PriceOverrides = {}): boolean {
  if (overrides.baseSetup !== undefined || overrides.discountPct !== undefined) return true;
  return Object.values(calc).some(
    (s) => s.enabled && (s.setupUnit !== undefined || s.monthlyUnit !== undefined)
  );
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
  /** Frozen with the line: what the customer was shown, not what the catalogue holds today. */
  image: string | null;
  qty: number;
  /** What the line is priced at — the agent's figure when there is one. */
  setupUnit: number;
  monthlyUnit: number;
  /** What the catalogue said on the day. Equal to the above unless overridden. */
  listSetupUnit: number;
  listMonthlyUnit: number;
  priceOverridden: boolean;
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
    const unit = unitPrices(item, state);
    lines.push({
      componentKey: item.id,
      group,
      label: item.label,
      note: item.note ?? "",
      txNote: item.txNote ?? "",
      qty,
      image: item.image ?? null,
      setupUnit: unit.setup,
      monthlyUnit: unit.monthly,
      listSetupUnit: item.setup,
      listMonthlyUnit: item.monthly,
      priceOverridden: unit.setup !== item.setup || unit.monthly !== item.monthly,
      setupTotal: unit.setup * qty,
      monthlyTotal: unit.monthly * qty,
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
  /** The discount applied: the agent's override when there is one, else the tier. */
  discountPct: number;
  /** The tier `eligibleMonthlySubtotal` earns on its own: 0, 20, 25, 30 or 40. */
  listDiscountPct: number;
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
  /** True when any figure on this package was set by hand rather than by the list. */
  priceOverridden: boolean;
}

/**
 * Price a package. This is the only place these numbers are produced.
 *
 * The discount is rounded to whole shekels (`Math.round`) rather than carried at
 * full precision, because that is the figure the customer is shown and the one
 * that must reconcile against the monthly total on the PDF.
 */
export function computeQuote(
  calc: CalcState,
  catalogue: Catalogue = DEFAULT_CATALOGUE,
  overrides: PriceOverrides = {}
): QuoteTotals {
  const inGroups = (...groups: ItemGroup[]) =>
    catalogue.items.filter((item) => groups.includes(item.group));

  const setupOf = (items: readonly CatalogueItem[]) =>
    items.reduce((acc, p) => {
      const s = calc[p.id];
      return s?.enabled ? acc + unitPrices(p, s).setup * s.qty : acc;
    }, 0);

  const monthlyOf = (items: readonly CatalogueItem[]) =>
    items.reduce((acc, p) => {
      const s = calc[p.id];
      return s?.enabled ? acc + unitPrices(p, s).monthly * s.qty : acc;
    }, 0);

  const initialSetupAmt = overrides.baseSetup ?? catalogue.baseSetup;
  const productSetupSubtotal = setupOf(inGroups("core"));
  // Everything that carries a setup fee and is not a core product, an app or
  // hardware. Listed by exclusion rather than by name: spelling the groups out
  // here is what made a new group silently free to install — adding
  // "integrations" to the catalogue and to DISCOUNTABLE_GROUPS left this line
  // still summing the two it happened to name, and six ₪95 fees vanished from
  // every quote that included them.
  const addonSetupSubtotal = setupOf(
    catalogue.items.filter(
      (item) => !(["core", "mobile_app", "hardware"] as ItemGroup[]).includes(item.group),
    ),
  );
  const appSetup = setupOf(inGroups("mobile_app"));
  const appMonthly = monthlyOf(inGroups("mobile_app"));

  const finalSetupTotal = initialSetupAmt + productSetupSubtotal + addonSetupSubtotal + appSetup;

  // Physical goods. Never discountable, never recurring: a monthly charge on an
  // object is a rental, which is a different product and a different contract.
  const hardwareTotal = setupOf(inGroups("hardware"));

  // Read from DISCOUNTABLE_GROUPS rather than naming the groups again. The
  // constant is what isDiscountableGroup answers with, so repeating the list
  // here meant a group could be discountable everywhere except in the one
  // function that decides the money.
  const eligibleMonthlySubtotal = monthlyOf(inGroups(...DISCOUNTABLE_GROUPS));
  const listDiscountPct = getDiscount(eligibleMonthlySubtotal);
  const discountPct = overrides.discountPct ?? listDiscountPct;
  const discountAmt = Math.round((eligibleMonthlySubtotal * discountPct) / 100);
  const eligibleAfterDiscount = eligibleMonthlySubtotal - discountAmt;
  // The complement of the discountable set, minus the two groups accounted for
  // separately: hardware never recurs, and the app is added back as appMonthly.
  const nonDiscountableMonthly =
    monthlyOf(
      catalogue.items.filter(
        (item) =>
          !isDiscountableGroup(item.group) &&
          !(["mobile_app", "hardware"] as ItemGroup[]).includes(item.group),
      ),
    ) + appMonthly;
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
    listDiscountPct,
    discountAmt,
    eligibleAfterDiscount,
    nonDiscountableMonthly,
    finalMonthlyTotal,
    hasAnyEnabled: Object.values(calc).some((s) => s.enabled),
    priceOverridden: hasPriceOverrides(calc, overrides),
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
