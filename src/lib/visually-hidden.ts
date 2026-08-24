import type { CSSProperties } from "react";

/**
 * Hides an element from sight while leaving it inside the document box.
 *
 * Do NOT reach for `left: -9999px` instead. Absolutely positioned against the
 * initial containing block, that offset falls outside the scrollable region
 * under `dir="ltr"` — but it IS the scroll direction under `dir="rtl"`, so it
 * opens a 9,999px strip of blank page on every Hebrew route. It shipped that
 * way on three separate honeypot fields before anyone noticed, because the
 * English pages looked perfect the whole time.
 *
 * Bots that fill forms programmatically still see and populate the field, so
 * honeypots keep working exactly as before.
 */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  opacity: 0,
};
