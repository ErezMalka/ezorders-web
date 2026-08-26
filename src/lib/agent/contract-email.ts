import "server-only";

import { Resend } from "resend";

import { fmt } from "@/lib/pricing";
import { SUPPLIER } from "./contract-html";
import { renderContractPdf } from "./contract-pdf";

/**
 * The signed copy, to both sides.
 *
 * Sent once, at the moment of signing, and never allowed to affect the
 * signature. A contract is signed when the database says so; an email that
 * bounces, or a provider having a bad afternoon, must not turn that into a
 * customer who signed and a record that says they did not. Every failure here
 * is logged and swallowed.
 *
 * The document travels as an attachment rather than only a link. A link records
 * that it was opened, which is useful — but "send me a copy" means a file that
 * survives the link, the site and the company.
 *
 * TWO FILES, FOR TWO DIFFERENT JOBS
 *
 * The PDF is what a person files, forwards and prints. It is what "send me the
 * contract" means everywhere outside this codebase, and it is what the customer
 * gets.
 *
 * The HTML is the document itself — the exact bytes the hash was taken over,
 * self-contained down to the logo and the signature, openable in twenty years
 * with no network. That is an archive, not a letter, so it goes to the company
 * alongside the PDF and to the customer only if the PDF could not be made.
 */

export interface ContractCopy {
  contractNumber: string;
  customerName: string;
  customerEmail: string | null;
  contactName: string | null;
  agentName: string | null;
  agentEmail: string | null;
  signerName: string | null;
  signedAt: Date;
  documentHash: string;
  setupTotal: number;
  hardwareTotal: number;
  monthlyTotal: number;
  termMonths: number;
  /** The signed document, exactly as the customer saw it. */
  documentHtml: string;
  /** Where the contract lives, for the link. */
  url: string;
}

const STAMP = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
  timeZone: "Asia/Jerusalem",
});

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Who gets a copy: the customer, the agent, and the company's own inbox. */
function recipients(copy: ContractCopy): { customer: string[]; company: string[] } {
  const company = new Set<string>();
  // A dedicated address if there is one, and the leads inbox otherwise — the
  // point is that the copy lands somewhere a person reads.
  const archive = process.env.CONTRACTS_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL;
  if (archive) company.add(archive);
  if (copy.agentEmail) company.add(copy.agentEmail);

  return {
    customer: copy.customerEmail ? [copy.customerEmail] : [],
    company: [...company],
  };
}

