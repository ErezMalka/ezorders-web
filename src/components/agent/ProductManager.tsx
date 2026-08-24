"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

export function ProductManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

      {GROUP_ORDER.map((group) => {
        const rows = products.filter((p) => p.item_group === group);
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
                        <span className="font-medium text-brand-dark">{product.label}</span>
                        {product.note ? (
                          <span className="block text-xs text-brand-muted">{product.note}</span>
                        ) : null}
                        {!product.is_active ? (
                          <span className="mt-1 inline-block rounded-pill bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            הוצא ממכירה
                          </span>
                        ) : null}
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

      <p className="px-1 text-xs leading-relaxed text-brand-muted">
        מוצר שהוצא ממכירה לא נמחק ולא ייעלם מהצעות ישנות. הצעה ששמורה במערכת מחזיקה את השם
        והמחיר שבהם היא נשלחה, ולכן היא תמשיך להיקרא נכון גם שנה אחרי שהמוצר ירד מהמחירון.
      </p>
    </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-brand-muted">{label}</label>
      <input
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-brand-dark"
      />
    </div>
  );
}
