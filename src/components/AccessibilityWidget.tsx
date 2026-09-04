"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The site's own accessibility toolbar.
 *
 * Israeli regulation (תקנות שוויון זכויות לאנשים עם מוגבלות, IS 5568 / WCAG
 * 2.0 AA) asks a business site for two things a visitor can find: a way to
 * adjust the page, and a statement saying what was done and whom to call.
 * This is the first; /he/accessibility is the second.
 *
 * Built here rather than pasted from a vendor for three reasons. A vendor
 * script is a third-party tag on every page, which the perf work on this site
 * spent weeks removing. It is a monthly fee for a panel of toggles. And a
 * panel that arrives as an iframe cannot be styled to match, so it looks like
 * exactly what it is — a sticker on the site rather than part of it.
 *
 * Every adjustment is a class on <html> (see globals.css, "Accessibility
 * widget"), so the CSS is the whole implementation and the state is a short
 * list of booleans plus a font scale. Persisted per browser in localStorage;
 * applied before first paint by the inline script in the root layout, so a
 * visitor who chose high contrast does not see a flash of the default page.
 */

export type A11yState = {
  fontScale: 0 | 1 | 2 | 3;
  contrast: boolean;
  links: boolean;
  readableFont: boolean;
  noMotion: boolean;
  bigCursor: boolean;
  lineHeight: boolean;
};

const DEFAULT: A11yState = {
  fontScale: 0,
  contrast: false,
  links: false,
  readableFont: false,
  noMotion: false,
  bigCursor: false,
  lineHeight: false,
};

export const A11Y_STORAGE_KEY = "ezorders-a11y";

/** The same mapping the inline bootstrap in layout.tsx applies. Keep the two in step. */
function apply(state: A11yState) {
  const root = document.documentElement;
  root.classList.toggle("a11y-contrast", state.contrast);
  root.classList.toggle("a11y-links", state.links);
  root.classList.toggle("a11y-font", state.readableFont);
  root.classList.toggle("a11y-no-motion", state.noMotion);
  root.classList.toggle("a11y-cursor", state.bigCursor);
  root.classList.toggle("a11y-line-height", state.lineHeight);
  root.style.setProperty("--a11y-font-scale", String([1, 1.15, 1.3, 1.5][state.fontScale]));
}

function load(): A11yState {
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<A11yState>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function save(state: A11yState) {
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode, or storage blocked — the page still adjusts, it just does not remember */
  }
}

const COPY = {
  he: {
    open: "פתיחת תפריט נגישות",
    close: "סגירה",
    title: "נגישות",
    fontSize: "גודל טקסט",
    smaller: "הקטנת טקסט",
    larger: "הגדלת טקסט",
    contrast: "ניגודיות גבוהה",
    links: "הדגשת קישורים",
    readableFont: "גופן קריא",
    lineHeight: "ריווח שורות",
    noMotion: "עצירת אנימציות",
    bigCursor: "סמן גדול",
    reset: "איפוס הגדרות",
    statement: "הצהרת נגישות",
    statementHref: "/he/accessibility",
    on: "פעיל",
    off: "כבוי",
  },
  en: {
    open: "Open accessibility menu",
    close: "Close",
    title: "Accessibility",
    fontSize: "Text size",
    smaller: "Smaller text",
    larger: "Larger text",
    contrast: "High contrast",
    links: "Highlight links",
    readableFont: "Readable font",
    lineHeight: "Line spacing",
    noMotion: "Stop animations",
    bigCursor: "Large cursor",
    reset: "Reset settings",
    statement: "Accessibility statement",
    statementHref: "/en/accessibility",
    on: "On",
    off: "Off",
  },
} as const;

type Toggle = Exclude<keyof A11yState, "fontScale">;

export function AccessibilityWidget({ locale = "he" }: { locale?: "he" | "en" }) {
  const t = COPY[locale];
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hydrate from storage after mount — the inline bootstrap already applied
  // the classes, this only brings the toggles in line with them.
  useEffect(() => {
    setState(load());
  }, []);

  const update = useCallback((patch: Partial<A11yState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      save(next);
      return next;
    });
  }, []);

  const toggle = (key: Toggle) => update({ [key]: !state[key] });
  const reset = () => update(DEFAULT);

  // Escape closes; focus returns to the button so keyboard users are not
  // dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  const toggles: { key: Toggle; label: string }[] = [
    { key: "contrast", label: t.contrast },
    { key: "links", label: t.links },
    { key: "readableFont", label: t.readableFont },
    { key: "lineHeight", label: t.lineHeight },
    { key: "noMotion", label: t.noMotion },
    { key: "bigCursor", label: t.bigCursor },
  ];

  return (
    <div
      // Bottom-start: the WhatsApp/other floating actions sit at the end side.
      className="a11y-widget fixed bottom-5 start-5 z-[70]"
      dir={locale === "he" ? "rtl" : "ltr"}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label={t.open}
        title={t.title}
        className="a11y-fab flex h-14 w-14 items-center justify-center rounded-full bg-brand-indigo text-white shadow-lg ring-2 ring-white transition hover:scale-105 focus-visible:outline-white"
      >
        {/* The universal access glyph */}
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="4" r="2" />
          <path d="M20 8.5a1 1 0 0 0-1.2-.8c-2.2.5-4.5.8-6.8.8s-4.6-.3-6.8-.8A1 1 0 0 0 4.7 9.7c1.6.4 3.3.6 4.9.7v3.2l-2.4 6.6a1 1 0 0 0 1.9.7l2.2-6h1.4l2.2 6a1 1 0 0 0 1.9-.7l-2.4-6.6v-3.2c1.7-.1 3.3-.3 4.9-.7A1 1 0 0 0 20 8.5z" />
        </svg>
      </button>

      {open ? (
        <div
          id="a11y-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t.title}
          className="absolute bottom-16 start-0 w-72 rounded-card border border-slate-200 bg-white p-4 text-brand-dark shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{t.title}</h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label={t.close}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-brand-muted hover:bg-brand-grey"
            >
              ×
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between rounded-xl bg-brand-grey px-3 py-2">
            <span className="text-sm font-medium">{t.fontSize}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update({ fontScale: Math.max(0, state.fontScale - 1) as A11yState["fontScale"] })}
                disabled={state.fontScale === 0}
                aria-label={t.smaller}
                className="h-8 w-8 rounded-lg bg-white text-lg font-bold shadow-sm disabled:opacity-40"
              >
                −
              </button>
              <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                {state.fontScale}
              </span>
              <button
                type="button"
                onClick={() => update({ fontScale: Math.min(3, state.fontScale + 1) as A11yState["fontScale"] })}
                disabled={state.fontScale === 3}
                aria-label={t.larger}
                className="h-8 w-8 rounded-lg bg-white text-lg font-bold shadow-sm disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <ul className="space-y-1">
            {toggles.map(({ key, label }) => {
              const on = state[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggle(key)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      on ? "bg-brand-tint font-semibold text-brand-pinkInk" : "hover:bg-brand-grey"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className={`relative h-5 w-9 rounded-full transition ${on ? "bg-brand-pinkStrong" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          on ? "start-4" : "start-0.5"
                        }`}
                      />
                    </span>
                    <span className="sr-only">{on ? t.on : t.off}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <button type="button" onClick={reset} className="font-medium text-brand-muted hover:text-brand-dark">
              {t.reset}
            </button>
            <a href={t.statementHref} className="font-medium text-brand-indigo underline underline-offset-2">
              {t.statement}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
