import { BASE_SETUP_LABEL, GROUP_LABELS, fmt, type ItemGroup } from "@/lib/pricing";

import { LOGO_DATA_URI, LOGO_HEIGHT, LOGO_WIDTH } from "./brand";

/**
 * The quote document, as a standalone HTML string.
 *
 * Deliberately not a React component. This exact markup is used in two places
 * that must produce the same page:
 *
 *   - /he/agent/quotes/<id>/print — what the agent sees and can print
 *   - the PDF route              — headless Chrome renders this string
 *
 * If the two ever diverged, the agent would be approving one document and the
 * customer receiving another. One template, no props threading, no client
 * bundle: a plain string is the cheapest way to guarantee that.
 *
 * Hebrew is written right-to-left and the document is full of Latin product
 * names and Western-Arabic numerals, so the direction handling is not
 * incidental. `dir="rtl"` on <html> sets the paragraph direction; every numeric
 * cell is additionally wrapped so a figure like "₪1,295" cannot be reordered by
 * the bidi algorithm when it sits next to Hebrew text.
 */

export interface QuoteDocumentItem {
  label: string;
  note?: string | null;
  item_group: ItemGroup;
  quantity: number;
  /** Per-unit one-time price. Shown for hardware, where "2 × ₪1,200" is the fact. */
  setup_unit?: number;
  /**
   * Site-relative path to a photo, for hardware.
   *
   * Absolute-URL'd rather than inlined, unlike the logo. The logo is the
   * document's identity — a broken one reads as a forgery, so it is worth 8KB
   * in every render. A missing product photo is cosmetic, and inlining three
   * of them would put 60KB into a page that is mostly a table.
   */
  image?: string | null;
  setup_total: number;
  monthly_total: number;
  /** The catalogue's per-unit prices on the day. Layout 2 prints them beside the given ones. */
  list_setup_unit?: number;
  list_monthly_unit?: number;
}

export interface QuoteDocumentData {
  quoteNumber: string;
  issuedAt: Date;
  validUntil: Date;

  customerName: string;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerTaxId?: string | null;

  agentName: string;
  agentEmail?: string | null;

  items: QuoteDocumentItem[];

  /** The mandatory base charge, so an old document keeps the fee it was issued with. */
  baseSetup?: number;
  /** What the list said for the base charge, when the agent changed it. Layout 2 only. */
  listBaseSetup?: number;
  /**
   * 1 — the original document.
   * 2 — equipment, then setup, then monthly, each reconciled list → discount → to pay.
   * Frozen per quote: an accepted quote was hashed as rendered. Absent means 1.
   */
  layoutVersion?: number;
  setupTotal: number;
  /** Physical goods, one-time. Charged and presented apart from setup. */
  hardwareTotal?: number;
  monthlyEligible: number;
  discountPercent: number;
  discountAmount: number;
  monthlyNonEligible: number;
  monthlyTotal: number;
  /**
   * Kept on the record, printed nowhere.
   *
   * Every price this document states is before VAT, and it says so once in the
   * terms. A rate reprinted beside each line is a rate that will be wrong the
   * next time the law changes, on a document somebody already filed. The term
   * is here for the same reason: the quote no longer states one, because there
   * is no minimum commitment to state.
   */
  vatPercent: number;
  termMonths: number;

  notes?: string | null;

  /**
   * Absolute origin, so product photos resolve in a saved or forwarded copy.
   * When absent the paths stay relative, which is correct for /q/<token> —
   * that page is served from the site itself.
   */
  siteUrl?: string | null;
}

const HE_DATE = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Wrap a figure so bidi reordering cannot rearrange it beside Hebrew text. */
function num(value: string): string {
  return `<span class="num" dir="ltr">${escapeHtml(value)}</span>`;
}

export function renderQuoteDocument(data: QuoteDocumentData): string {
  return (data.layoutVersion ?? 1) >= 2 ? renderQuoteDocumentV2(data) : renderQuoteDocumentV1(data);
}

/**
 * Layout 1. Byte-for-byte what it was before layout 2 existed — eight accepted
 * quotes carry a SHA-256 of this output, so it is not edited, only kept.
 */
