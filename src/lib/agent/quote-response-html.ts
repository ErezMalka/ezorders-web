/**
 * The customer's answer, as markup appended to the quote document.
 *
 * Two properties are worth protecting, and they pull against each other.
 *
 * The document must stay exactly what the agent approved — the same template
 * renders the agent's print view and the customer's page, and that is the whole
 * guarantee. So the panel is appended to the finished document rather than
 * threaded through it, and it is marked no-print: what comes out of the printer
 * is the document, with no buttons floating on it. The hash the acceptance
 * records is taken of the document BEFORE this is added, so it identifies the
 * agreement and not the furniture around it.
 *
 * And it must work. This is the moment a sale closes, on whatever phone the
 * customer happens to be holding — so there is no JavaScript here at all. Two
 * ordinary forms POST back to the same URL, and <details> does the disclosure
 * that a script would otherwise be needed for. Nothing to fail to load.
 */

function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

const PANEL_CSS = `
<style>
  .respond { max-width: 780px; margin: 18px auto 40px; background: #fff; border-radius: 14px;
             padding: 26px 30px; box-shadow: 0 1px 3px rgba(16,24,40,.08); }
  .respond h2 { margin: 0 0 6px; font-size: 17px; color: #191D2A; }
  .respond .lead { margin: 0 0 18px; font-size: 13px; color: #5F6575; }
  .respond .choices { display: flex; flex-wrap: wrap; gap: 10px; }
  .respond details { border: 1px solid #E5E7EB; border-radius: 12px; padding: 0; flex: 1 1 260px; }
  .respond details[open] { border-color: #F05D86; }
  .respond summary { cursor: pointer; list-style: none; padding: 14px 18px; font-size: 14px;
                     font-weight: 700; color: #191D2A; border-radius: 12px; }
  .respond summary::-webkit-details-marker { display: none; }
  .respond details.yes summary { background: #F05D86; color: #fff; }
  .respond details.no summary { color: #5F6575; }
  .respond .body { padding: 4px 18px 18px; }
  .respond label { display: block; font-size: 12px; font-weight: 600; color: #374151;
                   margin: 12px 0 4px; }
  .respond label .req { color: #F05D86; }
  .respond input[type=text], .respond input[type=email], .respond input[type=tel],
  .respond textarea {
    width: 100%; padding: 9px 12px; font: inherit; font-size: 13px; color: #111827;
    border: 1px solid #D1D5DB; border-radius: 9px; background: #fff;
  }
  .respond input:focus, .respond textarea:focus { outline: 2px solid #F05D86; outline-offset: 1px; }
  .respond textarea { min-height: 74px; resize: vertical; }
  .respond .consent { display: flex; gap: 9px; align-items: flex-start; margin: 16px 0 4px;
                      font-size: 12.5px; color: #374151; font-weight: 400; }
  .respond .consent input { margin-top: 3px; width: 16px; height: 16px; flex: none; accent-color: #F05D86; }
  .respond button { margin-top: 16px; width: 100%; padding: 12px 18px; font: inherit;
                    font-size: 14px; font-weight: 700; border: 0; border-radius: 50px;
                    cursor: pointer; }
  .respond button.primary { background: #F05D86; color: #fff; }
  .respond button.plain { background: #fff; color: #5F6575; border: 1px solid #D1D5DB; }
  .respond .fineprint { margin: 16px 0 0; font-size: 11px; color: #9CA3AF; line-height: 1.7; }
  .respond .err { margin: 0 0 16px; background: #FEF2F2; color: #B42318; border-radius: 10px;
                  padding: 11px 14px; font-size: 13px; font-weight: 600; }
  .respond .done { border-radius: 12px; padding: 18px 20px; font-size: 14px; }
  .respond .done.yes { background: #ECFDF5; color: #05603A; }
  .respond .done.no { background: #F8FAFC; color: #5F6575; }
  .respond .done b { display: block; font-size: 16px; margin-bottom: 5px; }
  @media print { .respond { display: none !important; } }
</style>`;

/** Append the panel to a finished document, just inside </body>. */
export function withResponsePanel(documentHtml: string, panelHtml: string): string {
  const marker = "</body>";
  const at = documentHtml.lastIndexOf(marker);
  if (at === -1) return documentHtml + PANEL_CSS + panelHtml;
  return documentHtml.slice(0, at) + PANEL_CSS + panelHtml + documentHtml.slice(at);
}

export interface ResponsePanelData {
  /** Posted back to; the token is already in the path. */
  action: string;
  customerName: string;
  customerTaxId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  validUntil: Date;
  /** Set when a submission bounced, so the customer is told why. */
  error?: string | null;
}

const HE_DATE = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

