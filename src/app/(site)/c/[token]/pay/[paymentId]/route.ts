import { paymentUrlForPart } from "@/lib/agent/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /c/<token>/pay/<payment id> — one part of a split bill.
 *
 * The sibling route, /c/<token>/pay, means "what is owed", and that is a single
 * destination. A customer paying הקמה on a card and עמדה by transfer owes two
 * things at once, so each gets an address of its own.
 *
 * Still ours rather than GROW's, for the same reason as the sibling: the URL
 * the customer was sent keeps working even if the page behind it is reissued.
 *
 * The token is not decoration. A payment id on its own would open any bill in
 * the table; it has to belong to the contract the token names.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; paymentId: string }> }) {
  const { token, paymentId } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return page("ההסכם לא נמצא", "ייתכן שהקישור שגוי. פנו לסוכן שלכם.", 404);
  }

  const result = await paymentUrlForPart(token, paymentId);
  if ("url" in result) {
    return new Response(null, {
      status: 302,
      headers: { Location: result.url, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  switch (result.blocked) {
    case "paid":
      return page("התשלום כבר התקבל", "החלק הזה שולם. תודה!", 200, `/c/${token}`);
    case "cancelled":
      return page("הקישור הוחלף", "נשלח אליכם קישור מעודכן. אם לא הגיע — פנו לסוכן שלכם.", 200, `/c/${token}`);
    default:
      return page("הקישור לא נמצא", "ייתכן שהקישור שגוי. פנו לסוכן שלכם.", 404);
  }
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
