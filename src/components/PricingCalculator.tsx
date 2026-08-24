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
}

function ProductRow({ id, label, note, txNote, setup, monthly, maxQty, icon, state, onChange }: ProductRowProps) {
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
              state.enabled ? "bg-white text-brand-pink" : "bg-slate-100 text-slate-400"
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
              aria-label="הפחת כמות"
              className={`h-8 w-8 rounded-md transition-colors sm:h-7 sm:w-7 ${
                state.enabled && state.qty > 1
                  ? "bg-white text-brand-pink hover:bg-brand-pink hover:text-white"
                  : "cursor-not-allowed bg-slate-100 text-slate-300"
              }`}
            >
              <Icon name="minus" className="mx-auto h-3.5 w-3.5" />
            </button>
            <span className={`w-6 text-center text-sm font-bold sm:w-8 ${state.enabled ? "text-brand-dark" : "text-slate-400"}`}>
              {state.qty}
            </span>
            <button
              type="button"
              onClick={() => onChange(id, { qty: Math.min(maxQty, state.qty + 1) })}
              disabled={!state.enabled || state.qty >= maxQty}
              aria-label="הוסף כמות"
              className={`h-8 w-8 rounded-md transition-colors sm:h-7 sm:w-7 ${
                state.enabled && state.qty < maxQty
                  ? "bg-white text-brand-pink hover:bg-brand-pink hover:text-white"
                  : "cursor-not-allowed bg-slate-100 text-slate-300"
              }`}
            >
              <Icon name="plus" className="mx-auto h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 sm:flex-none sm:w-24 sm:flex-shrink-0" />
        )}

        <div className="w-16 flex-shrink-0 text-center sm:w-20">
          <p className="text-xs text-brand-muted">הקמה</p>
          <p className={`text-sm font-semibold ${state.enabled ? "text-brand-dark" : "text-slate-400"}`}>
            {setup === 0 ? <span className="text-xs font-bold text-emerald-500">חינם</span> : fmt(setup)}
          </p>
        </div>

        <div className="w-24 flex-shrink-0 text-center sm:w-28">
          <p className="text-xs text-brand-muted">חודשי</p>
          <p className={`text-sm font-bold ${state.enabled ? "text-brand-pink" : "text-slate-400"}`}>
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
            <p>אימות ניתן להפעלה רק מעל עסקאות של ₪{PRICING_CONFIG.auth3dsThreshold} ומעלה</p>
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
        <span className="rounded-pill border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
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
          muted ? "text-slate-400" : discount ? "font-semibold text-emerald-600" : highlight ? "font-bold text-brand-dark" : "text-brand-muted"
        }`}
      >
        {label}
      </span>
      <div className="text-left">
        <span
          className={`text-sm font-semibold ${
            discount ? "text-emerald-600" : muted ? "text-slate-400" : highlight ? "text-base font-bold text-brand-pink" : "text-brand-dark"
          }`}
        >
          {value}
        </span>
        {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
      </div>
    </div>
  );
}

// ============================================================
//  PricingCalculator
// ============================================================
export function PricingCalculator({ catalogue = DEFAULT_CATALOGUE }: { catalogue?: Catalogue }) {
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
  const coreProducts = itemsInGroup("core", catalogue);
  const addonsIncluded = itemsInGroup("addon_included", catalogue);
  const addonsExcluded = itemsInGroup("addon_excluded", catalogue);
  const hardware = itemsInGroup("hardware", catalogue);
  const mobileApp = itemsInGroup("mobile_app", catalogue)[0];

  const appState = mobileApp ? calc[mobileApp.id] : undefined;

  const generateQuoteText = () => {
    const lines: string[] = ["=== הצעת מחיר EzOrders ===", ""];
    lines.push(`הקמה ראשונית: ${fmt(initialSetupAmt)}`);
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
        lines.push(`${p.label} × ${s.qty}: הקמה ${fmt(p.setup * s.qty)}, חודשי ${fmt(p.monthly * s.qty)}`);
      }
      lines.push("");
    };
    addSection("מוצרים ראשיים", coreProducts);
    addSection("תוספות כלולות בהנחה", addonsIncluded);
    addSection("תוספות לא כלולות בהנחה", addonsExcluded);
    addSection("מוצרים וחומרה", hardware);
    if (mobileApp && appState?.enabled) {
      lines.push("--- אפליקציה ---");
      lines.push(
        `${mobileApp.label}: הקמה ${fmt(mobileApp.setup)}, חודשי ${fmt(mobileApp.monthly)}`
      );
      lines.push("");
    }
    lines.push("=== סיכום ===");
    lines.push(`סה״כ הקמה: ${fmt(finalSetupTotal)}`);
    if (hardwareTotal > 0) lines.push(`מוצרים וחומרה: ${fmt(hardwareTotal)}`);
    lines.push(`חודשי זכאי לפני הנחה: ${fmt(eligibleMonthlySubtotal)}`);
    if (discountPct > 0) {
      lines.push(`הנחה ${discountPct}%: -${fmt(discountAmt)}`);
      lines.push(`חודשי זכאי לאחר הנחה: ${fmt(eligibleAfterDiscount)}`);
    }
    if (nonDiscountableMonthly > 0) {
      lines.push(`חודשי לא מוזל: +${fmt(nonDiscountableMonthly)}`);
    }
    lines.push(`סה״כ חודשי: ${fmt(finalMonthlyTotal)}`);
    if (discountAmt > 0) lines.push(`חיסכון חודשי: ${fmt(discountAmt)}`);
    lines.push("");
    lines.push("* המחיר מתייחס לסניף בודד — ברשת, כל סניף מחויב בנפרד.");
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
    <section dir="rtl" className="mx-auto max-w-container px-6">
      {/* Heading */}
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pink">
          מחירון
        </span>
        <h1 className="text-4xl font-bold leading-tight text-brand-dark md:text-5xl">בנו את החבילה שלכם</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-muted">
          סמנו את המוצרים שמתאימים למסעדה שלכם וראו את המחיר בזמן אמת — ככל שמוסיפים יותר, ההנחה החודשית גדלה, עד 40%.
        </p>
        <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-brand-tint px-4 py-2 text-sm font-medium text-brand-pink">
          החישוב מתייחס לסניף בודד — ברשת עם מספר סניפים, כל סניף מחויב ומחושב בנפרד.
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
                  <p className="text-sm font-bold text-brand-dark">{BASE_SETUP_LABEL}</p>
                  <p className="text-xs text-brand-muted">חד פעמי — נכלל תמיד בכל חבילה</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-brand-muted">הקמה</p>
                  <p className="text-sm font-bold text-brand-dark">{fmt(catalogue.baseSetup)}</p>
                </div>
                <span className="rounded-pill border border-slate-200 bg-brand-grey px-3 py-1 text-xs font-semibold text-brand-muted">
                  נכלל תמיד
                </span>
              </div>
            </div>
          </div>

          {/* Core products */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="מוצרים ראשיים" subtitle="כלולים בחישוב ההנחה החודשית" badge="כולל הנחה" />
            <div className="space-y-2.5">
              {coreProducts.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} />
              ))}
            </div>
          </div>

          {/* Add-ons included */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="תוספות — כלולות בהנחה" subtitle="נכללות בחישוב ההנחה החודשית" badge="כולל הנחה" />
            <div className="space-y-2.5">
              {addonsIncluded.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} />
              ))}
            </div>
          </div>

          {/* Add-ons excluded */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="תוספות — לא כלולות בהנחה" subtitle="מחויבות במחיר קבוע ללא הנחה" />
            <div className="space-y-2.5">
              {addonsExcluded.map((p) => (
                <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} />
              ))}
            </div>
          </div>

          {/* Mobile app */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="אפליקציה ממותגת" subtitle="מחוץ לכל ההנחות — הקמה וחודשי במחיר מלא" />
            {mobileApp ? <ProductRow {...mobileApp} state={calc[mobileApp.id]} onChange={update} /> : null}
          </div>

          {/* Hardware. Rendered only when there is any, so a software-only price
              list does not grow an empty heading. */}
          {hardware.length > 0 ? (
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader title="מוצרים וחומרה" subtitle="תשלום חד־פעמי — לא נכנס לחישוב ההנחה" />
              <div className="space-y-2.5">
                {hardware.map((p) => (
                  <ProductRow key={p.id} {...p} state={calc[p.id]} onChange={update} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Discount tiers explainer */}
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="מדרגות הנחה חודשית" subtitle="ההנחה מחושבת על הסכום החודשי הזכאי בלבד" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...PRICING_CONFIG.discountTiers].reverse().map((t) => {
                const active = discountPct === t.pct && eligibleMonthlySubtotal > t.threshold;
                return (
                  <div
                    key={t.threshold}
                    className={`rounded-2xl border p-3 text-center transition-all ${
                      active ? "border-brand-pink bg-brand-tint shadow-sm" : "border-slate-200 bg-brand-grey"
                    }`}
                  >
                    <p className={`text-xl font-bold ${active ? "text-brand-pink" : "text-brand-dark"}`}>{t.pct}%</p>
                    <p className="mt-0.5 text-xs text-brand-muted">מעל {fmt(t.threshold)} לחודש</p>
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
              <h2 className="text-base font-bold text-brand-dark">סיכום הצעה</h2>
            </div>

            {!hasAnyEnabled ? (
              <p className="py-6 text-center text-sm text-brand-muted">סמנו מוצרים כדי לראות את החישוב</p>
            ) : (
              <div>
                <SummaryRow label="הקמה ראשונית" value={fmt(initialSetupAmt)} />
                {productSetupSubtotal + addonSetupSubtotal + appSetup > 0 ? (
                  <SummaryRow label="הקמת מוצרים ותוספות" value={fmt(productSetupSubtotal + addonSetupSubtotal + appSetup)} />
                ) : null}
                <SummaryRow label="סה״כ הקמה (חד פעמי)" value={fmt(finalSetupTotal)} divider highlight />
                {hardwareTotal > 0 ? (
                  <SummaryRow label="מוצרים וחומרה (חד פעמי)" value={fmt(hardwareTotal)} highlight />
                ) : null}

                <div className="mt-4" />
                <SummaryRow label="חודשי זכאי להנחה" value={fmt(eligibleMonthlySubtotal)} />
                {discountPct > 0 ? (
                  <SummaryRow label={`הנחה ${discountPct}%`} value={`-${fmt(discountAmt)}`} discount />
                ) : null}
                {nonDiscountableMonthly > 0 ? (
                  <SummaryRow label="רכיבים ללא הנחה" value={`+${fmt(nonDiscountableMonthly)}`} muted />
                ) : null}
                <SummaryRow label="סה״כ חודשי" value={fmt(finalMonthlyTotal)} divider highlight />

                {discountAmt > 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <Icon name="percent" className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <p className="text-xs font-semibold text-emerald-700">
                      חיסכון של {fmt(discountAmt)} בכל חודש ({fmt(discountAmt * 12)} בשנה)
                    </p>
                  </div>
                ) : null}

                {nextTier && eligibleMonthlySubtotal > 0 ? (
                  <p className="mt-3 text-center text-xs text-brand-muted">
                    עוד {fmt(amountToNextTier(eligibleMonthlySubtotal, nextTier))} בחודשי הזכאי — ותעלו להנחת {nextTier.pct}%
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
                איפוס
              </button>
              <button
                type="button"
                onClick={copyQuote}
                disabled={!hasAnyEnabled}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-brand-pink px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="copy" className="h-3.5 w-3.5" />
                {copied ? "הועתק!" : "העתק הצעה"}
              </button>
            </div>

            <a
              href="/he/contact"
              className="mt-3 block rounded-pill border border-brand-pink px-3 py-2 text-center text-sm font-semibold text-brand-pink transition-colors hover:bg-brand-tint"
            >
              דברו איתנו על ההצעה
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
