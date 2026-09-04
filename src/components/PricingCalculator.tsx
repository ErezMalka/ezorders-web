"use client";

import { useCallback, useState } from "react";

import {
  BASE_SETUP_LABEL,
  DEFAULT_CATALOGUE,
  PRICING_CONFIG,
  buildInitialState,
  computeQuote,
  itemsInGroup,
  type Catalogue,
  fmt,
  nextTier as nextTierFor,
  amountToNextTier,
  type CalcState,
  type ItemState,
} from "@/lib/pricing";

// ============================================================
//  Strings — the calculator renders under /he and /en
// ============================================================
export type CalcLocale = "he" | "en";

const STRINGS = {
  he: {
    badge: "מחירון",
    title: "בנו את החבילה שלכם",
    lead: "סמנו את המוצרים שמתאימים למסעדה שלכם וראו את המחיר בזמן אמת. ככל שמוסיפים יותר, ההנחה החודשית גדלה —",
    leadHighlight: "עד 40% הנחה",
    perBranch: "החישוב מתייחס לסניף בודד — ברשת עם מספר סניפים, כל סניף מחויב ומחושב בנפרד.",
    baseSetup: "הקמת מערכת ראשונית",
    baseSetupSub: "חד פעמי — נכלל תמיד בכל חבילה",
    setup: "הקמה",
    monthly: "חודשי",
    free: "חינם",
    alwaysIncluded: "נכלל תמיד",
    withDiscount: "כולל הנחה",
    core: "מוצרים ראשיים",
    coreSub: "כלולים בחישוב ההנחה החודשית",
    addonsIncluded: "תוספות — כלולות בהנחה",
    addonsIncludedSub: "נכללות בחישוב ההנחה החודשית",
    integrations: "ממשקים ואינטגרציות",
    integrationsSub: "חיבור לפלטפורמות שאתם כבר מוכרים בהן — מחיר פר פלטפורמה",
    addonsExcluded: "תוספות — לא כלולות בהנחה",
    addonsExcludedSub: "מחויבות במחיר קבוע ללא הנחה",
    app: "אפליקציה ממותגת",
    appSub: "מחוץ לכל ההנחות — הקמה וחודשי במחיר מלא",
    hardware: "מוצרים וחומרה",
    hardwareSub: "תשלום חד־פעמי — לא נכנס לחישוב ההנחה",
    tiers: "מדרגות הנחה חודשית",
    tiersSub: "ההנחה מחושבת על הסכום החודשי הזכאי בלבד",
    above: (amount: string) => `מעל ${amount} לחודש`,
    summary: "סיכום הצעה",
    pickSomething: "סמנו מוצרים כדי לראות את החישוב",
    initialSetup: "הקמה ראשונית",
    componentSetup: "הקמת מוצרים ותוספות",
    totalSetup: "סה״כ הקמה (חד פעמי)",
    hardwareOneTime: "מוצרים וחומרה (חד פעמי)",
    eligibleMonthly: "חודשי זכאי להנחה",
    discount: (pct: number) => `הנחה ${pct}%`,
    nonDiscountable: "רכיבים ללא הנחה",
    totalMonthly: "סה״כ חודשי",
    saving: (month: string, year: string) => `חיסכון של ${month} בכל חודש (${year} בשנה)`,
    nextTier: (amount: string, pct: number) => `עוד ${amount} בחודשי הזכאי — ותעלו להנחת ${pct}%`,
    reset: "איפוס",
    copy: "העתק הצעה",
    copied: "הועתק!",
    talk: "דברו איתנו על ההצעה",
    contactHref: "/he/contact",
    decrease: "הפחת כמות",
    increase: "הוסף כמות",
    threeDs: (threshold: number) => `אימות ניתן להפעלה רק מעל עסקאות של ₪${threshold} ומעלה`,
    // Plain-text quote (clipboard)
    q: {
      head: "=== הצעת מחיר EzOrders ===",
      initial: "הקמה ראשונית",
      line: (setup: string, monthly: string) => `הקמה ${setup}, חודשי ${monthly}`,
      addonsExcluded: "תוספות לא כלולות בהנחה",
      summary: "=== סיכום ===",
      totalSetup: "סה״כ הקמה",
      eligibleBefore: "חודשי זכאי לפני הנחה",
      eligibleAfter: "חודשי זכאי לאחר הנחה",
      nonDiscounted: "חודשי לא מוזל",
      totalMonthly: "סה״כ חודשי",
      saving: "חיסכון חודשי",
      footnote: "* המחיר מתייחס לסניף בודד — ברשת, כל סניף מחויב בנפרד.",
    },
  },
  en: {
    badge: "Pricing",
    title: "Build your package",
    lead: "Tick the products that fit your restaurant and watch the price update live. The more you add, the bigger the monthly discount —",
    leadHighlight: "up to 40% off",
    perBranch: "Prices are per location — a chain is billed and calculated separately for each branch.",
    baseSetup: "Initial system setup",
    baseSetupSub: "One-time — always included in every package",
    setup: "Setup",
    monthly: "Monthly",
    free: "Free",
    alwaysIncluded: "Always included",
    withDiscount: "Discountable",
    core: "Core products",
    coreSub: "Count toward the monthly discount",
    addonsIncluded: "Add-ons — discountable",
    addonsIncludedSub: "Count toward the monthly discount",
    integrations: "Platform integrations",
    integrationsSub: "Connect the platforms you already sell on — priced per platform",
    addonsExcluded: "Add-ons — not discounted",
    addonsExcludedSub: "Billed at a fixed price, no discount",
    app: "Branded mobile app",
    appSub: "Outside every discount — setup and monthly at full price",
    hardware: "Hardware",
    hardwareSub: "One-time payment — not part of the discount calculation",
    tiers: "Monthly discount tiers",
    tiersSub: "The discount applies to the eligible monthly amount only",
    above: (amount: string) => `Above ${amount} / month`,
    summary: "Quote summary",
    pickSomething: "Tick some products to see the numbers",
    initialSetup: "Initial setup",
    componentSetup: "Product & add-on setup",
    totalSetup: "Total setup (one-time)",
    hardwareOneTime: "Hardware (one-time)",
    eligibleMonthly: "Discountable monthly",
    discount: (pct: number) => `Discount ${pct}%`,
    nonDiscountable: "Non-discounted items",
    totalMonthly: "Total monthly",
    saving: (month: string, year: string) => `You save ${month} every month (${year} a year)`,
    nextTier: (amount: string, pct: number) => `Add ${amount} of discountable monthly to reach the ${pct}% tier`,
    reset: "Reset",
    copy: "Copy quote",
    copied: "Copied!",
    talk: "Talk to us about this quote",
    contactHref: "/en/contact",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    threeDs: (threshold: number) => `Authentication can be enabled only for transactions of ₪${threshold} and above`,
    q: {
      head: "=== EzOrders quote ===",
      initial: "Initial setup",
      line: (setup: string, monthly: string) => `setup ${setup}, monthly ${monthly}`,
      addonsExcluded: "Add-ons — not discounted",
      summary: "=== Summary ===",
      totalSetup: "Total setup",
      eligibleBefore: "Discountable monthly before discount",
      eligibleAfter: "Discountable monthly after discount",
      nonDiscounted: "Non-discounted monthly",
      totalMonthly: "Total monthly",
      saving: "Monthly saving",
      footnote: "* Prices are per location — a chain is billed separately for each branch.",
    },
  },
} as const;
type Strings = (typeof STRINGS)[CalcLocale];

