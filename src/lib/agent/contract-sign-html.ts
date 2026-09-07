import "server-only";

/**
 * The panel the customer signs in.
 *
 * Appended after the document, never inside it: the hash is taken over the
 * document alone, so this markup — which changes with the state of the page and
 * carries an error banner sometimes — must not be part of what gets hashed.
 *
 * The pad is a canvas and about forty lines of vanilla JavaScript. It could
 * have been a library, and the library would have brought a framework, a build
 * step and a supply chain into the one page where "nothing here changed since
 * you signed" is the entire product.
 */

const ERRORS: Record<string, string> = {
  signer_required: "צריך למלא שם מלא כדי לחתום.",
  signature_required: "צריך לחתום במסגרת לפני שליחה.",
  hash_required: "אירעה תקלה בהפקת המסמך. רעננו את העמוד ונסו שוב.",
  consent_required: "צריך לאשר את הצהרת החתימה.",
  cancelled: "ההסכם בוטל ולא ניתן לחתום עליו. פנו לסוכן שלכם.",
  not_found: "ההסכם לא נמצא.",
  failed: "החתימה לא נקלטה. נסו שוב, ואם זה חוזר — פנו אלינו.",
  // Each of these used to be "failed" too. One message for four causes is one
  // message that cannot be acted on — by the customer or by us.
  body_unreadable: "הטופס לא נקלט במלואו. נסו שוב, ואם זה חוזר — צלמו את המסך ופנו אלינו.",
  unexpected: "אירעה תקלה בשליחת החתימה. נסו שוב, ואם זה חוזר — צלמו את המסך ופנו אלינו.",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

const PANEL_CSS = `
<style>
  .signpanel { max-width: 820px; margin: 0 auto 40px; padding: 26px 30px 30px;
               background: #fff; border-top: 4px solid #F05D86;
               box-shadow: 0 1px 3px rgba(16,24,40,.08); }
  .signpanel h2 { margin: 0 0 6px; font-size: 17px; }
  .signpanel p.hint { margin: 0 0 20px; color: #5F6575; font-size: 12.5px; }
  .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .field label { display: block; font-size: 11.5px; font-weight: 600; color: #5F6575; margin-bottom: 4px; }
  .field input { width: 100%; padding: 9px 11px; border: 1px solid #d9dee7; border-radius: 10px;
                 font: inherit; font-size: 13px; background: #fff; color: #191D2A; }
  .field input:focus { outline: 2px solid #F05D86; outline-offset: 1px; border-color: #F05D86; }
  .padwrap { margin-top: 20px; }
  .padwrap .row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .pad { width: 100%; height: 190px; margin-top: 6px; border: 2px dashed #d9dee7; border-radius: 12px;
         background: #fff; touch-action: none; cursor: crosshair; display: block; }
  .pad.drawn { border-style: solid; border-color: #F05D86; }
  .clear { border: 0; background: none; color: #F05D86; font: inherit; font-size: 12px;
           font-weight: 600; cursor: pointer; padding: 0; }
  .consent { display: flex; gap: 9px; align-items: flex-start; margin-top: 18px; font-size: 12.5px; color: #5F6575; }
  .consent input { margin-top: 3px; width: 16px; height: 16px; accent-color: #F05D86; }
  .go { margin-top: 20px; width: 100%; padding: 14px; border: 0; border-radius: 999px;
        background: #F05D86; color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
  .go:disabled { opacity: .45; cursor: not-allowed; }
  .err { margin: 0 0 18px; padding: 11px 14px; border-radius: 10px;
         background: #fdecef; color: #a4123a; font-size: 12.5px; font-weight: 600; }
  .done { max-width: 820px; margin: 0 auto 40px; padding: 26px 30px; background: #fff;
          border-top: 4px solid #16a34a; box-shadow: 0 1px 3px rgba(16,24,40,.08); }
  .done h2 { margin: 0 0 6px; font-size: 17px; color: #14532d; }
  .done p { margin: 0; color: #5F6575; font-size: 12.5px; }
  .nojs { margin: 0 0 18px; padding: 11px 14px; border-radius: 10px; background: #fff7ed;
          color: #9a3412; font-size: 12.5px; }

  .pdf { display: inline-flex; align-items: center; gap: 7px; margin-top: 16px;
         padding: 10px 20px; border: 1px solid #d9dee7; border-radius: 999px;
         background: #fff; color: #191D2A; font: inherit; font-size: 13px;
         font-weight: 600; cursor: pointer; }
  .pdf:hover { border-color: #F05D86; color: #F05D86; }
  .pdfhint { margin: 8px 0 0; color: #5F6575; font-size: 11.5px; }

  /* The panel is the page's furniture, not the contract. Printing it would put
     a signature pad and a submit button inside a signed PDF. */
  @media print { .signpanel, .done { display: none !important; } }
</style>`;

/**
 * Save the contract as a PDF.
 *
 * The browser's own print-to-PDF, not a second renderer. The document already
 * carries @media print rules, and the file this produces is the page the
 * customer read — same fonts, same pagination, same bytes on screen. Any PDF we
 * built separately would be a second opinion about what the contract looks
 * like, and this is the one document where there must only be one.
 */
function pdfButton(hint: string): string {
  return `
  <button type="button" class="pdf" onclick="window.print()">שמירה כ-PDF</button>
  <p class="pdfhint">${hint}</p>`;
}

const ILS = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });

