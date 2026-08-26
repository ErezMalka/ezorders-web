"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { GROUP_LABELS, fmt, type ItemGroup } from "@/lib/pricing";
import type { ProductRow } from "@/lib/agent/products";

/**
 * The price list, editable.
 *
 * Until this screen existed, adding a product meant editing a TypeScript file
 * and shipping a deploy. Everything here writes to public.products, which both
 * the public calculator and the quote builder read — so a product added at
 * 10:00 is sellable at 10:01, and the two can still never disagree, because
 * they are still reading one list.
 *
 * Editing is inline and one field at a time. A modal with eleven inputs would
 * make "put the POS up by ₪20" a five-click operation, and that is the edit
 * that actually happens.
 */

const GROUP_ORDER: ItemGroup[] = ["core", "addon_included", "addon_excluded", "mobile_app", "hardware"];

const GROUP_HINT: Record<ItemGroup, string> = {
  core: "נכללים בחישוב ההנחה החודשית",
  addon_included: "מגדילים את מדרגת ההנחה",
  addon_excluded: "נוספים לסה״כ במלוא המחיר",
  mobile_app: "ללא הנחה",
  hardware: "תשלום חד־פעמי בלבד — לא נכנס לחישוב ההנחה",
};

// "has no supplier" as a filter value, distinct from "any supplier". A NUL or
// other exotic sentinel would not survive a round trip through a select value.
const NONE = "__none__";
const STATUSES = [
  { value: "all", label: "הכל" },
  { value: "active", label: "במכירה" },
  { value: "retired", label: "הוצאו ממכירה" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

/** "" means any, NONE means the blanks, anything else is an exact match. */
function matches(value: string | null, selected: string): boolean {
  if (!selected) return true;
  if (selected === NONE) return !value;
  return value === selected;
}

/** Distinct values of one column, sorted, with a bucket for the blanks. */
function optionsFor(products: ProductRow[], field: "supplier" | "category") {
  const seen = new Set<string>();
  let blanks = 0;
  for (const p of products) {
    const value = p[field];
    if (value) seen.add(value);
    else blanks += 1;
  }
  return {
    values: [...seen].sort((a, b) => a.localeCompare(b, "he")),
    hasBlanks: blanks > 0,
  };
}

export function ProductManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Filters. The catalogue was ten software items when this screen was written
  // and could be read at a glance; hardware turns it into forty rows across a
  // handful of manufacturers, and scrolling stops being a way to find things.
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState<Status>("all");

  const supplierOptions = useMemo(() => optionsFor(products, "supplier"), [products]);
  const categoryOptions = useMemo(() => optionsFor(products, "category"), [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      if (status === "active" && !p.is_active) return false;
      if (status === "retired" && p.is_active) return false;
      if (group && p.item_group !== group) return false;
      if (!matches(p.supplier, supplier)) return false;
      if (!matches(p.category, category)) return false;
      if (!needle) return true;
      // Deliberately wide: someone hunting for a kiosk stand may remember the
      // model number, the manufacturer, or half the Hebrew name.
      return [p.label, p.key, p.note, p.supplier, p.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [products, query, supplier, category, group, status]);

  const filtering = Boolean(query.trim() || supplier || category || group || status !== "all");

  const clearFilters = () => {
    setQuery("");
    setSupplier("");
    setCategory("");
    setGroup("");
    setStatus("all");
  };

  const patch = async (id: string, body: Record<string, unknown>, note: string) => {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/agent/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "העדכון נכשל");
        return false;
      }
      setMessage(note);
      router.refresh();
      return true;
    } catch {
      setError("העדכון נכשל — בדקו את החיבור לרשת");
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {adding ? (
        <NewProduct
          onDone={(note) => {
            setAdding(false);
            setMessage(note);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-pill bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark"
        >
          + מוצר חדש
        </button>
      )}

      {products.length > 8 ? (
        <section className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-brand-muted" htmlFor="filter-q">
                חיפוש
              </label>
              <input
                id="filter-q"
                type="search"
                value={query}
                placeholder="שם, מזהה, ספק…"
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
              />
            </div>

            <FilterSelect
              id="filter-supplier"
              label="ספק"
              value={supplier}
              onChange={setSupplier}
              options={supplierOptions}
              blankLabel="ללא ספק"
            />
            <FilterSelect
              id="filter-category"
              label="סוג"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              blankLabel="ללא סוג"
            />

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-muted" htmlFor="filter-group">
                קבוצה
              </label>
              <select
                id="filter-group"
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
              >
                <option value="">הכל</option>
                {GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
            <span className="tabular-nums">
              {filtering ? `מציג ${filtered.length} מתוך ${products.length}` : `${products.length} מוצרים`}
            </span>
            <span className="flex items-center gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`rounded-pill px-2.5 py-1 font-semibold transition-colors ${
                    status === s.value
                      ? "bg-brand-dark text-white"
                      : "bg-brand-grey text-brand-muted hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </span>
            {filtering ? (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-brand-pink underline underline-offset-2"
              >
                נקה סינון
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {filtering && filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-brand-muted">
          אין מוצר שמתאים לסינון.
        </p>
      ) : null}

      {GROUP_ORDER.map((group) => {
        const rows = filtered.filter((p) => p.item_group === group);
        if (rows.length === 0) return null;

        return (
          <section key={group} className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-brand-dark">{GROUP_LABELS[group]}</h2>
              <span className="text-xs text-brand-muted">{GROUP_HINT[group]}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-grey text-xs text-brand-muted">
                    <th className="px-4 py-3 text-right font-semibold">מוצר</th>
                    <th className="px-4 py-3 text-right font-semibold">מזהה</th>
                    <th className="px-4 py-3 text-right font-semibold">הקמה</th>
                    <th className="px-4 py-3 text-right font-semibold">חודשי</th>
                    <th className="px-4 py-3 text-right font-semibold">כמות מרב׳</th>
                    <th className="px-4 py-3 text-right font-semibold">באתר</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => (
                    <tr
                      key={product.id}
                      className={`border-b border-slate-100 last:border-0 ${
                        product.is_active ? "" : "bg-slate-50 opacity-60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-start gap-3">
                          {product.image ? (
                            // Fourteen kiosk models are one number apart in name and
                            // nothing alike in the showroom. eslint wants next/image
                            // here; these are fixed-size thumbnails of files that ship
                            // with the site, so the optimiser has nothing to add.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt=""
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
                            />
                          ) : null}
                          <span className="min-w-0">
                        <span className="font-medium text-brand-dark">{product.label}</span>
                        {product.note ? (
                          <span className="block text-xs text-brand-muted">{product.note}</span>
                        ) : null}
                        {!product.is_active ? (
                          <span className="mt-1 inline-block rounded-pill bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            הוצא ממכירה
                          </span>
                        ) : null}
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <TagCell
                            prefix="ספק"
                            value={product.supplier}
                            listId="supplier-values"
                            offerWhenEmpty={group === "hardware"}
                            busy={busy === product.id}
                            onSave={(v) =>
                              patch(product.id, { supplier: v }, `${product.label}: ספק עודכן`)
                            }
                          />
                          {/* Offered on every product, not only on hardware: the
                              quote builder groups each section by family now, and a
                              product with no family stands under a heading it shares
                              with nobody. */}
                          <TagCell
                            prefix="סוג"
                            value={product.category}
                            listId="category-values"
                            offerWhenEmpty
                            busy={busy === product.id}
                            onSave={(v) =>
                              patch(product.id, { category: v }, `${product.label}: סוג עודכן`)
                            }
                          />
                        </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-muted" dir="ltr">
                        {product.key}
                      </td>
                      <td className="px-4 py-3">
                        <PriceCell
                          value={Number(product.setup)}
                          busy={busy === product.id}
                          onSave={(v) => patch(product.id, { setup: v }, `${product.label}: הקמה עודכנה ל-${fmt(v)}`)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {group === "hardware" ? (
                          <span className="text-xs text-brand-muted">—</span>
                        ) : (
                          <PriceCell
                            value={Number(product.monthly)}
                            busy={busy === product.id}
                            onSave={(v) =>
                              patch(product.id, { monthly: v }, `${product.label}: חודשי עודכן ל-${fmt(v)}`)
                            }
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-brand-muted">{product.max_qty}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={busy === product.id}
                          onClick={() =>
                            patch(
                              product.id,
                              { showOnWebsite: !product.show_on_website },
                              product.show_on_website
                                ? `${product.label} הוסתר מהמחשבון הציבורי`
                                : `${product.label} יוצג במחשבון הציבורי`
                            )
                          }
                          className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                            product.show_on_website
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {product.show_on_website ? "מוצג" : "מוסתר"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <button
                          type="button"
                          disabled={busy === product.id}
                          onClick={() =>
                            patch(
                              product.id,
                              { isActive: !product.is_active },
                              product.is_active
                                ? `${product.label} הוצא ממכירה`
                                : `${product.label} הוחזר למכירה`
                            )
                          }
                          className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-muted transition-colors hover:bg-brand-grey hover:text-brand-dark disabled:opacity-40"
                        >
                          {product.is_active ? "הוצאה ממכירה" : "החזרה למכירה"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <datalist id="supplier-values">
        {supplierOptions.values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="category-values">
        {categoryOptions.values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <p className="px-1 text-xs leading-relaxed text-brand-muted">
        מוצר שהוצא ממכירה לא נמחק ולא ייעלם מהצעות ישנות. הצעה ששמורה במערכת מחזיקה את השם
        והמחיר שבהם היא נשלחה, ולכן היא תמשיך להיקרא נכון גם שנה אחרי שהמוצר ירד מהמחירון.
      </p>
    </div>
  );
}

/** One dropdown over the distinct values of a column, plus a bucket for blanks. */
function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  blankLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { values: string[]; hasBlanks: boolean };
  blankLabel: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-brand-muted" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
      >
        <option value="">הכל</option>
        {options.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
        {options.hasBlanks ? <option value={NONE}>{blankLabel}</option> : null}
      </select>
    </div>
  );
}

/**
 * A supplier or category, editable in place.
 *
 * Free text with the values already in use offered as suggestions. A lookup
 * table would have bought consistency at the cost of a second admin screen and
 * a decision about what happens to a product when its supplier is deleted —
 * for a field one person types into a few times a year.
 */
function TagCell({
  prefix,
  value,
  listId,
  offerWhenEmpty,
  busy,
  onSave,
}: {
  prefix: string;
  value: string | null;
  listId: string;
  /**
   * Whether to show an empty "+ ספק" affordance on a product that has none.
   *
   * Only hardware gets it. A supplier is a fact about a physical object bought
   * from a manufacturer; EzWallet has no supplier and never will, and nine rows
   * of dashed placeholders inviting an answer that does not exist is worse than
   * no affordance at all. A value already set always shows, whatever the group.
   */
  offerWhenEmpty: boolean;
  busy: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing && !value && !offerWhenEmpty) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        className={`rounded-pill px-2 py-0.5 text-[11px] font-medium transition-colors ${
          value
            ? "bg-brand-tint text-brand-indigo hover:bg-brand-grey"
            : "border border-dashed border-slate-300 text-slate-400 hover:border-brand-pink hover:text-brand-pink"
        }`}
      >
        {value ? `${prefix}: ${value}` : `+ ${prefix}`}
      </button>
    );
  }

  const commit = async () => {
    const next = draft.trim();
    if (next === (value ?? "")) {
      setEditing(false);
      return;
    }
    const ok = await onSave(next);
    if (ok) setEditing(false);
  };

  return (
    <input
      autoFocus
      list={listId}
      disabled={busy}
      value={draft}
      placeholder={prefix}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") void commit();
        if (event.key === "Escape") setEditing(false);
      }}
      className="w-32 rounded-lg border border-brand-pink px-2 py-0.5 text-[11px] text-brand-dark"
    />
  );
}

/** A price you can click, type into, and press Enter on. */
function PriceCell({
  value,
  busy,
  onSave,
}: {
  value: number;
  busy: boolean;
  onSave: (value: number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="rounded-lg px-2 py-1 text-sm tabular-nums text-brand-dark transition-colors hover:bg-brand-tint"
      >
        {fmt(value)}
      </button>
    );
  }

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) {
      setEditing(false);
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    const ok = await onSave(next);
    if (ok) setEditing(false);
  };

  return (
    <input
      autoFocus
      type="number"
      min={0}
      step={1}
      disabled={busy}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") void commit();
        if (event.key === "Escape") setEditing(false);
      }}
      className="w-24 rounded-lg border border-brand-pink px-2 py-1 text-sm tabular-nums text-brand-dark"
    />
  );
}

/** The new-product form. Short on purpose: everything else is editable in place. */
function NewProduct({ onDone, onCancel }: { onDone: (note: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    key: "",
    label: "",
    note: "",
    supplier: "",
    category: "",
    group: "hardware" as ItemGroup,
    setup: "",
    monthly: "",
    maxQty: "1",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHardware = form.group === "hardware";

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: form.key,
          label: form.label,
          note: form.note,
          supplier: form.supplier,
          category: form.category,
          group: form.group,
          setup: Number(form.setup || 0),
          monthly: isHardware ? 0 : Number(form.monthly || 0),
          maxQty: Number(form.maxQty || 1),
          sortOrder: 100,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "יצירת המוצר נכשלה");
        return;
      }
      onDone(`${form.label} נוסף למחירון`);
    } catch {
      setError("יצירת המוצר נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-card border border-brand-pink bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-brand-dark">מוצר חדש</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם המוצר *" value={form.label} onChange={(v) => setForm({ ...form, label: v })}
               placeholder="מסך מגע 15״" />
        <Field label="מזהה באנגלית *" value={form.key} onChange={(v) => setForm({ ...form, key: v })}
               placeholder="touch-screen-15" dir="ltr" />

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-muted" htmlFor="new-group">
            קבוצה
          </label>
          <select
            id="new-group"
            value={form.group}
            onChange={(event) => setForm({ ...form, group: event.target.value as ItemGroup })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
          >
            {GROUP_ORDER.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-brand-muted">{GROUP_HINT[form.group]}</p>
        </div>

        <Field label="הערה מתחת לשם" value={form.note} onChange={(v) => setForm({ ...form, note: v })}
               placeholder="המחיר פר עמדה" />

        <Field label="ספק" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })}
               placeholder="Wintec" list="supplier-values" />
        <Field label="סוג" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
               placeholder="עמדת קיוסק" list="category-values" />

        <Field
          label={isHardware ? "מחיר ליחידה *" : "הקמה (חד־פעמי)"}
          value={form.setup}
          onChange={(v) => setForm({ ...form, setup: v })}
          type="number"
          dir="ltr"
        />

        {isHardware ? (
          <div className="flex items-end pb-2 text-xs text-brand-muted">
            מוצר פיזי נמכר בתשלום חד־פעמי בלבד. תשלום חודשי על מוצר הוא השכרה — מוצר אחר וחוזה אחר.
          </div>
        ) : (
          <Field
            label="חודשי"
            value={form.monthly}
            onChange={(v) => setForm({ ...form, monthly: v })}
            type="number"
            dir="ltr"
          />
        )}

        <Field
          label="כמות מרבית להצעה"
          value={form.maxQty}
          onChange={(v) => setForm({ ...form, maxQty: v })}
          type="number"
          dir="ltr"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || !form.label.trim() || !form.key.trim()}
          onClick={submit}
          className="rounded-pill bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pinkDark disabled:opacity-40"
        >
          {busy ? "מוסיף…" : "הוספה למחירון"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill border border-slate-200 px-5 py-2.5 text-sm font-semibold text-brand-muted"
        >
          ביטול
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  list?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-brand-muted">{label}</label>
      <input
        type={type}
        dir={dir}
        list={list}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
      />
    </div>
  );
}
