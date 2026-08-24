"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { AgentRole, TeamMember } from "@/lib/agent/team";

/**
 * The team screen.
 *
 * The password an admin sets here is shown once, in the open, with a copy
 * button — because it is about to be read out over the phone and pretending
 * otherwise just means it gets screenshotted instead. The account is flagged so
 * the agent must replace it at first sign-in, which is what actually limits the
 * exposure.
 */

const ROLE_LABEL: Record<AgentRole, string> = {
  agent: "סוכן",
  manager: "מנהל",
  admin: "מנהל מערכת",
};

const ROLE_HINT: Record<AgentRole, string> = {
  agent: "רואה רק את ההצעות שלו",
  manager: "רואה את ההצעות של כולם",
  admin: "רואה הכל ומנהל את הצוות",
};

function generatePassword(): string {
  // Ambiguous characters left out: this gets read aloud.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(14);
  crypto.getRandomValues(values);
  return "EZ-" + Array.from(values, (v) => alphabet[v % alphabet.length]).join("");
}

export function TeamManager({ team, currentAgentId }: { team: TeamMember[]; currentAgentId: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Shown once after creating an account or resetting a password. */
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "agent" as AgentRole,
    password: generatePassword(),
  });

  const resetForm = () =>
    setForm({ fullName: "", email: "", phone: "", role: "agent", password: generatePassword() });

  const createAgent = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("create");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/agent/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "יצירת הסוכן נכשלה");
        return;
      }

      setRevealed({ email: form.email, password: form.password });
      setAdding(false);
      resetForm();
      router.refresh();
    } catch {
      setError("יצירת הסוכן נכשלה — בדקו את החיבור לרשת");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, label: string) => {
    setBusy(id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/agent/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "העדכון נכשל");
        return false;
      }
      setNotice(label);
      router.refresh();
      return true;
    } catch {
      setError("העדכון נכשל — בדקו את החיבור לרשת");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (member: TeamMember) => {
    const password = generatePassword();
    const ok = await patch(member.id, { password }, `הסיסמה של ${member.full_name} אופסה`);
    if (ok) setRevealed({ email: member.email, password });
  };

  return (
    <div className="space-y-4">
      {revealed ? (
        <div className="rounded-card border-2 border-brand-pink bg-brand-tint p-5">
          <h2 className="text-sm font-bold text-brand-dark">הסיסמה מוצגת פעם אחת בלבד</h2>
          <p className="mt-1 text-xs text-brand-muted">
            העבירו אותה ל{revealed.email}. הסוכן יתבקש להחליף אותה בכניסה הראשונה.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 rounded-xl border border-brand-pink/40 bg-white px-4 py-2.5 font-mono text-base tracking-wide text-brand-dark"
            >
              {revealed.password}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(revealed.password).then(
                  () => setNotice("הסיסמה הועתקה"),
                  () => setError("ההעתקה נכשלה — סמנו והעתיקו ידנית")
                );
              }}
              className="rounded-pill bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-pinkDark"
            >
              העתק
            </button>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="rounded-pill border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-grey"
            >
              סגור
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{notice}</p>
      ) : null}

      {adding ? (
        <form onSubmit={createAgent} className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-brand-dark">סוכן חדש</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="שם מלא *"
              value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })}
              required
            />
            <Field
              label="אימייל *"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
            />
            <Field
              label="טלפון"
              dir="ltr"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <div>
              <label htmlFor="new-role" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                תפקיד
              </label>
              <select
                id="new-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AgentRole })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-pink"
              >
                {(Object.keys(ROLE_LABEL) as AgentRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]} — {ROLE_HINT[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-brand-muted">
                סיסמה ראשונית
              </label>
              <div className="flex gap-2">
                <input
                  id="new-password"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={10}
                  required
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono outline-none focus:border-brand-pink"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  className="rounded-pill border border-slate-200 px-4 text-sm font-semibold text-brand-muted hover:bg-brand-grey"
                >
                  הגרל מחדש
                </button>
              </div>
              <p className="mt-1.5 text-xs text-brand-muted">
                הסוכן יתבקש להחליף אותה בכניסה הראשונה.
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={busy === "create"}
              className="rounded-pill bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-pinkDark disabled:opacity-50"
            >
              {busy === "create" ? "יוצר…" : "צור סוכן"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="rounded-pill border border-slate-200 px-6 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-grey"
            >
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setRevealed(null);
          }}
          className="rounded-pill bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-pinkDark"
        >
          + סוכן חדש
        </button>
      )}

      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-brand-grey text-xs text-brand-muted">
                <th className="px-4 py-3 text-right font-semibold">שם</th>
                <th className="px-4 py-3 text-right font-semibold">אימייל</th>
                <th className="px-4 py-3 text-right font-semibold">תפקיד</th>
                <th className="px-4 py-3 text-right font-semibold">הצעות</th>
                <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const isSelf = member.id === currentAgentId;
                const isBusy = busy === member.id;
                return (
                  <tr
                    key={member.id}
                    className={`border-b border-slate-100 last:border-0 ${member.is_active ? "" : "opacity-55"}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-brand-dark">{member.full_name}</span>
                      {isSelf ? <span className="ms-1.5 text-xs text-brand-muted">(אתה)</span> : null}
                      {member.must_change_password ? (
                        <span className="block text-[11px] text-amber-700">ממתין להחלפת סיסמה</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-brand-muted" dir="ltr">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        disabled={isBusy || isSelf}
                        title={isSelf ? "אי אפשר לשנות את התפקיד של עצמך" : undefined}
                        onChange={(e) =>
                          patch(
                            member.id,
                            { role: e.target.value },
                            `${member.full_name} הוגדר כ${ROLE_LABEL[e.target.value as AgentRole]}`
                          )
                        }
                        className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none focus:border-brand-pink disabled:opacity-60"
                      >
                        {(Object.keys(ROLE_LABEL) as AgentRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-brand-muted">{member.quote_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                          member.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {member.is_active ? "פעיל" : "מושבת"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => resetPassword(member)}
                          className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-muted hover:bg-brand-grey disabled:opacity-50"
                        >
                          איפוס סיסמה
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || isSelf}
                          title={isSelf ? "אי אפשר להשבית את עצמך" : undefined}
                          onClick={() =>
                            patch(
                              member.id,
                              { isActive: !member.is_active },
                              member.is_active
                                ? `${member.full_name} הושבת`
                                : `${member.full_name} הופעל מחדש`
                            )
                          }
                          className="rounded-pill border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-muted hover:bg-brand-grey disabled:opacity-40"
                        >
                          {member.is_active ? "השבת" : "הפעל"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-brand-muted">
        השבתה חוסמת כניסה מיד בבקשה הבאה, וההצעות של הסוכן נשמרות. המנהל האחרון מוגן — אי אפשר להשבית
        אותו או להוריד אותו מתפקידו.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  dir,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  const id = `team-${label.replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-brand-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        dir={dir}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-right outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
      />
    </div>
  );
}