export interface SignedPanelPayment {
  status: "pending" | "paid" | "failed" | "cancelled";
  /** Null when the amount is not known yet — the pay link works it out. */
  amount: number | null;
  payUrl: string;
}

/**
 * Shown once the contract carries a signature — and, when there is something
 * to pay, the way to pay it.
 *
 * `returned` is the word GROW's redirect brought back with the customer. It
 * shapes the message ("thank you" / "nothing was charged") but never the
 * status: a customer who lands on ?paid=1 with a row still pending is told the
 * confirmation is on its way, because it is the notification that settles it.
 */
export function renderSignedPanel(
  contractNumber: string,
  pay: { payment: SignedPanelPayment | null; returned: "success" | "cancelled" | null } = { payment: null, returned: null }
): string {
  const p = pay.payment;
  let payment = "";

  if (p?.status === "paid") {
    payment = `
  <div class="payblock paid">
    <h3>התשלום התקבל</h3>
    <p>${p.amount ? `שולם ${escapeHtml(ILS.format(p.amount))}.` : "התשלום נקלט."} תודה! הקבלה נשלחת מ-GROW לכתובת הדוא״ל שהוזנה בדף התשלום.</p>
  </div>`;
  } else if (p && pay.returned === "success") {
    payment = `
  <div class="payblock paid">
    <h3>תודה, התשלום בטיפול</h3>
    <p>קיבלנו את החזרה מדף התשלום. האישור הסופי מגיע מחברת הסליקה תוך דקות; אם התשלום לא הושלם, הכפתור יופיע כאן שוב.</p>
  </div>`;
  } else if (p) {
    payment = `
  <div class="payblock">
    <h3>תשלום חד־פעמי — ציוד והקמה</h3>
    <p>
      ${p.amount ? `לתשלום: <strong>${escapeHtml(ILS.format(p.amount))}</strong> כולל מע״מ. ` : ""}
      התשלום מתבצע בכרטיס אשראי בדף מאובטח של GROW (משולם). התשלום החודשי אינו כלול — הוא נגבה בנפרד עם עליית המערכת לאוויר.
      ${pay.returned === "cancelled" ? "<br><span class=\"note\">דף התשלום נסגר לפני שהושלם — לא בוצע חיוב.</span>" : ""}
    </p>
    <a class="paybtn" href="${escapeHtml(p.payUrl)}">לתשלום מאובטח</a>
  </div>`;
  }

  return `${PANEL_CSS}
<style>
  .payblock { margin-top: 22px; padding: 18px 20px; border-radius: 12px; background: #fff7fa; border: 1px solid #fbd0dd; }
  .payblock.paid { background: #f0fdf4; border-color: #bbf7d0; }
  .payblock h3 { margin: 0 0 6px; font-size: 15px; color: #191D2A; }
  .payblock p { margin: 0 0 14px; }
  .payblock .note { color: #9a3412; }
  .paybtn { display: inline-block; padding: 12px 28px; border-radius: 999px; background: #F05D86; color: #fff;
            font-weight: 700; font-size: 15px; text-decoration: none; }
  .paybtn:hover { background: #d9436d; }
  @media print { .payblock { display: none !important; } }
</style>
<div class="done" dir="rtl">
  <h2>ההסכם נחתם</h2>
  <p>
    הסכם ${escapeHtml(contractNumber)} נחתם ונשמר. נספח הראיות בתחתית המסמך מתעד מי חתם,
    מתי, ומאיזו כתובת. שמרו את הקישור הזה — הוא ימשיך להציג את ההסכם החתום.
  </p>
  ${payment}
  ${pdfButton("נפתח חלון ההדפסה של הדפדפן — בחרו ביעד ״שמירה כ-PDF״. הקובץ כולל את החתימה ואת נספח הראיות.")}
</div>`;
}

