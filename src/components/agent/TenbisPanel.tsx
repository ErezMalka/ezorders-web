"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { TenbisAccount, TenbisState } from "@/lib/agent/tenbis";
import type { BranchSuggestion } from "@/lib/bite-branches";

/**
 * Setting up the תן ביס interface for a customer who bought it.
 *
 * The portal has been able to sell this since the catalogue was written and
 * has never been able to deliver one: the credentials came back by email and
 * somebody typed them into the operational system, with nothing tying them to
 * the order that sold them. This is where they land now.
 *
 * The one control that earns the whole panel is "בדיקת חיבור". It logs into
 * תן ביס with what was typed, and answers in five seconds — while the customer
 * is still on the phone — instead of three weeks later during onboarding, when
 * nobody remembers which password was sent.
 *
 * There is no way to read a stored password back, by design. The field is blank
 * on every load and submitting it blank leaves what is stored alone; an agent
 * who needs to know the credentials work asks for a check, which is a fact
 * about them rather than a copy of them.
 */

/** What the agent is looking at, and what happens next. A sentence, not a dot. */
function stateLine(account: TenbisAccount | null): { tone: Tone; text: string } {
  if (!account) {
    return { tone: "idle", text: "נמכר. עדיין לא נאספו פרטי התחברות." };
  }
  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }) : "";

  switch (account.state) {
    case "instructed":
      return {
        tone: "wait",
        text: `נשלחו הנחיות ללקוח${account.instructed_at ? ` ב־${when(account.instructed_at)}` : ""}. ממתינים לפרטי ההתחברות מתן ביס.`,
      };
    case "entered":
      return { tone: "wait", text: "הפרטים נשמרו ועדיין לא נבדקו. מומלץ ללחוץ על בדיקת חיבור." };
    case "verified":
      return {
        tone: "good",
        text: `החיבור נבדק ועובד${account.verified_at ? ` ב־${when(account.verified_at)}` : ""}. אפשר להעביר להקמה.`,
      };
    case "failed":
      return {
        tone: "bad",
        text: account.last_error
          ? `תן ביס דחו את הפרטים: ${account.last_error}`
          : "תן ביס דחו את הפרטים.",
      };
    case "delivered":
      return {
        tone: "good",
        text: `הועבר למערכת ההפעלה${account.delivered_at ? ` ב־${when(account.delivered_at)}` : ""}.`,
      };
    default:
      return { tone: "idle", text: "נמכר. עדיין לא נאספו פרטי התחברות." };
  }
}

type Tone = "idle" | "wait" | "good" | "bad";

const TONE: Record<Tone, string> = {
  idle: "border-slate-200 bg-slate-50 text-brand-muted",
  wait: "border-amber-200 bg-amber-50 text-amber-900",
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  bad: "border-rose-200 bg-rose-50 text-rose-900",
};

const STATE_LABEL: Record<TenbisState, string> = {
  sold: "נמכר",
  instructed: "נשלחו הנחיות",
  entered: "ממתין לבדיקה",
  verified: "נבדק ועובד",
  failed: "נדחה",
  delivered: "הועבר להקמה",
};

/** What the customer has to go and ask תן ביס for. */
function instructions(customerName: string): string {
  return [
    `שלום${customerName ? ` ${customerName}` : ""},`,
    "",
    "כדי לחבר את המערכת לתן ביס נצטרך מכם שלושה פרטים, שמתקבלים מהתמיכה של תן ביס:",
    "",
    "1. שם משתמש לממשק (API / ממשק מסעדות)",
    "2. סיסמה",
    "3. מזהה המסעדה (Restaurant ID)",
    "",
    "אפשר לבקש אותם מנציג תן ביס שלכם, ולציין שמדובר בחיבור לממשק הזמנות.",
    "ברגע שיש לכם את השלושה — שלחו לנו אותם ונשלים את ההקמה.",
  ].join("\n");
}

