import { paymentIdForProcess, recordGrowNotification } from "@/lib/agent/payments";
import { parseGrowNotification } from "@/lib/grow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where GROW reports a PAYMENT LINK — card, Bit or bank transfer.
 *
 *   POST /api/pay/grow/notify/link
 *
 * The sibling route carries the payment id and a secret in its query string.
 * This one cannot: GROW refuses to mint a link whose parameters contain special
 * characters, and "?p=…&s=…" is exactly that. So the address is bare and the
 * notification is matched on the process id GROW reports, which was stored when
 * the link was created.
 *
 * That removes a guard, and it is worth being clear about what it did. The
 * secret refused a stray POST before it could cost a call to GROW's API — a
 * cost control, not the thing standing between a stranger and a paid contract.
 * That remains recordGrowNotification, which asks GROW's own API whether the
 * money arrived and ignores whatever this form claims. A forged POST here can
 * make nothing paid; at worst it spends one API call on a process id it had to
 * know already.
 *
 * GROW expects a plain "OK" and retries anything else, so it gets one on every
 * path — a retry loop would not fix an unknown process id and would fill the
 * logs trying.
 */
export async function POST(request: Request) {
  let raw: Record<string, string> = {};
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      raw = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
    } else {
      const form = await request.formData();
      raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    }
  } catch {
    raw = {};
  }

  const notification = parseGrowNotification(raw);
  const processId = notification.processId ?? "";
  if (!processId) {
    console.warn("[grow/notify/link] no process id in the notification");
    return ok();
  }

  try {
    const paymentId = await paymentIdForProcess(processId);
    if (!paymentId) {
      // Not ours, or a link minted before this route existed. Saying so beats
      // a silent 200 when a real payment goes unrecorded.
      console.warn("[grow/notify/link] no payment for process", processId);
      return ok();
    }

    const outcome = await recordGrowNotification(paymentId, notification, {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    });
    console.log("[grow/notify/link]", paymentId, outcome, notification.statusCode, notification.transactionId ?? "");
  } catch (error) {
    console.error("[grow/notify/link] failed", processId, error);
  }

  return ok();
}

/** GROW may probe the address; answer politely, record nothing. */
export async function GET() {
  return ok();
}

function ok() {
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