export function renderResponsePanel(data: ResponsePanelData): string {
  return `
<section class="respond" id="respond">
  <h2>מה ההחלטה שלכם?</h2>
  <p class="lead">ההצעה בתוקף עד <b>${esc(HE_DATE.format(data.validUntil))}</b>. אישור כאן מתחיל את תהליך ההקמה — נחזור אליכם תוך יום עסקים.</p>
  ${data.error ? `<p class="err" role="alert">${esc(data.error)}</p>` : ""}

  <div class="choices">
    <details class="yes" ${data.error ? "open" : ""}>
      <summary>✓ אישור ההצעה</summary>
      <div class="body">
        <form method="post" action="${esc(data.action)}">
          <input type="hidden" name="response" value="accepted">

          <label for="signer_name">שם מלא של המאשר <span class="req">*</span></label>
          <input id="signer_name" name="signer_name" type="text" required maxlength="120"
                 autocomplete="name" value="">

          <label for="signer_role">תפקיד</label>
          <input id="signer_role" name="signer_role" type="text" maxlength="80"
                 placeholder="בעלים / מנהל">

          <label for="signer_tax_id">ח.פ. / ע.מ.</label>
          <input id="signer_tax_id" name="signer_tax_id" type="text" maxlength="40"
                 inputmode="numeric" value="${esc(data.customerTaxId ?? "")}">

          <label for="signer_email">אימייל</label>
          <input id="signer_email" name="signer_email" type="email" maxlength="120"
                 autocomplete="email" value="${esc(data.customerEmail ?? "")}">

          <label for="signer_phone">טלפון</label>
          <input id="signer_phone" name="signer_phone" type="tel" maxlength="40"
                 autocomplete="tel" value="${esc(data.customerPhone ?? "")}">

          <label class="consent" for="consent">
            <input id="consent" name="consent" type="checkbox" value="1" required>
            <span>קראתי את ההצעה ואני מאשר/ת אותה בשם ${esc(data.customerName)}, לרבות תנאי התשלום והתחייבות התקופה המפורטים בה.</span>
          </label>

          <button type="submit" class="primary">אישור ההצעה ותחילת הקמה</button>
        </form>
        <p class="fineprint">האישור נרשם עם השם שהזנתם, מועד האישור וכתובת ה-IP שממנה נשלח, ומצורף למסמך זה.</p>
      </div>
    </details>

    <details class="no">
      <summary>לא מעוניינים כרגע</summary>
      <div class="body">
        <form method="post" action="${esc(data.action)}">
          <input type="hidden" name="response" value="rejected">
          <label for="reason">מה חסר? (לא חובה)</label>
          <textarea id="reason" name="reason" maxlength="500"
                    placeholder="יקר מדי, לא מתאים לנו כרגע, בחרנו בפתרון אחר…"></textarea>
          <button type="submit" class="plain">שליחת תשובה שלילית</button>
        </form>
        <p class="fineprint">תמיד אפשר לחזור אלינו — הקישור הזה יישאר פעיל.</p>
      </div>
    </details>
  </div>
</section>`;
}

export interface ResponseDoneData {
  response: "accepted" | "rejected";
  orderNumber?: string | null;
  respondedAt?: Date | null;
  agentName?: string | null;
}

/** What the customer sees once they have answered — and on every reload after. */
export function renderResponseDone(data: ResponseDoneData): string {
  if (data.response === "accepted") {
    return `
<section class="respond" id="respond">
  <div class="done yes">
    <b>ההצעה אושרה — תודה!</b>
    ${data.orderNumber ? `מספר ההזמנה שלכם: <b style="display:inline">${esc(data.orderNumber)}</b>. ` : ""}
    ${data.respondedAt ? `נרשם ב-${esc(HE_DATE.format(data.respondedAt))}. ` : ""}
    ${data.agentName ? esc(data.agentName) : "נציג שלנו"} יצור אתכם קשר תוך יום עסקים כדי לתאם את ההקמה.
  </div>
  <p class="fineprint">שמרו את הקישור הזה — הוא ימשיך להציג את ההצעה שאושרה.</p>
</section>`;
  }

  return `
<section class="respond" id="respond">
  <div class="done no">
    <b>קיבלנו — תודה שעדכנתם</b>
    ${data.respondedAt ? `נרשם ב-${esc(HE_DATE.format(data.respondedAt))}. ` : ""}
    אם משהו ישתנה, ${data.agentName ? esc(data.agentName) : "אנחנו"} כאן.
  </div>
</section>`;
}

/** Shown when the quote can no longer be accepted. */
export function renderExpiredPanel(validUntil: Date, agentName?: string | null): string {
  return `
<section class="respond" id="respond">
  <div class="done no">
    <b>תוקף ההצעה פג ב-${esc(HE_DATE.format(validUntil))}</b>
    המחירים כאן כבר לא מובטחים. פנו ל${agentName ? `-${esc(agentName)}` : "נציג שלנו"} ונשלח הצעה מעודכנת — ברוב המקרים זה עניין של דקות.
  </div>
</section>`;
}