/**
 * The catalogue's labels are Hebrew — they are written by an admin in
 * /he/agent/products, and the database has one label column. English names
 * for the software products live here, keyed by product key; anything without
 * one keeps its Hebrew label. Hardware has no English names at all (they are
 * Israeli-supplied kiosks and printers sold with installation), so /en/price
 * does not show it.
 */
const EN_LABELS: Record<string, { label: string; note?: string; txNote?: string }> = {
  pos: { label: "Point of sale (POS)", note: "per till" },
  website: { label: "Ordering website", note: "per branch" },
  kiosk: { label: "Self-service kiosk", note: "per station" },
  loyalty: { label: "Loyalty club", note: "per branch" },
  ezwallet: { label: "EzWallet" },
  feedback: { label: "Feedback module" },
  kds: { label: "Kitchen display (KDS)", note: "per screen" },
  cds: { label: "Customer display (CDS)", note: "per station" },
  bit: { label: "Bit payments" },
  applepay: { label: "Apple Pay / Google Pay" },
  secure3d: { label: "3D Secure", txNote: "+ ₪0.90 per authenticated transaction (not included in the total)" },
  tenbis: { label: "Tenbis", note: "ordering interface" },
  cibus: { label: "Cibus", note: "payment interface" },
  mishloha: { label: "Mishloha", note: "ordering interface" },
  wolt: { label: "Wolt", note: "ordering interface" },
  wolt_drive: { label: "Wolt Drive", note: "delivery interface" },
  haat: { label: "HAAT", note: "ordering interface" },
  app: { label: "Branded mobile app" },
};

