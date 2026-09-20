// ─── תן ביס, the little of it this portal needs ───────────────────────────────
//
// The portal does one thing with תן ביס: it proves a customer's credentials
// work, at the moment an agent types them in, instead of finding out weeks
// later when somebody tries to finish the onboarding. That is a single call.
//
// Their API is path-parameter based, has no API key, and answers every call
// with { Success, ErrorCode, ErrorDesc, Data }. The shape of that answer varies
// more than it should, and every `??` chain below is a variation their service
// has actually been observed to produce — in the operational system that has
// been talking to them for months. Tidying one away is how this quietly stops
// working for some accounts and not others.
//
// One thing worth saying out loud: their login puts the password in the URL
// PATH. That is their design and we cannot change it, but it means the request
// URL is a secret. It must never be logged, never go in an error message, and
// never reach the browser. The code below is written so there is no URL to
// leak — it is built inside the call and not returned.

const TENBIS_BASE = "https://www.10bis.co.il/api/reshome/v2/reshomeservice.svc";

/** Their service wants a distinct request id on every call. */
function reqId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export interface TenbisCredentials {
  user: string;
  password: string;
  restaurantId: string;
}

/**
 * What happened, in the three shapes the agent needs told apart.
 *
 * "rejected" is the customer's problem — wrong details, or an account תן ביס
 * has not finished opening. "unreachable" is ours, or nobody's. Collapsing them
 * into one failure would send an agent to chase a customer over an outage.
 */
export type TenbisVerifyResult =
  | { ok: true; token: string }
  | { ok: false; reason: "rejected"; message: string; code: number | null }
  | { ok: false; reason: "unreachable"; message: string };

/**
 * Log in, which is the whole of the verification.
 *
 * Returns a result rather than throwing: every caller is a route that has to
 * turn this into a sentence for an agent, and an exception would make the
 * ordinary case — wrong password — look like a fault in the portal.
 */
export async function verifyTenbisCredentials(
  creds: TenbisCredentials,
  { timeoutMs = 10_000, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<TenbisVerifyResult> {
  const user = creds.user.trim();
  const password = creds.password;
  const resId = creds.restaurantId.trim();

  if (!user || !password || !resId) {
    return { ok: false, reason: "rejected", message: "חסרים פרטי התחברות", code: null };
  }

  // encodeURIComponent on every part, because all three go in the path and a
  // password is allowed to contain a slash, a hash or a question mark — any of
  // which would otherwise silently change which endpoint is being called.
  const url =
    `${TENBIS_BASE}/LogIn/${encodeURIComponent(user)}` +
    `/${encodeURIComponent(password)}/${encodeURIComponent(resId)}/${reqId()}`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // Deliberately not including the error's own message when it might carry
    // the URL — and therefore the password. A timeout and a DNS failure are the
    // same sentence to an agent anyway.
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      ok: false,
      reason: "unreachable",
      message: timedOut ? "תן ביס לא ענו בזמן. נסו שוב." : "לא הצלחנו להגיע לתן ביס כרגע.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: "unreachable",
      message: `תן ביס החזירו שגיאה (${res.status}).`,
    };
  }

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "unreachable", message: "תשובה לא תקינה מתן ביס." };
  }

  if (!body["Success"]) {
    const code = typeof body["ErrorCode"] === "number" ? (body["ErrorCode"] as number) : null;
    // ErrorDesc arrives in Hebrew already, and is the most useful thing we can
    // put in front of an agent. Fall back only when it is absent.
    const desc = String(body["ErrorDesc"] ?? "").trim();
    return {
      ok: false,
      reason: "rejected",
      message: desc || "תן ביס דחו את פרטי ההתחברות.",
      code,
    };
  }

  // Three places, all of them seen in the wild.
  const data = (body["Data"] ?? {}) as Record<string, unknown>;
  const token = body["Token"] ?? data["Token"] ?? data["TokenID"];
  if (!token) {
    // Success with no token is their bug, not the customer's, so it is not a
    // rejection — sending the agent to re-ask for the password would be wrong.
    return { ok: false, reason: "unreachable", message: "תן ביס אישרו אך לא החזירו טוקן." };
  }

  return { ok: true, token: String(token) };
}
