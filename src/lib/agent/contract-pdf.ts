import "server-only";

import { PDF_FONT_CSS } from "./contract-pdf-font";

/**
 * The signed contract as a PDF.
 *
 * Rendered by the same engine that renders it on screen — headless Chromium,
 * printing the very HTML the customer read. Any other route to a PDF (a layout
 * library, a template redrawn in a drawing API) would be a second opinion about
 * what the contract looks like, and this is the one document where there must
 * only be one.
 *
 * WHAT THIS IS NOT ALLOWED TO DO
 *
 * Fail loudly. A signature is already recorded by the time this runs; a browser
 * that would not start, a font that would not load, a page that took too long —
 * none of those may turn a signed contract into an error. Every failure returns
 * null, the caller attaches the HTML instead, and the customer gets their copy.
 */

/**
 * Only what this file uses, spelled out.
 *
 * The two packages are imported dynamically so a checkout without them still
 * builds, which means their own types are not in hand at compile time. Naming
 * the four calls we make is more honest than `any`, and it breaks loudly if one
 * of them changes shape.
 */
interface Page {
  setContent(html: string, options: { waitUntil: string; timeout: number }): Promise<void>;
  evaluateHandle(script: string): Promise<unknown>;
  pdf(options: Record<string, unknown>): Promise<Uint8Array>;
}
interface Browser {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}
interface Puppeteer {
  launch(options: Record<string, unknown>): Promise<Browser>;
}
interface Chromium {
  args: string[];
  executablePath(): Promise<string>;
}

/** How long we are willing to wait before deciding the browser is not coming. */
const TIMEOUT_MS = 20_000;

export async function renderContractPdf(html: string): Promise<Buffer | null> {
  let browser: Browser | null = null;
  try {
    // A launch that times out has not necessarily failed — it may still be
    // coming. Whatever it hands back after we have given up gets closed, or a
    // warm instance accumulates browsers nobody is using.
    const pending = launch();
    const launched = await withTimeout(pending, TIMEOUT_MS, "launch");
    if (!launched) {
      void pending.then((late) => late?.browser.close()).catch(() => {});
      return null;
    }
    browser = launched.browser;

    const page = await launched.browser.newPage();
    // No network at all. Everything the document needs — the logo, the
    // signature, now the typeface — is already inside it as a data URI, and a
    // request that hangs is the difference between a copy and a timeout.
    await page.setContent(withPdfFont(html), { waitUntil: "load", timeout: TIMEOUT_MS });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      // The document's own print rules already inset the page horizontally.
      // Doubling that here would give the contract a two-inch gutter.
      margin: { top: "12mm", bottom: "14mm", left: "0", right: "0" },
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } catch (error) {
    console.error("[contract-pdf] could not render", error);
    return null;
  } finally {
    // A browser left running on a warm serverless instance is a memory leak
    // that outlives the request that made it.
    try {
      await browser?.close();
    } catch {
      // Nothing useful to do about a browser that will not shut down.
    }
  }
}

/**
 * Everything the on-screen document deliberately does not carry.
 *
 * Injected last so it wins the cascade, and injected into a copy so the bytes
 * that were hashed stay exactly the bytes that were hashed.
 */
function withPdfFont(html: string): string {
  return html.includes("</head>")
    ? html.replace("</head>", `${PDF_FONT_CSS}\n</head>`)
    : PDF_FONT_CSS + html;
}

/**
 * Start a browser, wherever this happens to be running.
 *
 * Imported dynamically, and on purpose: on a machine without these packages —
 * a developer's checkout, a CI job that only typechecks — the import fails, the
 * catch returns null, and everything else still works. A contract system must
 * not stop working because a printing library did.
 */
async function launch(): Promise<{ browser: Browser } | null> {
  try {
    const puppeteer = (await import("puppeteer-core")).default as unknown as Puppeteer;

    // A local checkout points at whatever Chrome it already has.
    const local = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (local) {
      return {
        browser: await puppeteer.launch({
          executablePath: local,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
          headless: true,
        }),
      };
    }

    const chromium = (await import("@sparticuz/chromium")).default as unknown as Chromium;
    return {
      browser: await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      }),
    };
  } catch (error) {
    console.error("[contract-pdf] no browser available", error);
    return null;
  }
}

/** Whatever goes wrong, it goes wrong within a bounded number of seconds. */
async function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.error(`[contract-pdf] ${what} timed out after ${ms}ms`);
          resolve(null);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
