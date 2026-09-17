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
       :root { color-scheme: light; }
       body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #F6F7F9; color: #191D2A; }
       .wrap { max-width: 520px; margin: 0 auto; padding: 32px 16px 48px; }
       h1 { font-size: 20px; margin: 0 0 6px; }
       p.sub { color: #5F6575; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
       .card { background: #fff; border: 1px solid #E4E7EC; border-radius: 16px; padding: 8px; }
       .row { display: flex; align-items: center; gap: 12px; padding: 14px 12px; border-radius: 12px; cursor: pointer; }
       .row + .row { border-top: 1px solid #F0F1F4; }
       .row:hover { background: #FAFAFB; }
       .row.paid { cursor: default; opacity: .55; }
       .row input { width: 20px; height: 20px; flex: none; accent-color: #F05D86; }
       .label { flex: 1; font-size: 15px; }
       .tag { font-style: normal; font-size: 12px; font-weight: 700; }
       .paid-tag { color: #0F7B50; }
       .sent-tag { color: #8A6100; }
       .amount { font-size: 15px; font-weight: 700; white-space: nowrap; text-align: start; }
       .net { display: block; font-style: normal; font-size: 12px; font-weight: 400; color: #8A90A0; margin-top: 2px; }
       .figure { text-align: start; }
       button { width: 100%; margin-top: 20px; padding: 15px; border: 0; border-radius: 999px;
                background: #191D2A; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; }
       button:disabled { opacity: .5; cursor: default; }
       .err { background: #FEF2F2; color: #B91C1C; border-radius: 12px; padding: 12px 14px; font-size: 14px; margin-bottom: 16px; }
       .note { color: #5F6575; font-size: 13px; line-height: 1.6; margin-top: 16px; text-align: center; }
       /* .total sets display:flex, which beats the default display:none that
          the hidden attribute relies on — so "יישאר לתשלום ₪0.00" stayed on
          screen with everything ticked. Nothing else here toggles visibility,
          so this is stated once, loudly, rather than per rule. */
       [hidden] { display: none !important; }
       .totals { margin-top: 12px; padding: 4px 8px 8px; }
       .total { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 12px; font-size: 15px; }
       .total.now strong { font-size: 19px; }
       .total.rest { border-top: 1px solid #F0F1F4; color: #5F6575; font-size: 14px; }
       .total.rest span:last-child { font-weight: 700; }
     </style></head>
     <body><div class="wrap">
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

function page(title: string, text: string, status: number, back?: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${esc(title)}</title></head>
     <body style="font-family:Arial,sans-serif;padding:48px 24px;text-align:center;color:#191D2A">
     <h1 style="font-size:20px">${esc(title)}</h1>
     <p style="color:#5F6575">${esc(text)}</p>
     ${back ? `<p><a href="${esc(back)}" style="color:#F05D86;font-weight:600">חזרה להסכם</a></p>` : ""}
     </body></html>`,
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
