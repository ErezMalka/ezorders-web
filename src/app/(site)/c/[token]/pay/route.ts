import {
  contractIdForToken,
  contractPayableParts,
  contractPaymentTotals,
  issueCustomerSelection,
  paymentUrlForToken,
  type PayablePart,
} from "@/lib/agent/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /c/<token>/pay — the link a customer is given to pay.
 *
 * Ours, not GROW's, on purpose. A GROW page expires and a contract does not;
 * this address always leads to a page that can take the money — the pending
 * one, or a fresh one — so the link in the email and in the agent's WhatsApp
 * stays right for as long as anything is owed. Once paid, it says so instead.
 *
 * When there is more than one thing left to pay for, it asks first. A customer
 * who wants the setup on a card and the hardware by transfer should not have to
 * ring their agent to arrange it: they tick what they are paying now and come
 * back to the same address for the rest. GROW cannot take a partial payment, so
 * each choice becomes a link of its own.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return page("ההסכם לא נמצא", "ייתכן שהקישור שגוי. פנו לסוכן שלכם.", 404);

  // Ask before redirecting, when there is a choice worth making. One thing left
  // to pay for goes straight through as it always did — a chooser with a single
  // option is a page nobody should have to read.
  const contractId = await contractIdForToken(token);
  if (contractId) {
    const [parts, totals] = await Promise.all([
      contractPayableParts(contractId),
      contractPaymentTotals(contractId),
    ]);
    const open = parts.filter((p) => p.claimedBy?.status !== "paid");
    if (totals && totals.outstanding > 0 && open.length > 1) {
      return chooser(token, parts, null);
    }
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const result = await paymentUrlForToken(token, origin, {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
  });

  if ("url" in result) {
    return new Response(null, {
      status: 302,
      headers: { Location: result.url, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  switch (result.blocked) {
    case "paid":
      return page("התשלום כבר התקבל", "ההסכם הזה שולם. תודה!", 200, `/c/${token}`);
    case "unsigned":
      return page("ההסכם עדיין לא נחתם", "אפשר לשלם רק אחרי חתימה על ההסכם.", 200, `/c/${token}`);
    case "not_found":
      return page("ההסכם לא נמצא", "ייתכן שהקישור שגוי או שההסכם הוסר. פנו לסוכן שלכם.", 404);
    case "disabled":
      return page("תשלום בכרטיס אינו זמין כרגע", "פנו לסוכן שלכם לתיאום התשלום.", 200, `/c/${token}`);
    default:
      console.error("[c/token/pay] could not issue a link", result.message);
      return page("לא הצלחנו לפתוח את דף התשלום", "נסו שוב בעוד רגע, ואם זה חוזר — פנו לסוכן שלכם.", 500, `/c/${token}`);
  }
}

/**
 * The customer's choice, coming back.
 *
 * A selection, never a price. The amount is computed on the server from the
 * keys, because a price in a form is a price a customer can edit.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return page("ההסכם לא נמצא", "ייתכן שהקישור שגוי.", 404);

  let keys: string[] = [];
  try {
    const form = await request.formData();
    keys = form.getAll("part").map((v) => String(v)).filter((v) => v.length > 0 && v.length <= 64).slice(0, 50);
  } catch {
    keys = [];
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const result = await issueCustomerSelection(token, keys, origin, {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
  });

  if ("url" in result) {
    // 303, so a refresh of the payment page does not repost the choice and mint
    // a second link for the same items.
    return new Response(null, {
      status: 303,
      headers: { Location: result.url, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // Back to the chooser with the reason, rather than a dead end.
  const contractId = await contractIdForToken(token);
  const parts = contractId ? await contractPayableParts(contractId) : [];
  if (parts.length) return chooser(token, parts, result.error);
  return page("לא הצלחנו לפתוח את דף התשלום", result.error, 200, `/c/${token}`);
}

const ILS = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });

/**
 * "What would you like to pay now?"
 *
 * Plain HTML and a plain form: this is the page a restaurant owner opens on a
 * phone, from a WhatsApp message, possibly on a bad connection. Everything is
 * checked by default, so the customer who just wants to pay the whole thing
 * presses one button and never thinks about any of this.
 */
function chooser(token: string, parts: PayablePart[], error: string | null): Response {
  const rows = parts
    .map((part) => {
      const paid = part.claimedBy?.status === "paid";
      // Only a part that has actually been PAID is closed. A part with a link
      // already out stays fully selectable: that link may have lapsed, or gone
      // to an inbox nobody reads, and a customer who wants to pay must always
      // be able to. Choosing it simply replaces the old link with a fresh one.
      const tag = paid ? ' <em class="tag paid-tag">שולם</em>' : "";
      // Agorot as an integer: the running total is summed in the browser, and
      // adding 2301.00 + 578.20 in floating point is how a footer ends up
      // reading ₪2,879.1999999999998.
      return `<label class="row${paid ? " paid" : ""}">
        <input type="checkbox" name="part" value="${esc(part.key)}"
               data-agorot="${Math.round(part.amount * 100)}"
               data-net="${Math.round(part.net * 100)}" ${paid ? "disabled" : "checked"}>
        <span class="label">${esc(part.label)}${tag}</span>
        <span class="amount">${esc(ILS.format(part.amount))}
          <em class="net">(${esc(ILS.format(part.net))} לפני מע״מ)</em>
        </span>
      </label>`;
    })
    .join("");

  const open = parts.filter((p) => p.claimedBy?.status !== "paid");
  const openTotal = open.reduce((t, p) => t + p.amount, 0);

  return new Response(
    `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>תשלום</title>
     <style>
       /* No web font. This page opens from a WhatsApp message on a phone that
          may be on one bar, and a render-blocking font request on the screen
          where someone is about to type a card number is not worth the
          typography. The stack below picks up Rubik or Assistant when the
          device already has them, which covers most Hebrew phones. */
       :root {
         color-scheme: light;
         --ink: #191D2A; --muted: #5F6575; --faint: #8A90A0;
         --line: #E4E7EC; --hair: #F0F1F4; --bg: #F6F7F9;
         --pink: #F05D86; --pink-ink: #C92A5C;
       }
       * { box-sizing: border-box; }
       body {
         font-family: Rubik, Assistant, "Segoe UI", Arial, Helvetica, sans-serif;
         margin: 0; background: var(--bg); color: var(--ink);
         -webkit-font-smoothing: antialiased;
       }
       .wrap { max-width: 480px; margin: 0 auto; padding: 28px 16px 40px; }

       .brand { text-align: center; margin-bottom: 22px; }
       .brand img { width: 124px; height: auto; }

       h1 { font-size: 21px; line-height: 1.35; margin: 0 0 6px; letter-spacing: -0.01em; }
       p.sub { color: var(--muted); font-size: 14px; line-height: 1.65; margin: 0 0 18px; }

       .card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 6px;
               box-shadow: 0 1px 2px rgba(25,29,42,.04), 0 8px 24px rgba(25,29,42,.05); }

       .row { display: flex; align-items: center; gap: 13px; padding: 15px 13px; border-radius: 13px;
              cursor: pointer; transition: background .12s ease; }
       .row + .row { border-top: 1px solid var(--hair); }
       .row:hover { background: #FBFBFC; }
       .row:has(input:checked) { background: #FFF7F9; }
       .row.paid { cursor: default; opacity: .5; }
       .row.paid:hover, .row.paid:has(input:checked) { background: none; }
       .row input { width: 21px; height: 21px; flex: none; accent-color: var(--pink); cursor: inherit; }
       .row:focus-within { outline: 2px solid var(--pink); outline-offset: 2px; }

       .label { flex: 1; font-size: 15px; line-height: 1.4; }
       .tag { font-style: normal; font-size: 12px; font-weight: 700; }
       .paid-tag { color: #0F7B50; }
       .amount { font-size: 15.5px; font-weight: 700; white-space: nowrap; text-align: start; }
       .net, .figure em { display: block; font-style: normal; font-size: 11.5px;
                          font-weight: 400; color: var(--faint); margin-top: 3px; }
       .figure { text-align: start; }

       /* .total sets display:flex, which beats the default display:none that
          the hidden attribute relies on — so "יישאר לתשלום ₪0.00" stayed on
          screen with everything ticked. Stated once, loudly, rather than per
          rule, because nothing else here toggles visibility. */
       [hidden] { display: none !important; }

       .totals { margin-top: 12px; padding: 6px 8px; }
       .total { display: flex; justify-content: space-between; align-items: baseline;
                padding: 11px 13px; font-size: 15px; }
       .total.now strong { font-size: 21px; letter-spacing: -0.02em; }
       .total.rest { border-top: 1px solid var(--hair); color: var(--muted); font-size: 14px; }
       .total.rest span:last-child { font-weight: 700; }

       button { width: 100%; margin-top: 18px; padding: 16px; border: 0; border-radius: 999px;
                background: var(--ink); color: #fff; font-size: 16.5px; font-weight: 700;
                font-family: inherit; cursor: pointer; transition: opacity .12s ease; }
       button:hover:not(:disabled) { opacity: .9; }
       button:disabled { opacity: .45; cursor: default; }

       .err { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; border-radius: 14px;
              padding: 13px 15px; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }

       .note { color: var(--muted); font-size: 13px; line-height: 1.7; margin-top: 18px; text-align: center; }
       .secure { display: flex; align-items: center; justify-content: center; gap: 6px;
                 color: var(--faint); font-size: 12.5px; margin-top: 14px; }
       .secure svg { width: 13px; height: 13px; flex: none; }

       @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
     </style></head>
     <body><div class="wrap">
       <!-- The same mark as the site and the signed agreement. A payment screen
            that does not look like the company that sent it is a payment screen
            people abandon. -->
       <div class="brand"><img src="/images/logo.webp" alt="EZOrders" width="124" height="39"></div>

       <h1>מה תרצו לשלם עכשיו?</h1>
       <p class="sub">אפשר לשלם הכל יחד, או לבחור חלק ולשלם את השאר בהמשך — גם באמצעי תשלום אחר.</p>
       ${error ? `<div class="err">${esc(error)}</div>` : ""}
       <form method="POST">
         <div class="card">
           ${rows}
         </div>

         <!-- The sum of what is ticked, and what that leaves behind. It said
              "סה״כ לתשלום" against the whole bill whatever was selected, so a
              customer paying one item of three read a number four times what
              they were about to be charged. -->
         <div class="card totals">
           <div class="total now">
             <span>לתשלום עכשיו</span>
             <span class="figure">
               <strong id="now">${esc(ILS.format(openTotal))}</strong>
               <em class="net" id="now-net"></em>
             </span>
           </div>
           <div class="total rest" id="rest-row" hidden>
             <span>יישאר לתשלום</span>
             <span id="rest"></span>
           </div>
         </div>

         <button type="submit" id="go">המשך לתשלום</button>
       </form>
       <script>
         (function () {
           var boxes = [].slice.call(document.querySelectorAll('input[name="part"]:not([disabled])'));
           var now = document.getElementById('now');
           var rest = document.getElementById('rest');
           var restRow = document.getElementById('rest-row');
           var go = document.getElementById('go');
           var nowNet = document.getElementById('now-net');
           var open = boxes.reduce(function (t, b) { return t + Number(b.dataset.agorot || 0); }, 0);

           function money(agorot) {
             return (agorot / 100).toLocaleString('he-IL', {
               style: 'currency', currency: 'ILS', maximumFractionDigits: 2,
             });
           }

           function render() {
             var picked = boxes.reduce(function (t, b) {
               return t + (b.checked ? Number(b.dataset.agorot || 0) : 0);
             }, 0);
             var pickedNet = boxes.reduce(function (t, b) {
               return t + (b.checked ? Number(b.dataset.net || 0) : 0);
             }, 0);
             now.textContent = money(picked);
             nowNet.textContent = '(' + money(pickedNet) + ' לפני מע״מ)';
             var left = open - picked;
             restRow.hidden = left <= 0;
             rest.textContent = money(left);
             // Nothing ticked is not a payment; the button says so rather than
             // sending an empty selection to be refused.
             go.disabled = picked <= 0;
           }

           boxes.forEach(function (b) { b.addEventListener('change', render); });
           render();
         })();
       </script>
       <p class="note">בעמוד הבא אפשר לשלם בכרטיס אשראי, בביט או בהעברה בנקאית.</p>
       <p class="secure">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <rect x="4" y="10" width="16" height="11" rx="2"></rect>
           <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
         </svg>
         התשלום מאובטח ומתבצע בעמוד של GROW
       </p>
     </div></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}

/** The dead ends and the good news, wearing the same clothes as the chooser. */
function page(title: string, text: string, status: number, back?: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${esc(title)}</title>
     <style>
       :root { color-scheme: light; }
       body { font-family: Rubik, Assistant, "Segoe UI", Arial, Helvetica, sans-serif; margin: 0;
              background: #F6F7F9; color: #191D2A; -webkit-font-smoothing: antialiased; }
       .wrap { max-width: 440px; margin: 0 auto; padding: 48px 20px; text-align: center; }
       .brand img { width: 124px; height: auto; margin-bottom: 26px; }
       .card { background: #fff; border: 1px solid #E4E7EC; border-radius: 18px; padding: 30px 22px;
               box-shadow: 0 1px 2px rgba(25,29,42,.04), 0 8px 24px rgba(25,29,42,.05); }
       h1 { font-size: 19px; margin: 0 0 8px; letter-spacing: -0.01em; }
       p { color: #5F6575; font-size: 14.5px; line-height: 1.7; margin: 0; }
       a { display: inline-block; margin-top: 20px; color: #C92A5C; font-weight: 700;
           font-size: 14.5px; text-decoration: none; }
       a:hover { text-decoration: underline; }
     </style></head>
     <body><div class="wrap">
       <div class="brand"><img src="/images/logo.webp" alt="EZOrders" width="124" height="39"></div>
       <div class="card">
         <h1>${esc(title)}</h1>
         <p>${esc(text)}</p>
         ${back ? `<a href="${esc(back)}">חזרה להסכם</a>` : ""}
       </div>
     </div></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}

function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64) || null;
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}