export function TenbisPanel({
  orderId,
  customerName,
  configured,
  account: initial,
}: {
  orderId: string;
  customerName: string;
  configured: boolean;
  account: TenbisAccount | null;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<TenbisAccount | null>(initial);
  const [user, setUser] = useState(initial?.tenbis_user ?? "");
  const [restaurantId, setRestaurantId] = useState(initial?.restaurant_id ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "save" | "verify" | "instruct" | "branch">(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The branch half. `branch` is what has been confirmed, `suggestions` is what
  // the phone number proposes, and `picking` is whether the agent is looking at
  // the second — three separate things, because "we have not looked yet" and
  // "we looked and found nothing" must not render the same.
  const [branch, setBranch] = useState<BranchSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<BranchSuggestion[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [manualId, setManualId] = useState("");
  const [crmOff, setCrmOff] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const state = stateLine(account);

  /**
   * Ask which branches share this customer's phone.
   *
   * `quiet` is the load that happens on mount to put a name beside an id
   * confirmed weeks ago: it must not open the picker, and it must not report
   * the CRM being down — nobody asked it anything.
   */
  const lookupBranch = useCallback(
    async (quiet: boolean) => {
      if (!quiet) {
        setBusy("branch");
        setBranchError(null);
      }
      try {
        const res = await fetch(`/api/agent/orders/${orderId}/tenbis/branch`);
        const json = (await res.json()) as {
          crmConfigured?: boolean;
          suggestions?: BranchSuggestion[];
          current?: BranchSuggestion | null;
          error?: string;
        };
        if (!res.ok) throw new Error(String(json.error ?? "לא הצלחנו לאתר את הסניף"));

        if (json.current) setBranch(json.current);
        if (quiet) return;

        setCrmOff(json.crmConfigured === false);
        setSuggestions(json.suggestions ?? []);
        setPicking(true);
      } catch (e) {
        if (!quiet) setBranchError(e instanceof Error ? e.message : "לא הצלחנו לאתר את הסניף");
      } finally {
        if (!quiet) setBusy(null);
      }
    },
    [orderId],
  );

  // A stored id is a number until somebody says which restaurant it is. One
  // request on mount, and only when there is something to resolve.
  useEffect(() => {
    if (initial?.bite_branch_id) void lookupBranch(true);
  }, [initial?.bite_branch_id, lookupBranch]);

  /** Record the branch a person just pointed at. */
  const confirmBranch = async (id: number | null) => {
    setBusy("branch");
    setBranchError(null);
    try {
      const res = await fetch(`/api/agent/orders/${orderId}/tenbis/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biteBranchId: id }),
      });
      const json = (await res.json()) as {
        account?: TenbisAccount;
        current?: BranchSuggestion | null;
        error?: string;
      };
      if (!res.ok) throw new Error(String(json.error ?? "שמירת הסניף נכשלה"));

      if (json.account) setAccount(json.account);
      setBranch(json.current ?? (id === null ? null : { biteBranchId: id, franchiseId: null, franchiseName: null, branchPhone: null }));
      setPicking(false);
      setSuggestions(null);
      setManualId("");
      router.refresh();
    } catch (e) {
      setBranchError(e instanceof Error ? e.message : "שמירת הסניף נכשלה");
    } finally {
      setBusy(null);
    }
  };

  if (!configured) {
    return (
      <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-brand-dark">ממשק תן ביס</h2>
        <p className="text-sm text-brand-muted">
          החיבור לתן ביס אינו מוגדר במערכת. יש להגדיר את מפתח ההצפנה
          (<code className="rounded bg-brand-grey px-1">TENBIS_ENC_KEY</code>) לפני שאפשר לשמור פרטי לקוחות.
        </p>
      </section>
    );
  }

  const post = async (path: string, body?: unknown) => {
    const res = await fetch(`/api/agent/orders/${orderId}/tenbis${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return { res, json: (await res.json()) as Record<string, unknown> };
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    setNote(null);
    try {
      const { res, json } = await post("", {
        user,
        restaurantId,
        // Blank means "leave what is stored alone", which is why it is omitted
        // rather than sent as an empty string.
        ...(password ? { password } : {}),
      });
      if (!res.ok) throw new Error(String(json.error ?? "השמירה נכשלה"));
      setAccount(json.account as TenbisAccount);
      setPassword("");
      setNote("הפרטים נשמרו.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy("verify");
    setError(null);
    setNote(null);
    try {
      const { res, json } = await post("/verify");
      if (!res.ok) throw new Error(String(json.error ?? "הבדיקה נכשלה"));

      if (json.ok) {
        setNote("החיבור לתן ביס תקין.");
      } else if (json.blame === "service") {
        // Not the customer's problem, and the wording has to make that obvious
        // or somebody will phone a restaurant about our outage.
        setError(`${String(json.message)} (לא קשור לפרטי הלקוח — אפשר לנסות שוב בהמשך)`);
      } else {
        setError(String(json.message));
      }
      router.refresh();
      // The row's state changed underneath us; re-read it rather than guess.
      const fresh = await fetch(`/api/agent/orders/${orderId}/tenbis`);
      if (fresh.ok) {
        const data = (await fresh.json()) as { account: TenbisAccount | null };
        setAccount(data.account);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "הבדיקה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const copyInstructions = async () => {
    const text = instructions(customerName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("לא הצלחנו להעתיק. אפשר לסמן את הטקסט ולהעתיק ידנית.");
      return;
    }
    // Recording that the customer was told is what turns "nothing happened yet"
    // into "waiting on them", which is the difference the provisioning list is
    // there to show.
    setBusy("instruct");
    try {
      const { res, json } = await post("/instruct");
      if (res.ok) setAccount(json.account as TenbisAccount);
      router.refresh();
    } catch {
      // The copy is what the agent asked for and it worked. Failing to record
      // it is not worth an error message over.
    } finally {
      setBusy(null);
    }
  };

  const canVerify = !!account?.hasPassword && !!account.tenbis_user && !!account.restaurant_id;

  return (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-brand-dark">ממשק תן ביס</h2>
        <span className="rounded-pill border border-slate-200 px-3 py-1 text-xs font-semibold text-brand-muted">
          {STATE_LABEL[account?.state ?? "sold"]}
        </span>
      </div>

      <p className={`mb-4 rounded-card border px-3 py-2 text-sm ${TONE[state.tone]}`}>{state.text}</p>

      <div className="mb-4">
        <button
          type="button"
          onClick={copyInstructions}
          disabled={busy !== null}
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey disabled:opacity-50"
        >
          {copied ? "✓ ההנחיות הועתקו" : "העתקת הנחיות ללקוח"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-brand-muted">
          שם משתמש
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            dir="ltr"
            className="mt-1 w-full rounded-card border border-slate-200 px-3 py-2 text-sm text-brand-dark"
          />
        </label>
        <label className="text-xs font-semibold text-brand-muted">
          סיסמה
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder={account?.hasPassword ? "•••••••• (שמורה)" : ""}
            className="mt-1 w-full rounded-card border border-slate-200 px-3 py-2 text-sm text-brand-dark"
          />
        </label>
        <label className="text-xs font-semibold text-brand-muted">
          מזהה מסעדה
          <input
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            dir="ltr"
            className="mt-1 w-full rounded-card border border-slate-200 px-3 py-2 text-sm text-brand-dark"
          />
        </label>
      </div>

      {account?.hasPassword ? (
        <p className="mt-2 text-xs text-brand-muted">
          הסיסמה שמורה ומוצפנת ואינה ניתנת לצפייה. השארת השדה ריק לא תמחק אותה.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy !== null || !user.trim() || !restaurantId.trim()}
          className="rounded-pill bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {busy === "save" ? "שומר…" : "שמירה"}
        </button>
        <button
          type="button"
          onClick={verify}
          disabled={busy !== null || !canVerify}
          title={canVerify ? undefined : "צריך שם משתמש, סיסמה ומזהה מסעדה שמורים"}
          className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey disabled:opacity-50"
        >
          {busy === "verify" ? "בודק מול תן ביס…" : "בדיקת חיבור"}
        </button>
      </div>

      {/* ── The branch, suggested and confirmed ──────────────────────────────
          EZORDERS holds no Bite branch id — a second branch is a second quote
          with identical details — and delivery has to write against exactly
          one. The CRM's branch cache knows it from the phone, but a chain with
          four branches on one number is ordinary, so this proposes and a person
          decides. What is stored afterwards is a fact, not a guess. */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-brand-dark">סניף במערכת התפעולית</h3>
          {branch ? (
            <button
              type="button"
              onClick={() => void lookupBranch(false)}
              disabled={busy !== null}
              className="text-xs font-semibold text-brand-muted underline underline-offset-4 disabled:opacity-50"
            >
              שינוי
            </button>
          ) : null}
        </div>

        {branch ? (
          <p className="mt-2 text-sm text-brand-dark">
            <span className="font-semibold">{branch.franchiseName ?? "סניף"}</span>
            <span className="mx-1 text-brand-muted">·</span>
            <span dir="ltr" className="tabular-nums text-brand-muted">
              #{branch.biteBranchId}
            </span>
            {branch.branchPhone ? (
              <span dir="ltr" className="ms-2 text-xs text-brand-muted">
                {branch.branchPhone}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-brand-muted">
            עדיין לא נקבע סניף. בלעדיו אפשר להשלים הכול חוץ מההעברה האוטומטית להקמה.
          </p>
        )}

        {!branch && !picking ? (
          <button
            type="button"
            onClick={() => void lookupBranch(false)}
            disabled={busy !== null}
            className="mt-3 rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey disabled:opacity-50"
          >
            {busy === "branch" ? "מחפש…" : "איתור סניף לפי הטלפון"}
          </button>
        ) : null}

        {picking ? (
          <div className="mt-3 space-y-2">
            {suggestions && suggestions.length > 0 ? (
              <>
                <p className="text-xs text-brand-muted">
                  {suggestions.length === 1
                    ? "נמצא סניף אחד עם הטלפון של ההזמנה. כדאי לוודא שזה הוא:"
                    : `נמצאו ${suggestions.length} סניפים עם אותו טלפון. צריך לבחור את הנכון:`}
                </p>
                <ul className="space-y-2">
                  {suggestions.map((s) => (
                    <li
                      key={s.biteBranchId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-slate-200 px-3 py-2"
                    >
                      <span className="text-sm text-brand-dark">
                        <span className="font-semibold">{s.franchiseName ?? "ללא שם"}</span>
                        <span className="mx-1 text-brand-muted">·</span>
                        <span dir="ltr" className="tabular-nums text-brand-muted">
                          #{s.biteBranchId}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void confirmBranch(s.biteBranchId)}
                        disabled={busy !== null}
                        className="rounded-pill bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        זה הסניף
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-brand-muted">
                {crmOff
                  ? "החיבור ל-CRM אינו מוגדר, ולכן אי אפשר לחפש לפי טלפון. אפשר להזין את מזהה הסניף ידנית."
                  : "לא נמצא סניף עם הטלפון של ההזמנה. אפשר להזין את המזהה ידנית מהמערכת התפעולית."}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value.replace(/\D+/g, ""))}
                inputMode="numeric"
                dir="ltr"
                placeholder="מזהה סניף"
                className="w-32 rounded-card border border-slate-200 px-3 py-2 text-sm text-brand-dark"
              />
              <button
                type="button"
                onClick={() => void confirmBranch(Number(manualId))}
                disabled={busy !== null || !manualId}
                className="rounded-pill border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-grey disabled:opacity-50"
              >
                שמירת מזהה
              </button>
              <button
                type="button"
                onClick={() => {
                  setPicking(false);
                  setSuggestions(null);
                  setBranchError(null);
                }}
                disabled={busy !== null}
                className="text-xs font-semibold text-brand-muted underline underline-offset-4 disabled:opacity-50"
              >
                ביטול
              </button>
              {branch ? (
                <button
                  type="button"
                  onClick={() => void confirmBranch(null)}
                  disabled={busy !== null}
                  className="text-xs font-semibold text-rose-700 underline underline-offset-4 disabled:opacity-50"
                >
                  הסרת הסניף
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {branchError ? <p className="mt-2 text-sm font-semibold text-rose-700">{branchError}</p> : null}
      </div>

      {note ? <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
