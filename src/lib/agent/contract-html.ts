import "server-only";

import { LOGO_DATA_URI, LOGO_HEIGHT, LOGO_WIDTH } from "./brand";
import { fmt, type ItemGroup } from "@/lib/pricing";

/**
 * The contract, as a standalone HTML string.
 *
 * Deliberately not a React component, and for a stronger reason than the quote:
 * this exact markup is what gets hashed. A component tree assembled in a
 * browser has no single canonical serialisation, and "the document you signed"
 * has to be a sequence of bytes that can be produced again years later from the
 * stored fields and compared.
 *
 * WHAT THE HASH COVERS
 *
 * The document as the customer saw it before signing: the parties, the lines,
 * the terms. Not the signature image, and not the audit annex — both are
 * produced by the act of signing, so including them would make the hash
 * unreproducible from stored data, which is the only thing it is for.
 * renderContractDocument({ ...data, signature: null, events: [] }) is what gets
 * hashed, and running that again next year against the stored row answers "that
 * is not what I signed".
 */

export interface ContractLine {
  label: string;
  note?: string | null;
  item_group: ItemGroup;
  quantity: number;
  setup_total: number;
  monthly_total: number;
}

export interface ContractClause {
  num: string;
  text: string;
}

export interface ContractSection {
  num: string;
  title: string;
  clauses: ContractClause[];
}

export interface ContractEvent {
  at: string;
  type: string;
  ip?: string | null;
  ua?: string | null;
}

export interface ContractDocumentData {
  contractNumber: string;
  issuedAt: Date;
  templateVersion: number;
  templateTitle: string;
  sections: ContractSection[];

  customerName: string;
  customerTaxId?: string | null;
  customerAddress?: string | null;
  businessPhone?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customerEmail?: string | null;
  posCompany?: string | null;
  termMonths: number;

  quoteNumber?: string | null;
  agentName?: string | null;
  items: ContractLine[];
  setupTotal: number;
  hardwareTotal: number;
  monthlyTotal: number;
  vatPercent: number;

  /** Present only once signed. Excluded from the hash. */
  signerName?: string | null;
  signerIdNumber?: string | null;
  signerRole?: string | null;
  signaturePng?: string | null;
  signedAt?: Date | null;
  documentHash?: string | null;
  /** The audit timeline. Excluded from the hash. */
  events?: ContractEvent[];
}

/** The other party. Fixed, because it is us. */
export const SUPPLIER = {
  name: "בייט טכנולוגיה בע״מ",
  taxId: "515508315",
  address: "מרח׳ פלים 2 חיפה",
} as const;

const HE_DATE = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
const HE_STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

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

/** **bold** in a clause becomes bold. The source contract emphasises a few words. */
function clauseHtml(text: string): string {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**")
        ? `<b>${escapeHtml(part.slice(2, -2))}</b>`
        : escapeHtml(part).replace(/\n/g, "<br>")
    )
    .join("");
}

const EVENT_LABEL: Record<string, string> = {
  created: "נוצר",
  sent: "נשלח",
  opened: "נפתח",
  reopened: "נפתח שוב",
  signed: "נחתם",
  signature_cleared: "חתימה נמחקה",
  cancelled: "בוטל",
};