function localizeItem<
  T extends { id: string; label: string; note?: string; txNote?: string; labelEn?: string | null; noteEn?: string | null },
>(item: T, locale: CalcLocale): T {
  if (locale === "he") return item;
  // The database's English name (products.label_en, 0027) wins; the map below
  // is the fallback for a catalogue read that predates it or a shipped list.
  const en = EN_LABELS[item.id];
  const label = item.labelEn || en?.label || item.label;
  const note = item.labelEn ? item.noteEn ?? "" : en?.note ?? item.note ?? "";
  const txNote = item.txNote ? en?.txNote ?? item.txNote : item.txNote;
  return { ...item, label, note, txNote };
}

// ============================================================
//  Inline icons (no external deps)
// ============================================================
const BRAND_ICONS: Record<string, string> = {
  pos: "Pos",
  globe: "WEB",
  kiosk: "Kiosk",
  users: "Loyalty",
  wallet: "Wallet",
  chat: "Feedbacks",
  card: "Payment_Terminal",
  shield: "Payment_Terminal",
  settings: "Settings",
};

function Icon({ name, className }: { name: string; className?: string }) {
  const brand = BRAND_ICONS[name];
  if (brand) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/icons/${brand}.svg`}
        alt=""
        aria-hidden="true"
        // Without this React preloads one <link> per brand icon on /price.
        // They sit inside the calculator, well below the fold.
        loading="lazy"
        className={`${className ?? ""} object-contain`}
      />
    );
  }
  const paths: Record<string, React.ReactNode> = {
    pos: <path d="M4 4h16v10H4zM8 18h8M12 14v4" />,
    globe: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3.5 3 14.5 0 18-3-3.5-3-14.5 0-18z" />,
    kiosk: <path d="M7 3h10v14H7zM10 21h4M12 17v4M10 7h4" />,
    users: <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 100-6M17 15c3 0 5 2 5 5" />,
    wallet: <path d="M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h12v4M16 13h2" />,
    chat: <path d="M4 5h16v11H9l-5 4V5zM8 9h8M8 12h5" />,
    card: <path d="M3 6h18v12H3zM3 10h18M6 15h4" />,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />,
    phone: <path d="M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2" />,
    // A missing key here renders an empty <svg> rather than throwing, so a new
    // catalogue item without an icon looks broken in a way nothing reports.
    // Kitchen display: a wall screen with a ticket queue on it.
    kds: <path d="M3 4h18v12H3zM3 20h18M8 8h8M8 12h5" />,
    // Customer display: a small screen on a stand, facing the other way.
    cds: <path d="M5 4h14v9H5zM12 13v5M8 21h8M9 8h6" />,
    // Two plugs meeting: one system connected to another.
    integration: <path d="M10 3v4M14 3v4M8 7h8v5a4 4 0 01-8 0zM12 16v5" />,
    settings: <path d="M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-1-3-2.2.3-1.5-1.5L16.5 4l-3-1-1 2h-2l-1-2-3 1 .2 2.8L5.2 8.3 3 8l-1 3 2 1-2 1 1 3 2.2-.3 1.5 1.5L6.5 20l3 1 1-2h2l1 2 3-1-.2-2.8 1.5-1.5 2.2.3 1-3-2-1z" />,
    info: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 8h.01M12 11v5" />,
    reset: <path d="M4 10a8 8 0 118 8M4 10V4m0 6h6" />,
    copy: <path d="M8 8h12v12H8zM8 8V4h12v12h-4" />,
    doc: <path d="M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h6" />,
    down: <path d="M6 9l6 6 6-6" />,
    up: <path d="M6 15l6-6 6 6" />,
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    percent: <path d="M19 5L5 19M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths.pos}
    </svg>
  );
}

// ============================================================
//  ProductRow
// ============================================================
interface ProductRowProps {
  id: string;
  label: string;
  note?: string;
  txNote?: string;
  setup: number;
  monthly: number;
  maxQty: number;
  icon: string;
  state: ItemState;
  onChange: (id: string, patch: Partial<ItemState>) => void;
  t: Strings;
}

function ProductRow({ id, label, note, txNote, setup, monthly, maxQty, icon, state, onChange, t }: ProductRowProps) {
  const totalMonthly = state.enabled ? monthly * state.qty : 0;

  return (
    <div className="space-y-1">
      <div
        className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 sm:flex-row sm:flex-wrap sm:items-center ${
          state.enabled
            ? "border-brand-pink/40 bg-brand-tint shadow-sm"
            : "border-slate-200 bg-white opacity-70 hover:opacity-100"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => onChange(id, { enabled: e.target.checked })}
            className="h-6 w-6 flex-shrink-0 cursor-pointer rounded accent-brand-pink"
            aria-label={label}
          />

          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
              state.enabled ? "bg-white text-brand-pink" : "bg-slate-100 text-slate-500"
            }`}
          >
            <Icon name={icon} className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${state.enabled ? "text-brand-dark" : "text-slate-500"}`}>{label}</p>
            {note ? <p className="text-xs text-brand-muted">{note}</p> : null}
          </div>
        </div>

        {/* flex-wrap on mobile: the stepper and both price columns are
            shrink-proof by design, and at 320px they summed past the row and
            pushed the page sideways. Wrapping costs a line instead. */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 sm:flex-nowrap sm:justify-end sm:gap-3 sm:border-0 sm:pt-0">
        {maxQty > 1 ? (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(id, { qty: Math.max(1, state.qty - 1) })}
              disabled={!state.enabled || state.qty <= 1}
              aria-label={t.decrease}
              className={`h-8 w-8 rounded-md transition-colors sm:h-7 sm:w-7 ${
                state.enabled && state.qty > 1
                  ? "bg-white text-brand-pink hover:bg-brand-pinkStrong hover:text-white"
                  : "cursor-not-allowed bg-slate-100 text-slate-500"
              }`}
            >
              <Icon name="minus" className="mx-auto h-3.5 w-3.5" />
            </button>
            <span className={`w-6 text-center text-sm font-bold sm:w-8 ${state.enabled ? "text-brand-dark" : "text-slate-500"}`}>
              {state.qty}
            </span>
            <button
              type="button"
              onClick={() => onChange(id, { qty: Math.min(maxQty, state.qty + 1) })}
              disabled={!state.enabled || state.qty >= maxQty}
              aria-label={t.increase}
              className={`h-8 w-8 rounded-md transition-colors sm:h-7 sm:w-7 ${
                state.enabled && state.qty < maxQty
                  ? "bg-white text-brand-pink hover:bg-brand-pinkStrong hover:text-white"
                  : "cursor-not-allowed bg-slate-100 text-slate-500"
              }`}
            >
              <Icon name="plus" className="mx-auto h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 sm:flex-none sm:w-24 sm:flex-shrink-0" />
        )}

        <div className="w-16 flex-shrink-0 text-center sm:w-20">
          <p className="text-xs text-brand-muted">{t.setup}</p>
          <p className={`text-sm font-semibold ${state.enabled ? "text-brand-dark" : "text-slate-500"}`}>
            {setup === 0 ? <span className="text-xs font-bold text-emerald-700">{t.free}</span> : fmt(setup)}
          </p>
        </div>

        <div className="w-24 flex-shrink-0 text-center sm:w-28">
          <p className="text-xs text-brand-muted">{t.monthly}</p>
          <p className={`text-sm font-bold ${state.enabled ? "text-brand-pinkInk" : "text-slate-500"}`}>
            {state.enabled && maxQty > 1 && state.qty > 1 ? (
              <>
                <span className="text-xs font-normal">
                  {fmt(monthly)} × {state.qty} ={" "}
                </span>
                {fmt(totalMonthly)}
              </>
            ) : (
              fmt(monthly)
            )}
          </p>
        </div>
        </div>
      </div>

      {txNote && state.enabled ? (
        <div className="mx-0.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          <div className="space-y-0.5 text-xs text-amber-700">
            <p>{txNote}</p>
            <p>{t.threeDs(PRICING_CONFIG.auth3dsThreshold)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
//  Section header
// ============================================================
function SectionHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-brand-dark">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p> : null}
      </div>
      {badge ? (
        <span className="rounded-pill border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

// ============================================================
//  Summary row
// ============================================================
function SummaryRow({
  label,
  value,
  sub,
  highlight,
  discount,
  muted,
  divider,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  discount?: boolean;
  muted?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between py-1.5 ${divider ? "mt-1 border-t border-slate-200 pt-2.5" : ""}`}>
      <span
        className={`text-sm ${
          muted ? "text-slate-500" : discount ? "font-semibold text-emerald-700" : highlight ? "font-bold text-brand-dark" : "text-brand-muted"
        }`}
      >
        {label}
      </span>
      <div className="text-end">
        <span
          className={`text-sm font-semibold ${
            discount ? "text-emerald-700" : muted ? "text-slate-500" : highlight ? "text-base font-bold text-brand-pink" : "text-brand-dark"
          }`}
        >
          {value}
        </span>
        {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

// ============================================================
//  PricingCalculator
// ============================================================
export function PricingCalculator({
  catalogue = DEFAULT_CATALOGUE,
  locale = "he",
}: {
  catalogue?: Catalogue;
  locale?: CalcLocale;
}) {
  const t = STRINGS[locale];
  const [calc, setCalc] = useState<CalcState>(() => buildInitialState(catalogue));
  const [copied, setCopied] = useState(false);

  const update = useCallback((id: string, patch: Partial<ItemState>) => {
    setCalc((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const reset = () => setCalc(buildInitialState(catalogue));

  // Every figure below comes from the shared engine in @/lib/pricing, so this
  // page and the agent portal can never disagree on a price.
  const {
    initialSetupAmt,
    productSetupSubtotal,
    addonSetupSubtotal,
    appSetup,
    finalSetupTotal,
    eligibleMonthlySubtotal,
    discountPct,
    discountAmt,
    eligibleAfterDiscount,
    nonDiscountableMonthly,
    finalMonthlyTotal,
    hardwareTotal,
    hasAnyEnabled,
  } = computeQuote(calc, catalogue);

  // Read from the catalogue rather than the config, so a group an admin empties
  // or fills is reflected here without a deploy.
  const group = (g: Parameters<typeof itemsInGroup>[0]) => itemsInGroup(g, catalogue).map((p) => localizeItem(p, locale));
  const coreProducts = group("core");
  const addonsIncluded = group("addon_included");
  const integrations = group("integrations");
  const addonsExcluded = group("addon_excluded");
  // See EN_LABELS: hardware has Hebrew names only.
  const hardware = locale === "he" ? group("hardware") : [];
  const mobileApp = group("mobile_app")[0];

  const appState = mobileApp ? calc[mobileApp.id] : undefined;

  const generateQuoteText = () => {
    const lines: string[] = [t.q.head, ""];
    lines.push(`${t.q.initial}: ${fmt(initialSetupAmt)}`);
    lines.push("");
    const addSection = (
      title: string,
      products: readonly { id: string; label: string; monthly: number; setup: number }[]
    ) => {
      const active = products.filter((p) => calc[p.id]?.enabled);
      if (active.length === 0) return;
      lines.push(`--- ${title} ---`);
      for (const p of active) {
        const s = calc[p.id];
        lines.push(`${p.label} × ${s.qty}: ${t.q.line(fmt(p.setup * s.qty), fmt(p.monthly * s.qty))}`);
      }
      lines.push("");
    };
    addSection(t.core, coreProducts);
    addSection(t.addonsIncluded, addonsIncluded);
    addSection(t.integrations, integrations);
    addSection(t.q.addonsExcluded, addonsExcluded);
    addSection(t.hardware, hardware);
    if (mobileApp && appState?.enabled) {
      lines.push(`--- ${t.app} ---`);
      lines.push(`${mobileApp.label}: ${t.q.line(fmt(mobileApp.setup), fmt(mobileApp.monthly))}`);
      lines.push("");
    }
    lines.push(t.q.summary);
    lines.push(`${t.q.totalSetup}: ${fmt(finalSetupTotal)}`);
    if (hardwareTotal > 0) lines.push(`${t.hardware}: ${fmt(hardwareTotal)}`);
    lines.push(`${t.q.eligibleBefore}: ${fmt(eligibleMonthlySubtotal)}`);
    if (discountPct > 0) {
      lines.push(`${t.discount(discountPct)}: -${fmt(discountAmt)}`);
      lines.push(`${t.q.eligibleAfter}: ${fmt(eligibleAfterDiscount)}`);
    }
    if (nonDiscountableMonthly > 0) {
      lines.push(`${t.q.nonDiscounted}: +${fmt(nonDiscountableMonthly)}`);
    }
    lines.push(`${t.q.totalMonthly}: ${fmt(finalMonthlyTotal)}`);
    if (discountAmt > 0) lines.push(`${t.q.saving}: ${fmt(discountAmt)}`);
    lines.push("");
    lines.push(t.q.footnote);
    return lines.join("\n");
  };

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(generateQuoteText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const nextTier = nextTierFor(eligibleMonthlySubtotal);

  return (
    <section dir={locale === "he" ? "rtl" : "ltr"} className="mx-auto max-w-container px-6">
      {/* Heading */}
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pinkInk">
          {t.badge}
        </span>
        <h1 className="text-4xl font-bold leading-tight text-brand-dark md:text-5xl">{t.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-muted">
          {t.lead}{" "}
          <strong className="inline-block whitespace-nowrap rounded-pill bg-brand-pinkStrong px-4 py-1 text-xl font-bold text-white align-middle">
            {t.leadHighlight}
          </strong>
        </p>
        <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-brand-tint px-4 py-2 text-sm font-medium text-brand-pinkInk">
          {t.perBranch}
        </p>
      </div>

      {/* items-start only once this is a row. In the mobile column layout the
          cross axis is the width, so items-start sized each card to its
          max-content (347px) inside a 312px viewport and pushed the page
          sideways. flex-1 controls the main axis, so it could not correct it. */}
      <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-start">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Initial setup */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-pink">
                  <Icon name="settings" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-dark">{locale === "he" ? BASE_SETUP_LABEL : t.baseSetup}</p>
                  <p className="text-xs text-brand-muted">{t.baseSetupSub}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-brand-muted">{t.setup}</p>
                  <p className="text-sm font-bold text-brand-dark">{fmt(catalogue.baseSetup)}</p>
                </div>
                <span className="rounded-pill border border-slate-200 bg-brand-grey px-3 py-1 text-xs font-semibold text-brand-muted">
                  {t.alwaysIncluded}
                </span>
              </div>
            </div>
          </div>

          {/* Core products */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title={t.core} subtitle={t.coreSub} badge={t.withDiscount} />
            <div className="space-y-2.5">
              {coreProducts.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} t={t} />
              ))}
            </div>
          </div>

          {/* Add-ons included */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title={t.addonsIncluded} subtitle={t.addonsIncludedSub} badge={t.withDiscount} />
            <div className="space-y-2.5">
              {addonsIncluded.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} t={t} />
              ))}
            </div>
          </div>

          {/* Platform integrations. Rendered only when the catalogue has any, so
              an empty heading never appears if they are switched off in admin. */}
          {integrations.length > 0 && (
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader
                title={t.integrations}
                subtitle={t.integrationsSub}
                badge={t.withDiscount}
              />
              <div className="space-y-2.5">
                {integrations.map((p) => (
                  <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* Add-ons excluded */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title={t.addonsExcluded} subtitle={t.addonsExcludedSub} />
            <div className="space-y-2.5">
              {addonsExcluded.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} t={t} />
              ))}
            </div>
          </div>

          {/* Mobile app */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title={t.app} subtitle={t.appSub} />
            {mobileApp ? <ProductRow {...mobileApp} state={calc[mobileApp.id]} onChange={update} t={t} /> : null}
          </div>

          {/* Hardware. Rendered only when there is any, so a software-only price
              list does not grow an empty heading. */}
          {hardware.length > 0 ? (
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader title={t.hardware} subtitle={t.hardwareSub} />
              <div className="space-y-2.5">
                {hardware.map((p) => (
                  <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} t={t} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Discount tiers explainer */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title={t.tiers} subtitle={t.tiersSub} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...PRICING_CONFIG.discountTiers].reverse().map((tier) => {
                const active = discountPct === tier.pct && eligibleMonthlySubtotal > tier.threshold;
                return (
                  <div
                    key={tier.threshold}
                    className={`rounded-2xl border p-3 text-center transition-all ${
                      active ? "border-brand-pink bg-brand-tint shadow-sm" : "border-slate-200 bg-brand-grey"
                    }`}
                  >
                    <p className={`text-xl font-bold ${active ? "text-brand-pink" : "text-brand-dark"}`}>{tier.pct}%</p>
                    <p className="mt-0.5 text-xs text-brand-muted">{t.above(fmt(tier.threshold))}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <aside className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-80">
          <div className="rounded-card border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-tint text-brand-pink">
                <Icon name="doc" className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-brand-dark">{t.summary}</h2>
            </div>

            {!hasAnyEnabled ? (
              <p className="py-6 text-center text-sm text-brand-muted">{t.pickSomething}</p>
            ) : (
              <div>
                <SummaryRow label={t.initialSetup} value={fmt(initialSetupAmt)} />
                {productSetupSubtotal + addonSetupSubtotal + appSetup > 0 ? (
                  <SummaryRow label={t.componentSetup} value={fmt(productSetupSubtotal + addonSetupSubtotal + appSetup)} />
                ) : null}
                <SummaryRow label={t.totalSetup} value={fmt(finalSetupTotal)} divider highlight />
                {hardwareTotal > 0 ? (
                  <SummaryRow label={t.hardwareOneTime} value={fmt(hardwareTotal)} highlight />
                ) : null}

                <div className="mt-4" />
                <SummaryRow label={t.eligibleMonthly} value={fmt(eligibleMonthlySubtotal)} />
                {discountPct > 0 ? (
                  <SummaryRow label={t.discount(discountPct)} value={`-${fmt(discountAmt)}`} discount />
                ) : null}
                {nonDiscountableMonthly > 0 ? (
                  <SummaryRow label={t.nonDiscountable} value={`+${fmt(nonDiscountableMonthly)}`} muted />
                ) : null}
                <SummaryRow label={t.totalMonthly} value={fmt(finalMonthlyTotal)} divider highlight />

                {discountAmt > 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <Icon name="percent" className="h-4 w-4 flex-shrink-0 text-emerald-700" />
                    <p className="text-xs font-semibold text-emerald-700">
                      {t.saving(fmt(discountAmt), fmt(discountAmt * 12))}
                    </p>
                  </div>
                ) : null}

                {nextTier && eligibleMonthlySubtotal > 0 ? (
                  <p className="mt-3 text-center text-xs text-brand-muted">
                    {t.nextTier(fmt(amountToNextTier(eligibleMonthlySubtotal, nextTier)), nextTier.pct)}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey"
              >
                <Icon name="reset" className="h-3.5 w-3.5" />
                {t.reset}
              </button>
              <button
                type="button"
                onClick={copyQuote}
                disabled={!hasAnyEnabled}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-brand-pinkStrong px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkInk disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="copy" className="h-3.5 w-3.5" />
                {copied ? t.copied : t.copy}
              </button>
            </div>

            <a
              href={t.contactHref}
              className="mt-3 block rounded-pill border border-brand-pink px-3 py-2 text-center text-sm font-semibold text-brand-pinkInk transition-colors hover:bg-brand-tint"
            >
              {t.talk}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
