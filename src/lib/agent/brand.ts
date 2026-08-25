import "server-only";

/**
 * The EZOrders wordmark, inlined.
 *
 * The quote document is emailed, printed, saved to disk and hashed. An <img src>
 * pointing at the site would break in all four cases the moment the site moves,
 * the recipient reads the mail offline, or the asset is renamed — and a document
 * whose logo is a broken-image icon reads as a forgery. Inlining costs about 8KB
 * of markup per render and makes the file self-contained.
 *
 * Source: public/images/logo.png, redrawn from the 1024px master at 420px wide
 * and quantised to 32 colours. Displayed at 150px, so it stays sharp at print
 * resolution.
 */
export const LOGO_WIDTH = 420;
export const LOGO_HEIGHT = 135;

export const LOGO_DATA_URI =
  "data:image/png;base64," +
  "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" +
  "RK5CYII=";
