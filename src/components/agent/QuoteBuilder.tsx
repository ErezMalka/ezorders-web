"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import {
  BASE_SETUP_LABEL,
  DEFAULT_CATALOGUE,
  DEFAULT_TERM_MONTHS,
  DEFAULT_VALID_DAYS,
  DEFAULT_VAT_PERCENT,
  PRICING_CONFIG,
  amountToNextTier,
  buildInitialState,
  computeQuote,
  fmt,
  itemsInGroup,
  nextTier,
  withMoney,
  type Catalogue,
  type CalcState,
  type ItemState,
  type PricingItem,
} from "@/lib/pricing";

/**
 * Build a package, capture the customer, create the quote.
 *
 * Every figure shown here comes from computeQuote in @/lib/pricing — the same
 * function behind /he/price. What gets POSTed is the SELECTION, never a price:
 * the server re-derives the money from the same config, so the totals on screen
 * are a preview and the server's answer is the real one. That means a tampered
 * request can order a different package but never buy the same one cheaper.
 */

interface Section {
  title: string;
  hint: string;
  items: readonly PricingItem[];
}

export function QuoteBuilder({ catalogue = DEFAULT_CATALOGUE }: { catalogue?: Catalogue }) {
  const router = useRouter();
  const [calc, setCalc] = useState<CalcState>(() => buildInitialState(catalogue));
  const [vatPercent, setVatPercent] = useState(DEFAULT_VAT_PERCENT);
  const [termMonths, setTermMonths] = useState(DEFAULT_TERM_MONTHS);
  const [validDays, setValidDays] = useState(DEFAULT_VALID_DAYS);
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState({ name: "", contact: "", phone: "", email: "", taxId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = useCallback((id: string, patch: Partial<ItemState>) => {
    setCalc((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const totals = computeQuote(calc, catalogue);
  const money = withMoney(totals, vatPercent, termMonths);
  const upcoming = nextTier(totals.eligibleMonthlySubtotal);

  // Built from the catalogue, so a product an admin adds appears here without a
  // deploy. Empty groups are dropped: an agent should not scroll past a heading
  // with nothing under it.
  const sections: Section[] = (
    [
      { title: "מוצרים ראשיים", hint: "נכללים בחישוב ההנחה", group: "core" },
      { title: "תוספות — כלולות בהנחה", hint: "מגדילות את מדרגת ההנחה", group: "addon_included" },
      { title: "תוספות — ללא הנחה", hint: "נוספות לסה״כ במלוא המחיר", group: "addon_excluded" },
      { title: "אפליקציה", hint: "ללא הנחה", group: "mobile_app" },
      { title: "מוצרים וחומרה", hint: "תשלום חד־פעמי, ללא הנחה", group: "hardware" },
    ] as const
  )
    .map((s) => ({ title: s.title, hint: s.hint, items: itemsInGroup(s.group, catalogue) }))
    .filter((s) => s.items.length > 0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!customer.name.trim()) {
      setError("נא להזין שם לקוח");
      return;
    }
    if (!totals.hasAnyEnabled) {
      setError("נא לבחור לפחות רכיב אחד להצעה");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/agent/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, calc, vatPercent, termMonths, validDays, notes }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "שמירת ההצעה נכשלה");
        setBusy(false);
        return;
      }

      router.push(`/he/agent/quotes/${payload.id}`);
    } catch {
      setError("שמירת ההצעה נכשלה — בדקו את החיבור לרשת");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      {/* ── package ── */}
      <div className="space-y-6">
        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-brand-dark">{BASE_SETUP_LABEL}</p>
              <p className="text-xs text-brand-muted">חד פעמי — נכלל תמיד בכל חבילה</p>
            </div>
            <p className="text-sm font-bold tabular-nums text-brand-dark">
              {fmt(catalogue.baseSetup)}
            </p>
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <h2 className="text-sm font-bold text-brand-dark">{section.title}</h2>
              <span className="text-xs text-brand-muted">{section.hint}</span>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <ComponentRow key={item.id} item={item} state={calc[item.id]} onChange={update} />
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-brand-dark">מדרגות ההנחה</h2>
            <span className="text-xs text-brand-muted">לפי החודשי הזכאי</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...PRICING_CONFIG.discountTiers].reverse().map((tier) => {
              const active = totals.discountPct === tier.pct && totals.eligibleMonthlySubtotal > tier.threshold;
              return (
                <span
                  key={tier.threshold}
                  className={`rounded-pill border px-3 py-1.5 text-xs tabular-nums ${
                    active
                      ? "border-brand-pink bg-brand-pink font-bold text-white"
                      : "border-slate-200 text-brand-muted"
                  }`}
                >
                  מעל {fmt(tier.threshold)} ← {tier.pct}%
                </span>
              );
            })}
          </div>
          {upcoming && totals.eligibleMonthlySubtotal > 0 ? (
            <p className="mt-3 rounded-xl bg-brand-tint px-4 py-2.5 text-xs font-semibold text-brand-pinkDark">
              עוד {fmt(amountToNextTier(totals.eligibleMonthlySubtotal, upcoming))} בחודשי הזכאי — ותעלו להנחת{" "}
              {upcoming.pct}%
            </p>
          ) : null}
        </section>

        {/* ── customer ── */}
        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-brand-dark">פרטי הלקוח</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="שם הלקוח / העסק *"
              value={customer.name}
              onChange={(v) => setCustomer({ ...customer, name: v })}
              placeholder="לדוגמה: פיצה רומא בע״מ"
              required
            />
            <Field
              label="איש קשר"
              value={customer.contact}
              onChange={(v) => setCustomer({ ...customer, contact: v })}
            />
            <Field
              label="טלפון"
              value={customer.phone}
              onChange={(v) => setCustomer({ ...customer, phone: v })}
              dir="ltr"
              placeholder="050-0000000"
            />
            <Field
              label="אימייל"
              type="email"
              value={customer.email}
              onChange={(v) => setCustomer({ ...customer, email: v })}
              dir="ltr"
              placeholder="name@example.com"
            />
            <Field
              label="ח.פ / ע.מ"
              value={customer.taxId}
              onChange={(v) => setCustomer({ ...customer, taxId: v })}
              dir="ltr"
            />
            <div>
              <label htmlFor="valid" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                תוקף ההצעה
              </label>
              <select
                id="valid"
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-pink"
              >
                {[7, 14, 30, 60].map((days) => (
                  <option key={days} value={days}>
                    {days} ימים
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="term" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                התחייבות
              </label>
              <select
                id="term"
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-pink"
              >
                {[12, 24, 36].map((months) => (
                  <option key={months} value={months}>
                    {months} חודשים
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vat" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                מע״מ (%)
              </label>
              <input
                id="vat"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 tabular-nums outline-none focus:border-brand-pink"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                הערות ותנאי תשלום
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="לדוגמה: תנאי תשלום שוטף +30. ההקמה נגבית במעמד החתימה."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-pink"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── summary ── */}
      <aside className="lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
          <div className="bg-brand-dark px-5 py-4 text-white">
            <h2 className="text-sm font-bold">סיכום החבילה</h2>
            <p className="mt-0.5 text-xs text-slate-400">המחיר מתייחס לסניף בודד</p>
          </div>

          <div className="px-5 py-4 text-sm">
            <Row label="הקמה ראשונית" value={fmt(totals.initialSetupAmt)} />
            {totals.productSetupSubtotal + totals.addonSetupSubtotal + totals.appSetup > 0 ? (
              <Row
                label="הקמת מוצרים ותוספות"
                value={fmt(totals.productSetupSubtotal + totals.addonSetupSubtotal + totals.appSetup)}
              />
            ) : null}
            <Row label="סה״כ הקמה (חד פעמי)" value={fmt(totals.finalSetupTotal)} emphasis />
            <Row label={`כולל מע״מ ${vatPercent}%`} value={fmt(money.setupInclVat)} faint />

            {/* Shown only when something physical was selected. An empty
                hardware line on a software-only quote is noise. */}
            {totals.hardwareTotal > 0 ? (
              <>
                <div className="my-3 h-px bg-slate-100" />
                <Row label="מוצרים וחומרה (חד פעמי)" value={fmt(totals.hardwareTotal)} emphasis />
                <Row label={`כולל מע״מ ${vatPercent}%`} value={fmt(money.hardwareInclVat)} faint />
              </>
            ) : null}

            <div className="my-3 h-px bg-slate-100" />

            <Row label="חודשי זכאי להנחה" value={fmt(totals.eligibleMonthlySubtotal)} />
            {totals.discountPct > 0 ? (
              <Row label={`הנחה ${totals.discountPct}%`} value={`−${fmt(totals.discountAmt)}`} good />
            ) : null}
            {totals.nonDiscountableMonthly > 0 ? (
              <Row label="רכיבים ללא הנחה" value={`+${fmt(totals.nonDiscountableMonthly)}`} faint />
            ) : null}
            <Row label="סה״כ חודשי" value={fmt(totals.finalMonthlyTotal)} emphasis />
            <Row label={`כולל מע״מ ${vatPercent}%`} value={fmt(money.monthlyInclVat)} faint />

            {totals.discountAmt > 0 ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                חיסכון של {fmt(totals.discountAmt)} בכל חודש — {fmt(money.annualSaving)} בשנה
              </p>
            ) : null}

            <p className="mt-3 text-center text-xs text-brand-muted">
              שווי החוזה ל-{termMonths} חודשים:{" "}
              <span className="font-semibold text-brand-dark">{fmt(money.contractValue)}</span>
            </p>
          </div>

          <div className="space-y-2 px-5 pb-5">
            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || !totals.hasAnyEnabled}
              className="w-full rounded-pill bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "יוצר הצעה…" : "צור הצעה"}
            </button>
            <button
              type="button"
              onClick={() => setCalc(buildInitialState(catalogue))}
              className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey"
            >
              איפוס החבילה
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}

// ── pieces ───────────────────────────────────────────────────
function ComponentRow({
  item,
  state,
  onChange,
}: {
  item: PricingItem;
  state: ItemState | undefined;
  onChange: (id: string, patch: Partial<ItemState>) => void;
}) {
  const enabled = state?.enabled ?? false;
  const qty = state?.qty ?? 1;
  const lineMonthly = enabled ? item.monthly * qty : 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
        enabled ? "border-brand-pink/40 bg-brand-tint shadow-sm" : "border-slate-200 bg-white opacity-70"
      }`}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(item.id, { enabled: e.target.checked })}
        aria-label={item.label}
        className="h-5 w-5 flex-shrink-0 cursor-pointer accent-brand-pink"
      />

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${enabled ? "text-brand-dark" : "text-brand-muted"}`}>
          {item.label}
        </p>
        <p className="text-xs text-brand-muted">
          {item.note ? `${item.note} · ` : ""}הקמה {fmt(item.setup)}
          {item.txNote ? ` · ${item.txNote}` : ""}
        </p>
      </div>

      {item.maxQty > 1 ? (
        <div className="flex flex-shrink-0 items-center overflow-hidden rounded-pill border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onChange(item.id, { qty: Math.max(1, qty - 1) })}
            disabled={!enabled || qty <= 1}
            aria-label={`הפחת כמות ${item.label}`}
            className="h-7 w-7 text-brand-muted transition-colors hover:bg-brand-tint hover:text-brand-pink disabled:opacity-30"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => onChange(item.id, { qty: Math.min(item.maxQty, qty + 1) })}
            disabled={!enabled || qty >= item.maxQty}
            aria-label={`הוסף כמות ${item.label}`}
            className="h-7 w-7 text-brand-muted transition-colors hover:bg-brand-tint hover:text-brand-pink disabled:opacity-30"
          >
            +
          </button>
        </div>
      ) : null}

      <div className="w-24 flex-shrink-0 text-left">
        <p className="text-sm font-bold tabular-nums text-brand-dark">{fmt(lineMonthly)}</p>
        <p className="text-[11px] text-brand-muted">לחודש</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
  faint,
  good,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  faint?: boolean;
  good?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 py-1 ${
        emphasis ? "mt-2 border-t border-slate-200 pt-2.5 text-base font-bold text-brand-dark" : "text-xs"
      } ${faint ? "text-slate-400" : ""} ${good ? "font-semibold text-emerald-700" : ""}`}
    >
      <span className={emphasis ? "" : faint || good ? "" : "text-brand-muted"}>{label}</span>
      <span className={`tabular-nums ${emphasis ? "text-brand-pink" : ""}`}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  dir,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  required?: boolean;
}) {
  const id = `field-${label.replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-brand-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        dir={dir}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-right outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
      />
    </div>
  );
}
