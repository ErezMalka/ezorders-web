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
  cleanPrice,
  computeQuote,
  fmt,
  itemsInGroup,
  nextTier,
  unitPrices,
  withMoney,
  type Catalogue,
  type CalcState,
  type ItemState,
  type CatalogueItem,
  type PriceOverrides,
} from "@/lib/pricing";

/**
 * Build a package, capture the customer, create the quote.
 *
 * Every figure shown here comes from computeQuote in @/lib/pricing — the same
 * function behind /he/price. What gets POSTed is the SELECTION plus any price
 * the agent set by hand; everything else is priced by the server from the
 * catalogue, and the totals on screen are a preview of the server's answer.
 *
 * A hand-set price is a visible act. The field turns pink, the list price
 * stays printed beside it, the summary says "מחיר ידני", and the owner is
 * mailed when the quote goes out. Nothing stops the agent; nothing hides it.
 */

interface Section {
  title: string;
  hint: string;
  items: readonly CatalogueItem[];
}

/**
 * Split a section into the families its products belong to, in catalogue order.
 *
 * Twenty-seven pieces of hardware under one heading is a wall an agent scrolls
 * past rather than reads. `category` already says which family a product is in
 * — it is what the price page builds its tabs from — so the builder uses the
 * same answer instead of inventing a second one.
 *
 * A section whose products all share one family, or name none, is rendered flat:
 * a sub-heading over the whole list says nothing the section heading did not.
 */
function byCategory(
  items: readonly CatalogueItem[]
): { title: string | null; items: CatalogueItem[] }[] {
  const families: { title: string | null; items: CatalogueItem[] }[] = [];
  for (const item of items) {
    const title = item.category?.trim() || null;
    const last = families[families.length - 1];
    if (last && last.title === title) last.items.push(item);
    else families.push({ title, items: [item] });
  }
  return families.length > 1 ? families : [{ title: null, items: [...items] }];
}

/**
 * Tick the components an existing quote holds, in the state built from today's
 * catalogue. A component that has been retired since the quote was written is
 * simply absent from that state and is skipped here — it cannot be sold, so it
 * cannot be re-ticked, and the agent sees a package without it rather than a
 * row they cannot buy.
 */
function applyDraft(state: CalcState, draft?: QuoteDraft): CalcState {
  if (!draft) return state;
  const next: CalcState = { ...state };
  for (const [id, sel] of Object.entries(draft.selection)) {
    if (!next[id]) continue;
    next[id] = {
      enabled: true,
      qty: sel.qty,
      ...(sel.setupUnit !== undefined ? { setupUnit: sel.setupUnit } : {}),
      ...(sel.monthlyUnit !== undefined ? { monthlyUnit: sel.monthlyUnit } : {}),
    };
  }
  return next;
}

/** What an existing quote hands the builder when it is reopened for editing. */
export interface QuoteDraft {
  id: string;
  customer: { name: string; contact: string; phone: string; email: string; taxId: string };
  /** Which components, how many, and — only where the agent set one — at what price. */
  selection: Record<string, { qty: number; setupUnit?: number; monthlyUnit?: number }>;
  /** The base fee and discount the agent set by hand, if any. */
  overrides?: PriceOverrides;
  validDays: number;
  notes: string;
}