export function renderCancelledPanel(): string {
  return `${PANEL_CSS}
<div class="done" dir="rtl" style="border-top-color:#9aa0ad">
  <h2 style="color:#191D2A">ההסכם בוטל</h2>
  <p>ההסכם הזה בוטל ולא ניתן לחתום עליו. אם זו טעות, פנו לסוכן שלכם.</p>
</div>`;
}

export function renderSignPanel(
  token: string,
  defaults: { name?: string | null; taxId?: string | null },
  errorCode: string | null
): string {
  const message = errorCode ? ERRORS[errorCode] ?? ERRORS.failed : null;

  return `${PANEL_CSS}
<form class="signpanel" dir="rtl" method="post" action="/c/${escapeHtml(token)}" id="signform">
  <h2>חתימה על ההסכם</h2>
  <p class="hint">
    קראו את ההסכם למעלה. החתימה מתבצעת כאן, והמערכת תתעד את מועד החתימה, את כתובת ה-IP
    שממנה נחתם ואת טביעת המסמך המדויק שנחתם.
  </p>

  ${message ? `<p class="err" role="alert">${escapeHtml(message)}</p>` : ""}

  <noscript>
    <p class="nojs">
      חתימה דורשת דפדפן עם JavaScript. פתחו את הקישור בדפדפן אחר, או בקשו מהסוכן שלכם
      לשלוח את ההסכם בדרך אחרת.
    </p>
  </noscript>

  <div class="grid">
    <div class="field">
      <label for="signer_name">שם מלא של החותם *</label>
      <input id="signer_name" name="signer_name" required maxlength="120"
             autocomplete="name" value="${escapeHtml(defaults.name ?? "")}">
    </div>
    <div class="field">
      <label for="signer_id">ת.ז / ח.פ</label>
      <input id="signer_id" name="signer_id" maxlength="40" inputmode="numeric"
             value="${escapeHtml(defaults.taxId ?? "")}">
    </div>
    <div class="field">
      <label for="signer_role">תפקיד</label>
      <input id="signer_role" name="signer_role" maxlength="80" placeholder="בעלים / מנהל">
    </div>
  </div>

  <div class="padwrap">
    <div class="row">
      <label for="pad" style="font-size:11.5px;font-weight:600;color:#5F6575">חתמו כאן *</label>
      <button type="button" class="clear" id="clearpad">נקה חתימה</button>
    </div>
    <canvas class="pad" id="pad" aria-label="לוח חתימה"></canvas>
    <input type="hidden" name="signature" id="signature">
  </div>

  <label class="consent">
    <input type="checkbox" name="consent" value="1" required>
    <span>
      אני מאשר/ת שקראתי את ההסכם, שאני מוסמך/ת לחתום עליו בשם בית העסק, ושחתימה זו
      מחייבת אותי כחתימה בכתב יד.
    </span>
  </label>

  <button type="submit" class="go" id="go">חתימה ושליחה</button>

  ${pdfButton("רוצים לקרוא אותו לא כאן, או להראות אותו למישהו לפני שחותמים? שמרו עותק.")}
</form>

<script>
(function () {
  var canvas = document.getElementById('pad');
  var hidden = document.getElementById('signature');
  var form   = document.getElementById('signform');
  var go     = document.getElementById('go');
  if (!canvas || !hidden || !form) return;

  var ctx, drawn = false, drawing = false;

  // Draw at device resolution and scale back down, or the signature is a
  // staircase on exactly the phones people sign on.
  function size() {
    var ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var snapshot = drawn ? canvas.toDataURL('image/png') : null;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e2a5a';
    if (snapshot) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, w, h); };
      img.src = snapshot;
    }
  }
  size();
  window.addEventListener('resize', size);

  function at(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e) {
    e.preventDefault();
    drawing = true;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    var p = at(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // A tap with no drag is still a mark, so put a dot down immediately.
    ctx.lineTo(p.x + 0.1, p.y);
    ctx.stroke();
    mark();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = at(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() { drawing = false; }

  function mark() {
    if (drawn) return;
    drawn = true;
    canvas.classList.add('drawn');
  }

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  document.getElementById('clearpad').addEventListener('click', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
    canvas.classList.remove('drawn');
    hidden.value = '';
  });

  form.addEventListener('submit', function (e) {
    if (!drawn) {
      e.preventDefault();
      canvas.scrollIntoView({ block: 'center', behavior: 'smooth' });
      canvas.style.borderColor = '#dc2626';
      return;
    }
    hidden.value = canvas.toDataURL('image/png');
    // A second press would post a second signature; the server is idempotent
    // but the customer should not be able to wonder whether it went twice.
    go.disabled = true;
    go.textContent = 'שולח…';
  });
})();
</script>`;
}