function body(copy: ContractCopy, forCompany: boolean): string {
  const greeting = forCompany
    ? "נחתם הסכם."
    : copy.contactName
      ? `שלום ${escapeHtml(copy.contactName)},`
      : "שלום,";

  const oneTime = copy.setupTotal + copy.hardwareTotal;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><body style="margin:0;padding:24px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#191D2A">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
    <p style="margin:0 0 18px;font-size:13px;font-weight:700;letter-spacing:.4px;color:#F05D86">EZORDERS</p>

    <p style="margin:0 0 14px">${greeting}</p>
    <p style="margin:0 0 18px">
      ${
        forCompany
          ? `הסכם <strong>${escapeHtml(copy.contractNumber)}</strong> עם ${escapeHtml(copy.customerName)} נחתם.`
          : `מצורף עותק חתום של הסכם <strong>${escapeHtml(copy.contractNumber)}</strong> עבור ${escapeHtml(copy.customerName)}.`
      }
    </p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr><td style="padding:6px 0;color:#5F6575">נחתם על ידי</td>
          <td style="padding:6px 0;text-align:left;font-weight:700">${escapeHtml(copy.signerName ?? "")}</td></tr>
      <tr><td style="padding:6px 0;color:#5F6575">מועד החתימה</td>
          <td style="padding:6px 0;text-align:left;font-weight:700" dir="ltr">${STAMP.format(copy.signedAt)}</td></tr>
      <tr><td style="padding:6px 0;color:#5F6575">תשלום חד־פעמי</td>
          <td style="padding:6px 0;text-align:left;font-weight:700">${fmt(oneTime)}</td></tr>
      <tr><td style="padding:6px 0;color:#5F6575">תשלום חודשי</td>
          <td style="padding:6px 0;text-align:left;font-weight:700;color:#F05D86">${fmt(copy.monthlyTotal)}</td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:12px;color:#5F6575">המחירים אינם כוללים מע״מ.</p>

    <a href="${escapeHtml(copy.url)}" style="display:inline-block;background:#F05D86;color:#fff;text-decoration:none;padding:12px 26px;border-radius:50px;font-weight:600">
      צפייה בהסכם החתום
    </a>

    <p style="margin:22px 0 6px;font-size:12px;color:#5F6575">
      ההסכם החתום מצורף למייל הזה כקובץ, כולל נספח הראיות — מי חתם, מתי, ומאיזו כתובת.
    </p>
    <p style="margin:0 0 20px;font-size:11px;color:#9aa0ad">
      טביעת המסמך (SHA-256):<br>
      <span style="font-family:monospace" dir="ltr">${escapeHtml(copy.documentHash)}</span>
    </p>

    <p style="margin:0;font-size:13px;color:#5F6575">
      ${copy.agentName ? `${escapeHtml(copy.agentName)} · ` : ""}${escapeHtml(SUPPLIER.name)}
    </p>
  </div>
</body></html>`;
}

/**
 * Returns true only if at least one copy actually went out — the caller stamps
 * signed_email_sent_at on that, so an unstamped contract means nobody got a
 * copy and somebody should look.
 */
export async function sendSignedContractCopy(copy: ContractCopy): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("[contract-email] not configured (RESEND_API_KEY / CONTACT_FROM_EMAIL)");
    return false;
  }

  const to = recipients(copy);
  if (to.customer.length === 0 && to.company.length === 0) {
    console.error("[contract-email] no recipients for", copy.contractNumber);
    return false;
  }

  const htmlAttachment = {
    filename: `${copy.contractNumber}.html`,
    content: Buffer.from(copy.documentHtml, "utf8").toString("base64"),
  };

  // Best effort, by design. A browser that would not start must not stop a
  // signed contract from reaching the people who signed it — it costs them the
  // nicer file, not the copy.
  const pdf = await renderContractPdf(copy.documentHtml);
  const pdfAttachment = pdf
    ? { filename: `${copy.contractNumber}.pdf`, content: pdf.toString("base64") }
    : null;
  if (!pdfAttachment) {
    console.error("[contract-email] no PDF for", copy.contractNumber, "— sending the HTML alone");
  }

  const resend = new Resend(apiKey);
  let anySent = false;

  // Two separate messages rather than one with everyone on it: the customer
  // should not be able to read the company's internal address list, and the
  // two messages do not say the same thing.
  const deliveries: Array<{
    label: string;
    to: string[];
    subject: string;
    forCompany: boolean;
    attachments: Array<{ filename: string; content: string }>;
  }> = [
    {
      label: "customer",
      to: to.customer,
      subject: `הסכם ${copy.contractNumber} — עותק חתום`,
      forCompany: false,
      // One file. A customer handed two versions of their own contract has to
      // work out which one is the contract.
      attachments: [pdfAttachment ?? htmlAttachment],
    },
    {
      label: "company",
      to: to.company,
      subject: `נחתם הסכם ${copy.contractNumber} — ${copy.customerName}`,
      forCompany: true,
      // Both: the PDF to read, and the exact bytes the hash was taken over.
      attachments: pdfAttachment ? [pdfAttachment, htmlAttachment] : [htmlAttachment],
    },
  ];

  for (const delivery of deliveries) {
    if (delivery.to.length === 0) continue;
    try {
      const { error } = await resend.emails.send({
        from,
        to: delivery.to,
        replyTo: copy.agentEmail ?? undefined,
        subject: delivery.subject,
        html: body(copy, delivery.forCompany),
        attachments: delivery.attachments,
      });
      if (error) {
        console.error(`[contract-email] ${delivery.label} rejected`, error);
        continue;
      }
      anySent = true;
    } catch (error) {
      // Swallowed on purpose. The signature is already recorded, and throwing
      // here would turn a delivery problem into a customer who signed and a
      // page that says the signing failed.
      console.error(`[contract-email] ${delivery.label} threw`, error);
    }
  }

  return anySent;
}