export function QuoteBuilder({
  catalogue = DEFAULT_CATALOGUE,
  draft,
  mode = "quote",
}: {
  catalogue?: Catalogue;
  /**
   * Present when an existing draft is being edited. The same form either way —
   * a second screen for editing would be a second place for the two to drift.
   */
  draft?: QuoteDraft;
  /**
   * "contract" draws a contract straight from the package, with no proposal in
   * front of it — for a price agreed on the telephone. Same question, same
   * form; only where it lands is different, which is why it is a mode and not
   * a second builder.
   */
  mode?: "quote" | "contract";
}) {
  const router = useRouter();
  const [calc, setCalc] = useState<CalcState>(() => applyDraft(buildInitialState(catalogue), draft));
  const [overrides, setOverrides] = useState<PriceOverrides>(draft?.overrides ?? {});
  // Not asked for any more, and not chosen per deal. VAT is whatever the law
  // says on the day of the invoice, and every price we quote is before it; the
  // term is gone because there is no commitment to state. Both are still
  // written onto the quote so the shape of the record does not change.
  const vatPercent = DEFAULT_VAT_PERCENT;
  const termMonths = DEFAULT_TERM_MONTHS;
  const [validDays, setValidDays] = useState(draft?.validDays ?? DEFAULT_VALID_DAYS);
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [customer, setCustomer] = useState(
    draft?.customer ?? { name: "", contact: "", phone: "", email: "", taxId: "" }
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = useCallback((id: string, patch: Partial<ItemState>) => {
    setCalc((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const contractMode = mode === "contract";
  const totals = computeQuote(calc, catalogue, overrides);
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
      { title: "אינטגרציות", hint: "משלוחים ושוברים — ללא הנחה", group: "integrations" },
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
    // A quote with no number to call back on is a quote nobody follows up. The
    // server refuses it too, and so does the database — this is only the first
    // of the three, and the only one that can say so before the round trip.
    if (!customer.phone.trim()) {
      setError("נא להזין טלפון לקוח");
      return;
    }
    if (!totals.hasAnyEnabled) {
      setError("נא לבחור לפחות רכיב אחד להצעה");
      return;
    }

    setBusy(true);
    try {
      const endpoint = contractMode
        ? "/api/agent/contracts/direct"
        : draft
          ? `/api/agent/quotes/${draft.id}`
          : "/api/agent/quotes";

      const response = await fetch(endpoint, {
        method: draft && !contractMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, calc, overrides, vatPercent, termMonths, validDays, notes }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? (contractMode ? "הפקת ההסכם נכשלה" : "שמירת ההצעה נכשלה"));
        setBusy(false);
        return;
      }

      router.push(
        contractMode ? `/he/agent/contracts/${payload.id}` : `/he/agent/quotes/${payload.id}`
      );
      router.refresh();
    } catch {
      setError("השמירה נכשלה — בדקו את החיבור לרשת");
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
            <PriceInput
              label="דמי הקמה"
              listPrice={catalogue.baseSetup}
              value={overrides.baseSetup}
              onChange={(v) =>
                setOverrides((prev) => {
                  const next = { ...prev };
                  if (v === undefined || v === catalogue.baseSetup) delete next.baseSetup;
                  else next.baseSetup = v;
                  return next;
                })
              }
            />
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <h2 className="text-sm font-bold text-brand-dark">{section.title}</h2>
              <span className="text-xs text-brand-muted">{section.hint}</span>
            </div>
            <div className="space-y-2">
              {byCategory(section.items).map((family) => (
                <div key={family.title ?? "—"} className="space-y-2">
                  {family.title ? (
                    <p className="px-1 pt-2 text-xs font-bold text-brand-muted">
                      {family.title}
                      <span className="ms-1.5 font-normal">({family.items.length})</span>
                    </p>
                  ) : null}
                  {family.items.map((item) => (
                    <ComponentRow key={item.id} item={item} state={calc[item.id]} onChange={update} />
                  ))}
                </div>
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
                      ? "border-brand-pink bg-brand-pinkStrong font-bold text-white"
                      : "border-slate-200 text-brand-muted"
                  }`}
                >
                  מעל {fmt(tier.threshold)} ← {tier.pct}%
                </span>
              );
            })}
          </div>
          {upcoming && totals.eligibleMonthlySubtotal > 0 && overrides.discountPct === undefined ? (
            <p className="mt-3 rounded-xl bg-brand-tint px-4 py-2.5 text-xs font-semibold text-brand-pinkDark">
              עוד {fmt(amountToNextTier(totals.eligibleMonthlySubtotal, upcoming))} בחודשי הזכאי — ותעלו להנחת{" "}
              {upcoming.pct}%
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">הנחה ידנית</p>
              <p className="text-xs text-brand-muted">
                {overrides.discountPct === undefined
                  ? `לפי המדרגות: ${totals.listDiscountPct}% על החודשי הזכאי`
                  : `במקום ${totals.listDiscountPct}% לפי המדרגות`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={1}
                  placeholder={String(totals.listDiscountPct)}
                  value={overrides.discountPct ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setOverrides((prev) => {
                      const next = { ...prev };
                      const n = Number(raw);
                      if (raw === "" || !Number.isFinite(n) || n < 0 || n > 100) delete next.discountPct;
                      else next.discountPct = Math.round(n * 100) / 100;
                      return next;
                    });
                  }}
                  aria-label="אחוז הנחה ידני"
                  dir="ltr"
                  className={`w-24 rounded-xl border py-2 pe-7 ps-3 text-right text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-brand-pink/20 ${
                    overrides.discountPct !== undefined
                      ? "border-brand-pink bg-brand-tint text-brand-pinkDark"
                      : "border-slate-200 text-brand-dark"
                  }`}
                />
                <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-xs text-brand-muted">
                  %
                </span>
              </div>
              {overrides.discountPct !== undefined ? (
                <button
                  type="button"
                  onClick={() =>
                    setOverrides((prev) => {
                      const next = { ...prev };
                      delete next.discountPct;
                      return next;
                    })
                  }
                  className="text-xs font-semibold text-brand-muted underline-offset-2 hover:text-brand-pink hover:underline"
                >
                  חזרה לאוטומטי
                </button>
              ) : null}
            </div>
          </div>
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
              label="טלפון *"
              value={customer.phone}
              onChange={(v) => setCustomer({ ...customer, phone: v })}
              dir="ltr"
              placeholder="050-0000000"
              required
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
            <div className={contractMode ? "hidden" : undefined}>
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
            {totals.priceOverridden ? (
              <p className="mb-3 rounded-xl border border-brand-pink/40 bg-brand-tint px-3 py-2 text-center text-xs font-semibold text-brand-pinkDark">
                מחיר ידני — ההצעה תסומן ותישלח התראה למנהל בשליחה ללקוח
              </p>
            ) : null}
            <Row
              label={overrides.baseSetup !== undefined ? "הקמה ראשונית (ידני)" : "הקמה ראשונית"}
              value={fmt(totals.initialSetupAmt)}
            />
            {totals.productSetupSubtotal + totals.addonSetupSubtotal + totals.appSetup > 0 ? (
              <Row
                label="הקמת מוצרים ותוספות"
                value={fmt(totals.productSetupSubtotal + totals.addonSetupSubtotal + totals.appSetup)}
              />
            ) : null}
            <Row label="סה״כ הקמה (חד פעמי)" value={fmt(totals.finalSetupTotal)} emphasis />

            {/* Shown only when something physical was selected. An empty
                hardware line on a software-only quote is noise. */}
            {totals.hardwareTotal > 0 ? (
              <>
                <div className="my-3 h-px bg-slate-100" />
                <Row label="מוצרים וחומרה (חד פעמי)" value={fmt(totals.hardwareTotal)} emphasis />
              </>
            ) : null}

            <div className="my-3 h-px bg-slate-100" />

            <Row label="חודשי זכאי להנחה" value={fmt(totals.eligibleMonthlySubtotal)} />
            {totals.discountPct > 0 ? (
              <Row
                label={`הנחה ${totals.discountPct}%${overrides.discountPct !== undefined ? " (ידני)" : ""}`}
                value={`−${fmt(totals.discountAmt)}`}
                good
              />
            ) : null}
            {totals.nonDiscountableMonthly > 0 ? (
              <Row label="רכיבים ללא הנחה" value={`+${fmt(totals.nonDiscountableMonthly)}`} faint />
            ) : null}
            <Row label="סה״כ חודשי" value={fmt(totals.finalMonthlyTotal)} emphasis />

            {totals.discountAmt > 0 ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                חיסכון של {fmt(totals.discountAmt)} בכל חודש — {fmt(money.annualSaving)} בשנה
              </p>
            ) : null}

            <p className="mt-3 text-center text-xs text-brand-muted">
              כל המחירים אינם כוללים מע״מ.
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
              className="w-full rounded-pill bg-brand-pinkStrong px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkInk disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? contractMode
                  ? "מפיק הסכם…"
                  : draft
                    ? "שומר…"
                    : "יוצר הצעה…"
                : contractMode
                  ? "הפקת הסכם"
                  : draft
                    ? "שמירת השינויים"
                    : "צור הצעה"}
            </button>
            <button
              type="button"
              onClick={() =>
                draft ? router.push(`/he/agent/quotes/${draft.id}`) : setCalc(buildInitialState(catalogue))
              }
              className="w-full rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey"
            >
              {draft ? "ביטול" : "איפוס החבילה"}
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
  item: CatalogueItem;
  state: ItemState | undefined;
  onChange: (id: string, patch: Partial<ItemState>) => void;
}) {
  const enabled = state?.enabled ?? false;
  const qty = state?.qty ?? 1;
  const unit = unitPrices(item, state);
  const overridden = unit.setup !== item.setup || unit.monthly !== item.monthly;

  // The row is a price list before it is a subtotal. It used to print ₪0 for
  // anything not ticked, which made the branded app read as free at a glance
  // and told an agent nothing about what they were about to add — so it now
  // states the price either way and greys it out until the item is selected.
  //
  // A product with no monthly charge shows what it costs once instead of ₪0 a
  // month, which is the only honest thing to say about a kiosk or a screen.
  const oneTimeOnly = item.monthly === 0 && unit.monthly === 0;
  const lineAmount = (oneTimeOnly ? unit.setup : unit.monthly) * qty;

  // Set a per-unit price; an empty field or the list price means "as listed".
  const setUnit = (field: "setupUnit" | "monthlyUnit", listPrice: number) => (v: number | undefined) => {
    onChange(item.id, { [field]: v === undefined || v === listPrice ? undefined : v });
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition-all ${
        enabled
          ? overridden
            ? "border-brand-pink bg-brand-tint shadow-sm"
            : "border-brand-pink/40 bg-brand-tint shadow-sm"
          : "border-slate-200 bg-white opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(item.id, { enabled: e.target.checked })}
          aria-label={item.label}
          className="h-5 w-5 flex-shrink-0 cursor-pointer accent-brand-pink"
        />

        {item.image ? (
          // Where the picture earns its place: fourteen kiosk models whose names
          // differ by one number, being chosen from by someone on the phone with
          // a customer. eslint wants next/image; this is a fixed-size thumbnail
          // of a file that ships with the site.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            width={40}
            height={56}
            className="h-14 w-10 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${enabled ? "text-brand-dark" : "text-brand-muted"}`}>
            {item.label}
            {overridden && enabled ? (
              <span className="ms-2 rounded-pill bg-brand-pinkStrong px-2 py-0.5 text-[10px] font-bold text-white align-middle">
                מחיר ידני
              </span>
            ) : null}
          </p>
          <p className="text-xs text-brand-muted">
            {item.supplier ? `${item.supplier} · ` : ""}
            {item.note ? `${item.note} · ` : ""}מחירון: הקמה {fmt(item.setup)}
            {item.monthly > 0 ? ` · ${fmt(item.monthly)} לחודש` : ""}
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
          <p
            className={`text-sm font-bold tabular-nums ${
              enabled ? "text-brand-dark" : "text-brand-muted"
            }`}
          >
            {fmt(lineAmount)}
          </p>
          <p className="text-[11px] text-brand-muted">{oneTimeOnly ? "חד־פעמי" : "לחודש"}</p>
        </div>
      </div>

      {/* The agent's prices, per unit. Only once the line is in the package:
          a price field on a line nobody selected is a field nobody meant. */}
      {enabled ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-brand-pink/15 pt-2.5">
          <PriceInput
            label="הקמה ליח׳"
            listPrice={item.setup}
            value={state?.setupUnit}
            onChange={setUnit("setupUnit", item.setup)}
            compact
          />
          {item.group !== "hardware" ? (
            <PriceInput
              label="לחודש ליח׳"
              listPrice={item.monthly}
              value={state?.monthlyUnit}
              onChange={setUnit("monthlyUnit", item.monthly)}
              compact
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A shekel field that knows what the list says.
 *
 * Empty means "the list price", and the list price is the placeholder, so an
 * agent who has not touched it sees the right number and one who has sees
 * theirs in pink with the list beside it. Typing the list price back clears
 * the override rather than storing a no-op.
 */
function PriceInput({
  label,
  listPrice,
  value,
  onChange,
  compact,
}: {
  label: string;
  listPrice: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  compact?: boolean;
}) {
  const overridden = value !== undefined && value !== listPrice;
  return (
    <label className="flex items-center gap-2 text-xs text-brand-muted">
      <span className="whitespace-nowrap">{label}</span>
      <span className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-xs text-brand-muted">
          ₪
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder={String(listPrice)}
          value={value ?? ""}
          onChange={(e) => onChange(cleanPrice(e.target.value))}
          dir="ltr"
          className={`${compact ? "w-24 py-1.5" : "w-28 py-2"} rounded-xl border pe-3 ps-6 text-right text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-brand-pink/20 ${
            overridden
              ? "border-brand-pink bg-white text-brand-pinkDark"
              : "border-slate-200 bg-white text-brand-dark"
          }`}
        />
      </span>
      {overridden ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title={`חזרה למחירון: ${fmt(listPrice)}`}
          className="whitespace-nowrap text-[11px] font-semibold text-brand-muted underline-offset-2 hover:text-brand-pink hover:underline"
        >
          מחירון {fmt(listPrice)}
        </button>
      ) : null}
    </label>
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
