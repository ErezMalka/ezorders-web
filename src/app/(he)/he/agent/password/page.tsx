import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";
import { requireAgentSessionRaw } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "החלפת סיסמה - ezorders",
  robots: { index: false, follow: false },
};

/**
 * Deliberately outside AgentShell: an agent still carrying a password someone
 * else chose has nowhere to navigate to, so showing them the navigation would
 * only offer doors that bounce them back here.
 */
export default async function ChangePasswordPage() {
  const session = await requireAgentSessionRaw();

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-brand-grey px-6 py-16">
      <div className="w-full max-w-md rounded-card border border-slate-200 bg-white p-9 shadow-sm">
        <p className="text-2xl font-extrabold tracking-tight text-brand-dark">
          EZ<span className="text-brand-pink">ORDERS</span>
        </p>

        {session.mustChangePassword ? (
          <p className="mb-7 mt-2 text-sm text-brand-muted">
            הסיסמה הנוכחית שלך נקבעה על ידי מנהל. בחר סיסמה משלך כדי להמשיך.
          </p>
        ) : (
          <p className="mb-7 mt-2 text-sm text-brand-muted">החלפת הסיסמה שלך.</p>
        )}

        <ChangePasswordForm forced={session.mustChangePassword} />
      </div>
    </div>
  );
}