export function renderContractDocument(data: ContractDocumentData): string {
  const vat = data.vatPercent;
  const oneTime = data.setupTotal + data.hardwareTotal;

  const detail = (label: string, value: string | null | undefined) => `
        <tr><th>${escapeHtml(label)}</th><td>${value ? escapeHtml(value) : "&nbsp;"}</td></tr>`;

  const parties = `
    <table class="facts">
      <caption>פרטי העסק</caption>
      <tbody>
        ${detail("שם בית העסק", data.customerName)}
        ${detail("מספר עוסק מורשה", data.customerTaxId)}
        ${detail("כתובת", data.customerAddress)}
        ${detail("טלפון בעסק", data.businessPhone)}
        ${detail("שם בעל העסק", data.contactName)}
        ${detail("טלפון נייד", data.contactPhone)}
        ${detail("דואר אלקטרוני", data.customerEmail)}
        ${detail("חברת קופות", data.posCompany)}
        ${detail("תקופת ההסכם", `${data.termMonths} חודשים`)}
        ${detail("תאריך", HE_DATE.format(data.issuedAt))}
      </tbody>
    </table>`;

  const lines = data.items.length === 0
    ? `<tr><td colspan="4" class="muted-cell">אין רכיבים</td></tr>`
    : data.items
        .map(
          (item) => `
        <tr>
          <td>
            ${escapeHtml(item.label)}
            ${item.note ? `<div class="sub">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td class="c">${num(String(item.quantity))}</td>
          <td class="c">${item.setup_total > 0 ? num(fmt(item.setup_total)) : "—"}</td>
          <td class="c">${item.monthly_total > 0 ? num(fmt(item.monthly_total)) : "—"}</td>
        </tr>`
        )
        .join("");

  const products = `
    <table class="lines">
      <thead>
        <tr><th>שם המוצר</th><th class="c">כמות</th><th class="c">דמי הקמה</th><th class="c">תש׳ חודשי</th></tr>
      </thead>
      <tbody>${lines}</tbody>
      <tfoot>
        <tr>
          <td>סה״כ</td>
          <td class="c"></td>
          <td class="c">${num(fmt(oneTime))}</td>
          <td class="c">${num(fmt(data.monthlyTotal))}</td>
        </tr>
      </tfoot>
    </table>
    <p class="vat">** המחירים אינם כוללים מע״מ כחוק (${num(`${vat}%`)})</p>`;

  const terms = data.sections
    .map(
      (section) => `
  <section class="block">
    <h2>${escapeHtml(section.num)}&nbsp;&nbsp;${escapeHtml(section.title)}</h2>
    ${section.clauses
      .map(
        (clause) => `
    <div class="clause">
      <span class="cnum">${escapeHtml(clause.num)}</span>
      <span class="ctext">${clauseHtml(clause.text)}</span>
    </div>`
      )
      .join("")}
  </section>`
    )
    .join("");

  const signed = Boolean(data.signaturePng && data.signedAt);

  const signatures = `
  <section class="signrow">
    <div class="party">
      <div class="ptitle">החברה</div>
      <div class="pname">${escapeHtml(SUPPLIER.name)}</div>
      <div class="pmeta">ח.פ. ${num(SUPPLIER.taxId)}</div>
    </div>
    <div class="party">
      <div class="ptitle">הלקוח</div>
      ${
        signed
          ? `<img class="sig" src="${escapeHtml(data.signaturePng!)}" alt="חתימת הלקוח">
             <div class="pname">${escapeHtml(data.signerName ?? "")}</div>
             <div class="pmeta">
               ${data.signerRole ? `${escapeHtml(data.signerRole)} · ` : ""}
               ${data.signerIdNumber ? `ת.ז ${num(data.signerIdNumber)} · ` : ""}
               ${num(HE_STAMP.format(data.signedAt!))}
             </div>`
          : `<div class="sigline"></div>
             <div class="pmeta">חתימה + חותמת</div>`
      }
    </div>
  </section>`;

  const events = data.events ?? [];
  const annex = !signed
    ? ""
    : `
  <section class="annex">
    <h2>נספח ראיות</h2>
    <p class="alead">
      נספח זה מופק מהמערכת ומתעד את מסלול המסמך מרגע שנשלח ועד שנחתם. הוא אינו חלק
      מתנאי ההסכם ואינו נכלל בטביעת המסמך.
    </p>

    <table class="facts annexfacts">
      <tbody>
        <tr><th>מספר הסכם</th><td>${num(data.contractNumber)}</td></tr>
        ${data.quoteNumber ? `<tr><th>הצעת מחיר</th><td>${num(data.quoteNumber)}</td></tr>` : ""}
        <tr><th>גרסת נוסח</th><td>${num(String(data.templateVersion))}</td></tr>
        <tr><th>נחתם על ידי</th><td>${escapeHtml(data.signerName ?? "")}</td></tr>
        ${data.signerIdNumber ? `<tr><th>ת.ז / ח.פ</th><td>${num(data.signerIdNumber)}</td></tr>` : ""}
        ${data.signerRole ? `<tr><th>תפקיד</th><td>${escapeHtml(data.signerRole)}</td></tr>` : ""}
        ${data.contactPhone ? `<tr><th>נשלח לטלפון</th><td>${num(data.contactPhone)}</td></tr>` : ""}
        ${data.customerEmail ? `<tr><th>נשלח לדוא״ל</th><td>${escapeHtml(data.customerEmail)}</td></tr>` : ""}
        <tr><th>מועד החתימה</th><td>${num(HE_STAMP.format(data.signedAt!))}</td></tr>
        <tr><th>סוכן מטפל</th><td>${escapeHtml(data.agentName ?? SUPPLIER.name)}</td></tr>
      </tbody>
    </table>

    <h3>מסלול המסמך</h3>
    <table class="timeline">
      <thead>
        <tr><th>תאריך ושעה</th><th>פעולה</th><th>כתובת IP</th><th>דפדפן / מכשיר</th></tr>
      </thead>
      <tbody>
        ${
          events.length === 0
            ? `<tr><td colspan="4" class="muted-cell">אין רישום</td></tr>`
            : events
                .map(
                  (e) => `
        <tr>
          <td>${num(HE_STAMP.format(new Date(e.at)))}</td>
          <td>${escapeHtml(EVENT_LABEL[e.type] ?? e.type)}</td>
          <td>${e.ip ? num(e.ip) : "—"}</td>
          <td class="ua">${e.ua ? escapeHtml(e.ua) : "—"}</td>
        </tr>`
                )
                .join("")
        }
      </tbody>
    </table>

    <h3>טביעת המסמך</h3>
    <p class="alead">
      הערך שלהלן הוא SHA-256 של ההסכם כפי שהוצג לחותם, ללא החתימה וללא נספח זה.
      חישוב חוזר של אותו מסמך חייב להחזיר את אותו ערך; ערך שונה פירושו שהטקסט שונה
      מאז החתימה.
    </p>
    <p class="hash" dir="ltr">${escapeHtml(data.documentHash ?? "")}</p>
  </section>`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(data.templateTitle)} ${escapeHtml(data.contractNumber)} — EZOrders</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #eef1f5; color: #191D2A;
    font-family: "Segoe UI", Arial, "Noto Sans Hebrew", sans-serif;
    font-size: 13px; line-height: 1.65;
  }
  .page {
    max-width: 820px; margin: 24px auto; padding: 40px 44px 52px;
    background: #fff; box-shadow: 0 1px 3px rgba(16,24,40,.08);
  }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
           border-bottom: 3px solid #F05D86; padding-bottom: 16px; margin-bottom: 26px; }
  .brand img { display: block; width: 150px; height: auto; }
  .meta { text-align: left; font-size: 12px; color: #5F6575; line-height: 1.9; }
  h1 { font-size: 21px; margin: 0 0 4px; letter-spacing: -.3px; }
  .lead { margin: 0 0 26px; color: #5F6575; font-size: 12.5px; }

  table { width: 100%; border-collapse: collapse; }
  caption { caption-side: top; text-align: center; font-weight: 700; font-size: 15px;
            padding: 10px; background: #F8FAFC; border: 1px solid #e5e7eb; border-bottom: 0; }
  .facts th, .facts td { border: 1px solid #e5e7eb; padding: 7px 10px; font-size: 12.5px; }
  .facts th { width: 34%; background: #F8FAFC; text-align: right; font-weight: 600; color: #191D2A; }

  .lines { margin-top: 22px; }
  .lines thead th { background: #191D2A; color: #fff; padding: 9px 10px; font-size: 12px; font-weight: 600; text-align: right; }
  .lines tbody td { border-bottom: 1px solid #eef1f5; padding: 9px 10px; vertical-align: top; }
  .lines tfoot td { border-top: 2px solid #191D2A; padding: 9px 10px; font-weight: 700; }
  .c { text-align: center; }
  .sub { color: #5F6575; font-size: 11.5px; }
  .muted-cell { color: #9aa0ad; text-align: center; padding: 14px; }
  .num { unicode-bidi: isolate; }
  .vat { margin: 10px 0 0; font-size: 11.5px; color: #5F6575; text-align: center; }

  .block { margin-top: 28px; }
  .block h2 { font-size: 14px; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #eef1f5; }
  .clause { display: flex; gap: 10px; margin-bottom: 7px; align-items: baseline; }
  .cnum { flex: 0 0 34px; font-weight: 600; color: #5F6575; font-size: 12px; unicode-bidi: isolate; }
  .ctext { flex: 1; text-align: justify; font-size: 12.5px; }

  .signrow { display: flex; gap: 32px; margin-top: 40px; padding-top: 22px; border-top: 1px solid #e5e7eb; }
  .party { flex: 1; }
  .ptitle { font-weight: 700; margin-bottom: 8px; }
  .pname { font-weight: 600; }
  .pmeta { color: #5F6575; font-size: 11.5px; }
  .sig { display: block; height: 64px; width: auto; max-width: 100%; margin-bottom: 4px; }
  .sigline { height: 64px; border-bottom: 1px solid #191D2A; margin-bottom: 4px; }

  .annex { margin-top: 46px; padding-top: 26px; border-top: 3px solid #F05D86; }
  .annex h2 { font-size: 16px; margin: 0 0 8px; }
  .annex h3 { font-size: 13px; margin: 22px 0 8px; }
  .alead { margin: 0 0 14px; color: #5F6575; font-size: 11.5px; }
  .annexfacts th { width: 28%; }
  .timeline th { background: #F8FAFC; border: 1px solid #e5e7eb; padding: 7px 9px; font-size: 11.5px; text-align: right; }
  .timeline td { border: 1px solid #e5e7eb; padding: 6px 9px; font-size: 11.5px; }
  .timeline .ua { color: #5F6575; word-break: break-word; }
  .hash { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px;
          background: #F8FAFC; border: 1px solid #e5e7eb; padding: 9px 10px; word-break: break-all; margin: 0; }

  @media print {
    body { background: #fff; }
    .page { margin: 0; max-width: none; box-shadow: none; padding: 0 12mm; }
    .block, .signrow, .annex { break-inside: avoid; }
    .annex { break-before: page; }
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
      <div>הסכם <b>${num(data.contractNumber)}</b></div>
      <div>תאריך: <b>${num(HE_DATE.format(data.issuedAt))}</b></div>
      ${data.quoteNumber ? `<div>לפי הצעה <b>${num(data.quoteNumber)}</b></div>` : ""}
    </div>
  </header>

  ${parties}
  ${products}

  <h1 style="margin-top:34px">${escapeHtml(data.templateTitle)}</h1>
  <p class="lead">
    בין: <b>${escapeHtml(data.customerName)}</b>${data.customerTaxId ? ` (ח.פ ${num(data.customerTaxId)})` : ""} (להלן ״הלקוח״)
    לבין <b>${escapeHtml(SUPPLIER.name)}</b>, ${escapeHtml(SUPPLIER.address)} (להלן ״הספק״).
  </p>

  ${terms}
  ${signatures}
  ${annex}
</div>
</body>
</html>`;
}
