import { paymentUrlForToken } from "@/lib/agent/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /c/<token>/pay — the link a customer is given to pay.
 *
 * Ours, not GROW's, on purpose. A GROW page expires and a contract does not;
 * this address always leads to a page that can take the money — the pending
 * one, or a fresh one — so the link in the email and in the agent's WhatsApp
 * stays right for as long as anything is owed. Once paid, it says so instead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return page("ההסכם לא נמצא", "ייתכן שהקישור שגוי. פנו לסוכן שלכם.", 404);

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
