import type { Metadata } from "next";

import { LoginForm } from "@/components/agent/LoginForm";
import { isPortalConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כניסת סוכנים - ezorders",
  // The portal is a private tool; keep it out of the index entirely.
  robots: { index: false, follow: false },
};

export default function AgentLoginPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark via-brand-indigo to-brand-pink px-6 py-16"
    >
      <div className="w-full max-w-md rounded-card bg-white p-9 shadow-2xl">
        <p className="text-2xl font-extrabold tracking-tight text-brand-dark">
          EZ<span className="text-brand-pink">ORDERS</span>
        </p>
        <p className="mb-7 mt-1 text-sm text-brand-muted">אזור אישי לסוכן מכירות</p>

        {isPortalConfigured() ? (
          <LoginForm />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">האזור האישי אינו מוגדר בסביבה הזו.</p>
            <p className="mt-1 leading-relaxed">
              יש להגדיר את <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> ו-
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> בהגדרות הפרויקט.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
