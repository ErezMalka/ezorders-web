import { getAgentSession } from "@/lib/agent/session";
import { growEnabled, growLinkEnabled } from "@/lib/grow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which GROW services this deployment can actually reach.
 *
 * A payment link falls back to the card page whenever it cannot be minted, and
 * that is deliberate — a contract payable only by card beats one that cannot be
 * paid at all. But the fallback is silent by design, so from outside there is
 * no way to tell "the credentials are missing" from "GROW refused them", and
 * those have completely different fixes: one is four environment variables and
 * a redeploy, the other is a phone call to GROW.
 *
 * Environment variables are visible to a running Vercel deployment only if they
 * existed when it was built, so "I added them" and "this code can see them" are
 * genuinely different facts. This reports the second one.
 *
 * BOOLEANS ONLY. Never the values, never a prefix, never a length — this says
 * whether a secret is set, which is not a secret. Signed-in agents only, so it
 * is not a free probe of someone else's configuration.
 */
export async function GET() {
  const session = await getAgentSession();
  if (!session) return Response.json({ error: "לא מחובר" }, { status: 401 });

  const present = (name: string) => (process.env[name] ?? "").trim().length > 0;

  return Response.json({
    // The card page — what every contract payment has used until now.
    card_page: growEnabled(),
    // The payment link — card, Bit and bank transfer.
    payment_link: growLinkEnabled(),
    variables: {
      GROW_PR_BASE_URL: present("GROW_PR_BASE_URL"),
      GROW_PR_USER_ID: present("GROW_PR_USER_ID"),
      GROW_PR_PAGE_CODE: present("GROW_PR_PAGE_CODE"),
      GROW_PR_API_KEY: present("GROW_PR_API_KEY"),
    },
    // GROW_PR_BASE_URL has a default, so the link can be on without it.
    hint: growLinkEnabled()
      ? "קישורי תשלום מוגדרים. אם עדיין מתקבל דף אשראי — GROW סירב, והסיבה בלוג."
      : "קישורי תשלום אינם מוגדרים בפריסה הזו. הוסיפו את המשתנים החסרים ובצעו Redeploy.",
  });
}
