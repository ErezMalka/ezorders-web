import { timingSafeEqual } from "node:crypto";

import { notifySecret, recordGrowNotification } from "@/lib/agent/payments";
import { parseGrowNotification } from "@/lib/grow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where GROW reports a payment — server to server, once the customer is done.
 *
 *   POST /api/pay/grow/notify?p=<payment id>&s=<secret>
 *
 * GROW expects a plain "OK"; anything else makes it retry. It gets one on every
 * path except a bad secret, because a retry loop would not fix a bad row and
 * would fill the logs trying. The form's word is not taken for the money: the
 * handler asks GROW's own API before recording "paid".
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("p") ?? "";
  const secret = url.searchParams.get("s") ?? "";

  if (!secretMatches(secret) || !/^[0-9a-f-]{36}$/.test(paymentId)) {
    return new Response("Forbidden", { status: 403 });
  }

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
  try {
    const outcome = await recordGrowNotification(paymentId, notification, {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    });
    console.log("[grow/notify]", paymentId, outcome, notification.statusCode, notification.transactionId ?? "");
  } catch (error) {
    console.error("[grow/notify] failed", paymentId, error);
  }

  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

/** GROW may probe the address; answer politely, record nothing. */
export async function GET() {
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

function secretMatches(given: string): boolean {
  const expected = Buffer.from(notifySecret());
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64) || null;
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}