function renderQuoteDocumentV1(data: QuoteDocumentData): string {
  const {
    setupTotal,
    monthlyEligible,
    discountPercent,
    discountAmount,
    monthlyNonEligible,
    monthlyTotal,
  } = data;

  const annualSaving = discountAmount * 12;

  const hardwareTotal = data.hardwareTotal ?? 0;

  // The document is read by someone deciding whether to sign, and the question
  // they are actually asking is "what does this cost me, and when". So the lines
  // are grouped by WHEN they are paid rather than by which section of the
  // calculator produced them: once at the start, every month, and — separately —
  // the physical goods, which are bought rather than installed.
  //
  // A component with both a setup fee and a monthly fee appears in two blocks,
  // with the relevant half of its price in each. That is deliberate: showing
  // ₪490 and ₪350 on one row invites the reader to add them together.
  const softwareLines = data.items.filter((i) => i.item_group !== "hardware");
  const hardwareLines = data.items.filter((i) => i.item_group === "hardware");

  // Relative on /q/<token>, absolute everywhere the document might be saved.
  const origin = (data.siteUrl ?? "").replace(/\/+$/, "");
  const imageSrc = (path: string) => (origin ? origin + path : path);

  const setupLines = softwareLines.filter((i) => i.setup_total > 0);
  const monthlyLines = softwareLines.filter((i) => i.monthly_total > 0);

  const lineRow = (item: QuoteDocumentItem, amount: number) => `
          <tr>
            <td>
              ${escapeHtml(item.label)}
              ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
              <div class="sub">${escapeHtml(GROUP_LABELS[item.item_group])}</div>
            </td>
            <td class="c">${num(String(item.quantity))}</td>
            <td class="c">${num(fmt(amount))}</td>
          </tr>`;

  const setupBlock = `
  <div class="block">
    <h2>1 · הקמה והטמעה<span class="when">תשלום חד־פעמי</span></h2>
    <table>
      <thead><tr><th>רכיב</th><th class="q">כמות</th><th class="c">סכום</th></tr></thead>
      <tbody>
        <tr>
          <td><b>${escapeHtml(BASE_SETUP_LABEL)}</b></td>
          <td class="c">${num("1")}</td>
          <td class="c">${num(fmt(data.baseSetup ?? 0))}</td>
        </tr>
        ${setupLines.map((item) => lineRow(item, item.setup_total)).join("")}
      </tbody>
    </table>
    <div class="sum"><span>סה״כ הקמה</span>${num(fmt(setupTotal))}</div>
  </div>`;

  const monthlyBlock = `
  <div class="block">
    <h2>2 · תשלום חודשי<span class="when">מדי חודש, לאורך התקופה</span></h2>
    <table>
      <thead><tr><th>רכיב</th><th class="q">כמות</th><th class="c">לחודש</th></tr></thead>
      <tbody>
        ${
          monthlyLines.length > 0
            ? monthlyLines.map((item) => lineRow(item, item.monthly_total)).join("")
            : `<tr><td colspan="3" class="muted-cell">אין רכיבים בתשלום חודשי</td></tr>`
        }
      </tbody>
    </table>
    <div class="sum"><span>סה״כ חודשי לפני הנחה</span>${num(fmt(monthlyEligible + monthlyNonEligible))}</div>
  </div>`;

  // Rendered only when something physical was sold. An empty hardware block on a
  // software-only quote is a question the reader has to answer for themselves.
  const hardwareBlock =
    hardwareLines.length === 0
      ? ""
      : `
  <div class="block">
    <h2>3 · מוצרים וחומרה<span class="when">תשלום חד־פעמי, ללא הנחה</span></h2>
    <table>
      <thead>
        <tr><th>מוצר</th><th class="q">כמות</th><th class="c">ליחידה</th><th class="c">סכום</th></tr>
      </thead>
      <tbody>
        ${hardwareLines
          .map(
            (item) => `
        <tr>
          <td>
            <div class="prod">
              ${item.image ? `<img class="shot" src="${escapeHtml(imageSrc(item.image))}" alt="">` : ""}
              <div>
                ${escapeHtml(item.label)}
                ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
              </div>
            </div>
          </td>
          <td class="c">${num(String(item.quantity))}</td>
          <td class="c">${num(fmt(item.setup_unit ?? item.setup_total / Math.max(1, item.quantity)))}</td>
          <td class="c">${num(fmt(item.setup_total))}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <div class="sum"><span>סה״כ מוצרים</span>${num(fmt(hardwareTotal))}</div>
  </div>`;

  const blocks = setupBlock + monthlyBlock + hardwareBlock;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>הצעת מחיר ${escapeHtml(data.quoteNumber)} — EZOrders</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Rubik, Arial, sans-serif;
    font-size: 12.5px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #eef1f5;
  }
  .page {
    max-width: 780px;
    margin: 0 auto;
    background: #fff;
    padding: 40px 44px;
  }
  .num { font-variant-numeric: tabular-nums; unicode-bidi: isolate; }

  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #F05D86; padding-bottom: 16px; margin-bottom: 22px; }
  .brand img { display: block; width: 150px; height: auto; }
  .prod { display: flex; align-items: flex-start; gap: 10px; }
  /* Taller than wide: a kiosk on a stand is roughly 1:3, and a square box
     shrinks it to a smudge. */
  .shot { width: 46px; height: 66px; object-fit: contain; flex: 0 0 auto;
          border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; padding: 2px; }
  .meta { text-align: left; font-size: 11.5px; color: #4b5563; line-height: 1.9; }
  .meta b { color: #111827; }

  h1 { font-size: 19px; margin: 0 0 18px; font-weight: 700; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .box { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 10px; padding: 13px 15px; }
  .box h2 { margin: 0 0 7px; font-size: 10.5px; letter-spacing: .4px; color: #6b7280; font-weight: 600; }
  .box .line { font-size: 12px; color: #374151; }
  .box .line b { color: #111827; }

  .block { margin-top: 20px; break-inside: avoid; }
  .block:first-of-type { margin-top: 0; }
  .block > h2 { margin: 0 0 7px; font-size: 12.5px; font-weight: 700; color: #191D2A;
                display: flex; justify-content: space-between; align-items: baseline; }
  .block > h2 .when { font-size: 10.5px; font-weight: 500; color: #6b7280; }
  .block .sum { display: flex; justify-content: space-between; padding: 8px 11px;
                background: #F8FAFC; border-top: 1px solid #E5E7EB;
                font-size: 12px; font-weight: 700; color: #111827; }

  table { width: 100%; border-collapse: collapse; }
  thead th { background: #191D2A; color: #fff; font-size: 11px; font-weight: 600;
             padding: 9px 11px; text-align: right; }
  thead th.c { width: 100px; }
  thead th.q { width: 58px; }
  tbody td { padding: 8px 11px; border-bottom: 1px solid #EEF1F5; font-size: 12px; vertical-align: top; }
  tbody td.c { text-align: right; }
  .sub { font-size: 10.5px; color: #6b7280; }
  .group-row td { background: #F8FAFC; font-weight: 700; font-size: 11px;
                  color: #4b5563; padding: 6px 11px; }
  .muted-cell { color: #9ca3af; }

  .totals { width: 330px; margin-inline-start: auto; margin-top: 18px; font-size: 12.5px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; color: #374151; }
  .totals .row.section { border-top: 1px solid #E5E7EB; margin-top: 10px; padding-top: 9px;
                         font-weight: 700; color: #111827; }
  .totals .row.grand { border-top: 2px solid #F05D86; margin-top: 8px; padding-top: 10px;
                       font-size: 15.5px; font-weight: 700; color: #111827; }
  .totals .row.save { color: #0F7A4F; }
  .totals .row.faint { color: #6b7280; }
  .spacer { height: 14px; }

  .saving { clear: both; margin-top: 18px; background: #E6F5EE; border-radius: 10px;
            padding: 11px 16px; font-size: 12px; color: #0F7A4F; font-weight: 600; }
  .notes { margin-top: 20px; background: #F8FAFC; border-inline-start: 3px solid #F05D86;
           padding: 13px 16px; border-radius: 0 10px 10px 0; font-size: 12px;
           color: #374151; white-space: pre-wrap; }
  .notes h2 { margin: 0 0 5px; font-size: 11.5px; color: #111827; font-weight: 700; }
  .terms { margin-top: 20px; font-size: 10.5px; color: #6b7280; line-height: 1.9;
           border-top: 1px solid #E5E7EB; padding-top: 13px; }
  .sign { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .sign div { border-top: 1px solid #9CA3AF; padding-top: 7px; font-size: 11px; color: #6b7280; }

  @media print {
    body { background: #fff; }
    .page { max-width: none; padding: 0; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .totals, .saving, .notes, .terms, .sign { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">
      <img src="${LOGO_DATA_URI}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="EZOrders">
    </div>
    <div class="meta">
      <div>הצעת מחיר <b>${escapeHtml(data.quoteNumber)}</b></div>
      <div>תאריך: <b>${num(HE_DATE.format(data.issuedAt))}</b></div>
      <div>בתוקף עד: <b>${num(HE_DATE.format(data.validUntil))}</b></div>
    </div>
  </header>

  <h1>הצעת מחיר</h1>

  <div class="parties">
    <div class="box">
      <h2>לכבוד</h2>
      <div class="line">
        <b>${escapeHtml(data.customerName)}</b>
        ${data.customerContact ? `<br>לידי: ${escapeHtml(data.customerContact)}` : ""}
        ${data.customerPhone ? `<br>טלפון: ${num(data.customerPhone)}` : ""}
        ${data.customerEmail ? `<br>${escapeHtml(data.customerEmail)}` : ""}
        ${data.customerTaxId ? `<br>ח.פ: ${num(data.customerTaxId)}` : ""}
      </div>
    </div>
    <div class="box">
      <h2>מאת</h2>
      <div class="line">
        <b>EZOrders</b>
        <br>סוכן מטפל: ${escapeHtml(data.agentName)}
        ${data.agentEmail ? `<br>${escapeHtml(data.agentEmail)}` : ""}
      </div>
    </div>
  </div>

  ${blocks}

  <div class="totals">
    <div class="row"><span>סה״כ הקמה (חד פעמי)</span>${num(fmt(setupTotal))}</div>
    ${
      hardwareTotal > 0
        ? `<div class="row"><span>מוצרים וחומרה (חד פעמי)</span>${num(fmt(hardwareTotal))}</div>`
        : ""
    }
    ${
      hardwareTotal > 0
        ? `<div class="row section"><span>סה״כ לתשלום מיידי</span>${num(fmt(setupTotal + hardwareTotal))}</div>`
        : ""
    }

    <div class="spacer"></div>

    <div class="row"><span>חודשי זכאי להנחה</span>${num(fmt(monthlyEligible))}</div>
    ${
      discountPercent > 0
        ? `<div class="row save"><span>הנחה ${discountPercent}%</span>${num("−" + fmt(discountAmount))}</div>`
        : ""
    }
    ${
      monthlyNonEligible > 0
        ? `<div class="row faint"><span>רכיבים ללא הנחה</span>${num("+" + fmt(monthlyNonEligible))}</div>`
        : ""
    }
    <div class="row grand"><span>סה״כ חודשי</span>${num(fmt(monthlyTotal))}</div>
  </div>

  ${
    discountAmount > 0
      ? `<div class="saving">החיסכון שלכם: ${num(fmt(discountAmount))} בכל חודש — ${num(fmt(annualSaving))} בשנה</div>`
      : ""
  }

  ${data.notes ? `<div class="notes"><h2>הערות ותנאים</h2>${escapeHtml(data.notes)}</div>` : ""}

  <div class="terms">
    ההצעה בתוקף עד ${num(HE_DATE.format(data.validUntil))}. כל המחירים נקובים בשקלים חדשים ואינם כוללים מע״מ.
    המחיר מתייחס לסניף בודד — ברשת עם מספר סניפים, כל סניף מחויב ומחושב בנפרד.
    אין התחייבות לתקופה מינימלית; סיום ההתקשרות בהודעה של 60 יום מראש.
    ההנחה החודשית מחושבת על רכיבי הליבה והתוספות הכלולות בלבד, ונקבעת לפי מדרגת החודשי הזכאי במועד החתימה.
  </div>

  <div class="sign">
    <div>חתימת הלקוח + חותמת</div>
    <div>תאריך אישור</div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Layout 2.
 *
 * The reader is deciding whether to sign, and the question they are asking is
 * "what does this cost me, when, and what am I getting off". So the document
 * is three blocks in the order the money leaves — equipment, setup, monthly —
 * and every block reconciles the same way: the list, the discount, the figure
 * to pay. A summary at the end puts the three side by side.
 *
 * "Discount" here is everything between the list and the deal: a price the
 * agent set below the list on a line, and the volume tier on the monthly.
 * Both are shown as money off, because that is what they are to the customer.
 */
function renderQuoteDocumentV2(data: QuoteDocumentData): string {
  const hardwareTotal = data.hardwareTotal ?? 0;
  const baseSetup = data.baseSetup ?? 0;
  const listBaseSetup = data.listBaseSetup ?? baseSetup;

  const origin = (data.siteUrl ?? "").replace(/\/+$/, "");
  const imageSrc = (path: string) => (origin ? origin + path : path);

  // Per-unit list prices, falling back to the given price for a row that
  // predates the list columns — such a row was priced from the list anyway.
  const listSetupOf = (i: QuoteDocumentItem) =>
    i.list_setup_unit ?? i.setup_unit ?? i.setup_total / Math.max(1, i.quantity);
  const listMonthlyOf = (i: QuoteDocumentItem) =>
    i.list_monthly_unit ?? i.monthly_total / Math.max(1, i.quantity);
  const setupUnitOf = (i: QuoteDocumentItem) => i.setup_unit ?? i.setup_total / Math.max(1, i.quantity);
  const monthlyUnitOf = (i: QuoteDocumentItem) => i.monthly_total / Math.max(1, i.quantity);

  const hardwareLines = data.items.filter((i) => i.item_group === "hardware");
  const softwareLines = data.items.filter((i) => i.item_group !== "hardware");
  const setupLines = softwareLines.filter((i) => i.setup_total > 0 || listSetupOf(i) > 0);
  const monthlyLines = softwareLines.filter((i) => i.monthly_total > 0 || listMonthlyOf(i) > 0);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // Equipment: list vs given.
  const hardwareList = sum(hardwareLines.map((i) => listSetupOf(i) * i.quantity));
  const hardwareDiscount = Math.max(0, hardwareList - hardwareTotal);

  // Setup: base + lines, list vs given. data.setupTotal is the figure of record.
  const setupList = listBaseSetup + sum(setupLines.map((i) => listSetupOf(i) * i.quantity));
  const setupDiscount = Math.max(0, setupList - data.setupTotal);

  // Monthly: list → line reductions → gross → tier → to pay.
  const monthlyList = sum(monthlyLines.map((i) => listMonthlyOf(i) * i.quantity));
  const monthlyGross = data.monthlyEligible + data.monthlyNonEligible;
  const monthlyLineDiscount = Math.max(0, monthlyList - monthlyGross);
  const monthlyDiscount = monthlyLineDiscount + data.discountAmount;

  const oneTimeList = hardwareList + setupList;
  const oneTimeDiscount = hardwareDiscount + setupDiscount;
  const oneTimeTotal = data.setupTotal + hardwareTotal;

  const annualSaving = monthlyDiscount * 12;

  /** A unit price, with the list under it when the two differ. */
  const unitCell = (given: number, list: number) =>
    given === list
      ? num(fmt(given))
      : `${num(fmt(given))}<div class="was">מחירון ${num(fmt(list))}</div>`;

  /** The three-line reconciliation under a block. The discount lines appear only when there is one. */
  const reconcile = (label: string, list: number, discount: number, total: number) =>
    discount > 0
      ? `
    <div class="sum faint"><span>${escapeHtml(label)} לפי מחירון</span>${num(fmt(list))}</div>
    <div class="sum save"><span>הנחה</span>${num("−" + fmt(discount))}</div>
    <div class="sum total"><span>${escapeHtml(label)} לתשלום</span>${num(fmt(total))}</div>`
      : `
    <div class="sum total"><span>${escapeHtml(label)}</span>${num(fmt(total))}</div>`;

  let n = 0;
  const heading = (title: string, when: string) =>
    `<h2>${++n} · ${title}<span class="when">${when}</span></h2>`;

  const hardwareBlock =
    hardwareLines.length === 0
      ? ""
      : `
  <div class="block">
    ${heading("מוצרים וחומרה", "תשלום חד־פעמי")}
    <table>
      <thead>
        <tr><th>מוצר</th><th class="q">כמות</th><th class="c">ליחידה</th><th class="c">סכום</th></tr>
      </thead>
      <tbody>
        ${hardwareLines
          .map(
            (item) => `
        <tr>
          <td>
            <div class="prod">
              ${item.image ? `<img class="shot" src="${escapeHtml(imageSrc(item.image))}" alt="">` : ""}
              <div>
                ${escapeHtml(item.label)}
                ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
              </div>
            </div>
          </td>
          <td class="c">${num(String(item.quantity))}</td>
          <td class="c">${unitCell(setupUnitOf(item), listSetupOf(item))}</td>
          <td class="c">${num(fmt(item.setup_total))}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${reconcile("סה״כ מוצרים וחומרה", hardwareList, hardwareDiscount, hardwareTotal)}
  </div>`;

  const setupBlock = `
  <div class="block">
    ${heading("הקמה והטמעה", "תשלום חד־פעמי")}
    <table>
      <thead><tr><th>רכיב</th><th class="q">כמות</th><th class="c">ליחידה</th><th class="c">סכום</th></tr></thead>
      <tbody>
        <tr>
          <td><b>${escapeHtml(BASE_SETUP_LABEL)}</b><div class="sub">דמי הקמה ראשוניים</div></td>
          <td class="c">${num("1")}</td>
          <td class="c">${unitCell(baseSetup, listBaseSetup)}</td>
          <td class="c">${num(fmt(baseSetup))}</td>
        </tr>
        ${setupLines
          .map(
            (item) => `
        <tr>
          <td>
            ${escapeHtml(item.label)}
            ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td class="c">${num(String(item.quantity))}</td>
          <td class="c">${unitCell(setupUnitOf(item), listSetupOf(item))}</td>
          <td class="c">${num(fmt(item.setup_total))}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${reconcile("סה״כ הקמה", setupList, setupDiscount, data.setupTotal)}
  </div>`;

  const tierLine =
    data.discountPercent > 0 || data.discountAmount > 0
      ? `
    <div class="sum save"><span>הנחת כמות ${num(String(data.discountPercent) + "%")} על רכיבים זכאים (${num(fmt(data.monthlyEligible))})</span>${num("−" + fmt(data.discountAmount))}</div>`
      : "";

  const monthlyBlock = `
  <div class="block">
    ${heading("תשלום חודשי", "מדי חודש")}
    <table>
      <thead><tr><th>רכיב</th><th class="q">כמות</th><th class="c">ליחידה</th><th class="c">לחודש</th></tr></thead>
      <tbody>
        ${
          monthlyLines.length > 0
            ? monthlyLines
                .map(
                  (item) => `
        <tr>
          <td>
            ${escapeHtml(item.label)}
            ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
            <div class="sub">${escapeHtml(GROUP_LABELS[item.item_group])}</div>
          </td>
          <td class="c">${num(String(item.quantity))}</td>
          <td class="c">${unitCell(monthlyUnitOf(item), listMonthlyOf(item))}</td>
          <td class="c">${num(fmt(item.monthly_total))}</td>
        </tr>`
                )
                .join("")
            : `<tr><td colspan="4" class="muted-cell">אין רכיבים בתשלום חודשי</td></tr>`
        }
      </tbody>
    </table>
    ${
      monthlyLineDiscount > 0
        ? `
    <div class="sum faint"><span>סה״כ חודשי לפי מחירון</span>${num(fmt(monthlyList))}</div>
    <div class="sum save"><span>הנחה על רכיבים</span>${num("−" + fmt(monthlyLineDiscount))}</div>`
        : ""
    }
    <div class="sum"><span>סה״כ חודשי לפני הנחת כמות</span>${num(fmt(monthlyGross))}</div>
    ${tierLine}
    <div class="sum total"><span>סה״כ חודשי לתשלום</span>${num(fmt(data.monthlyTotal))}</div>
  </div>`;

  const dash = `<span class="dash">—</span>`;
  const money = (v: number) => num(fmt(v));
  const off = (v: number) => (v > 0 ? num("−" + fmt(v)) : dash);

  const summary = `
  <div class="block summary">
    <h2>סיכום ההצעה</h2>
    <table class="recap">
      <thead>
        <tr><th></th><th class="c">לפני הנחות</th><th class="c">הנחות</th><th class="c">לתשלום</th></tr>
      </thead>
      <tbody>
        ${
          hardwareLines.length > 0
            ? `<tr><td>מוצרים וחומרה <span class="sub">חד־פעמי</span></td><td class="c">${money(hardwareList)}</td><td class="c save">${off(hardwareDiscount)}</td><td class="c">${money(hardwareTotal)}</td></tr>`
            : ""
        }
        <tr><td>הקמה והטמעה <span class="sub">חד־פעמי</span></td><td class="c">${money(setupList)}</td><td class="c save">${off(setupDiscount)}</td><td class="c">${money(data.setupTotal)}</td></tr>
        <tr class="strong"><td>סה״כ לתשלום מיידי</td><td class="c">${money(oneTimeList)}</td><td class="c save">${off(oneTimeDiscount)}</td><td class="c">${money(oneTimeTotal)}</td></tr>
        <tr class="gap grand"><td>תשלום חודשי <span class="sub">מדי חודש</span></td><td class="c">${money(monthlyList)}</td><td class="c save">${off(monthlyDiscount)}</td><td class="c">${money(data.monthlyTotal)}</td></tr>
      </tbody>
    </table>
  </div>`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>הצעת מחיר ${escapeHtml(data.quoteNumber)} — EZOrders</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Rubik, Arial, sans-serif;
    font-size: 12.5px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #eef1f5;
  }
  .page { max-width: 780px; margin: 0 auto; background: #fff; padding: 40px 44px; }
  .num { font-variant-numeric: tabular-nums; unicode-bidi: isolate; }

  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #F05D86; padding-bottom: 16px; margin-bottom: 22px; }
  .brand img { display: block; width: 150px; height: auto; }
  .prod { display: flex; align-items: flex-start; gap: 10px; }
  .shot { width: 46px; height: 66px; object-fit: contain; flex: 0 0 auto;
          border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; padding: 2px; }
  .meta { text-align: left; font-size: 11.5px; color: #4b5563; line-height: 1.9; }
  .meta b { color: #111827; }

  h1 { font-size: 19px; margin: 0 0 18px; font-weight: 700; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .box { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 10px; padding: 13px 15px; }
  .box h2 { margin: 0 0 7px; font-size: 10.5px; letter-spacing: .4px; color: #6b7280; font-weight: 600; }
  .box .line { font-size: 12px; color: #374151; }
  .box .line b { color: #111827; }

  .block { margin-top: 22px; break-inside: avoid; }
  .block:first-of-type { margin-top: 0; }
  .block > h2 { margin: 0 0 7px; font-size: 12.5px; font-weight: 700; color: #191D2A;
                display: flex; justify-content: space-between; align-items: baseline; }
  .block > h2 .when { font-size: 10.5px; font-weight: 500; color: #6b7280; }
  .block .sum { display: flex; justify-content: space-between; padding: 6px 11px;
                background: #F8FAFC; font-size: 12px; color: #374151; }
  .block .sum.faint { color: #6b7280; }
  .block .sum.save { color: #0F7A4F; font-weight: 600; }
  .block .sum.total { border-top: 1px solid #E5E7EB; font-weight: 700; color: #111827; font-size: 12.5px; }

  table { width: 100%; border-collapse: collapse; }
  thead th { background: #191D2A; color: #fff; font-size: 11px; font-weight: 600;
             padding: 9px 11px; text-align: right; }
  thead th.c { width: 100px; }
  thead th.q { width: 58px; }
  tbody td { padding: 8px 11px; border-bottom: 1px solid #EEF1F5; font-size: 12px; vertical-align: top; }
  tbody td.c { text-align: right; }
  .sub { font-size: 10.5px; color: #6b7280; }
  .was { font-size: 10px; color: #9ca3af; text-decoration: line-through; }
  .muted-cell { color: #9ca3af; }
  .dash { color: #c4c8d0; }

  .summary { margin-top: 26px; }
  .summary > h2 { font-size: 13.5px; }
  .recap thead th { background: #F8FAFC; color: #4b5563; border-bottom: 2px solid #191D2A; }
  .recap thead th.c { width: 120px; text-align: right; }
  .recap tbody td { padding: 8px 11px; }
  .recap td.save { color: #0F7A4F; font-weight: 600; }
  .recap tr.strong td { font-weight: 700; color: #111827; border-bottom: 2px solid #E5E7EB; }
  .recap tr.gap td { padding-top: 14px; }
  .recap tr.grand td { font-weight: 700; color: #111827; font-size: 14px; border-bottom: 2px solid #F05D86; }
  .recap tr.grand td:last-child { color: #F05D86; font-size: 15.5px; }

  .saving { margin-top: 16px; background: #E6F5EE; border-radius: 10px;
            padding: 11px 16px; font-size: 12px; color: #0F7A4F; font-weight: 600; text-align: center; }
  .notes { margin-top: 20px; background: #F8FAFC; border-inline-start: 3px solid #F05D86;
           padding: 13px 16px; border-radius: 0 10px 10px 0; font-size: 12px;
           color: #374151; white-space: pre-wrap; }
  .notes h2 { margin: 0 0 5px; font-size: 11.5px; color: #111827; font-weight: 700; }
  .terms { margin-top: 20px; font-size: 10.5px; color: #6b7280; line-height: 1.9;
           border-top: 1px solid #E5E7EB; padding-top: 13px; }
  .sign { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .sign div { border-top: 1px solid #9CA3AF; padding-top: 7px; font-size: 11px; color: #6b7280; }

  @media print {
    body { background: #fff; }
    .page { max-width: none; padding: 0; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .summary, .saving, .notes, .terms, .sign { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">
      <img src="${LOGO_DATA_URI}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="EZOrders">
    </div>
    <div class="meta">
      <div>הצעת מחיר <b>${escapeHtml(data.quoteNumber)}</b></div>
      <div>תאריך: <b>${num(HE_DATE.format(data.issuedAt))}</b></div>
      <div>בתוקף עד: <b>${num(HE_DATE.format(data.validUntil))}</b></div>
    </div>
  </header>

  <h1>הצעת מחיר</h1>

  <div class="parties">
    <div class="box">
      <h2>לכבוד</h2>
      <div class="line">
        <b>${escapeHtml(data.customerName)}</b>
        ${data.customerContact ? `<br>לידי: ${escapeHtml(data.customerContact)}` : ""}
        ${data.customerPhone ? `<br>טלפון: ${num(data.customerPhone)}` : ""}
        ${data.customerEmail ? `<br>${escapeHtml(data.customerEmail)}` : ""}
        ${data.customerTaxId ? `<br>ח.פ: ${num(data.customerTaxId)}` : ""}
      </div>
    </div>
    <div class="box">
      <h2>מאת</h2>
      <div class="line">
        <b>EZOrders</b>
        <br>סוכן מטפל: ${escapeHtml(data.agentName)}
        ${data.agentEmail ? `<br>${escapeHtml(data.agentEmail)}` : ""}
      </div>
    </div>
  </div>

  ${hardwareBlock}
  ${setupBlock}
  ${monthlyBlock}
  ${summary}

  ${
    monthlyDiscount > 0
      ? `<div class="saving">החיסכון שלכם: ${num(fmt(monthlyDiscount))} בכל חודש — ${num(fmt(annualSaving))} בשנה${oneTimeDiscount > 0 ? `, ועוד ${num(fmt(oneTimeDiscount))} על התשלום המיידי` : ""}</div>`
      : oneTimeDiscount > 0
        ? `<div class="saving">החיסכון שלכם: ${num(fmt(oneTimeDiscount))} על התשלום המיידי</div>`
        : ""
  }

  ${data.notes ? `<div class="notes"><h2>הערות ותנאים</h2>${escapeHtml(data.notes)}</div>` : ""}

  <div class="terms">
    ההצעה בתוקף עד ${num(HE_DATE.format(data.validUntil))}. כל המחירים נקובים בשקלים חדשים ואינם כוללים מע״מ.
    המחיר מתייחס לסניף בודד — ברשת עם מספר סניפים, כל סניף מחויב ומחושב בנפרד.
    אין התחייבות לתקופה מינימלית; סיום ההתקשרות בהודעה של 60 יום מראש.
    הנחת הכמות החודשית מחושבת על המוצרים הראשיים והתוספות הכלולות בלבד.
  </div>

  <div class="sign">
    <div>חתימת הלקוח + חותמת</div>
    <div>תאריך אישור</div>
  </div>
</div>
</body>
</html>`;
}
