import Link from "next/link";

import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";
import type { AgentSession } from "@/lib/agent/session";

/**
 * Chrome for every signed-in portal page: identity, navigation, sign-out.
 *
 * A server component, so the session it renders is the verified one rather than
 * something the browser was trusted to report.
 */

const NAV = [
  { href: "/he/agent", label: "לוח בקרה", adminOnly: false },
  { href: "/he/agent/new", label: "הצעה חדשה", adminOnly: false },
  { href: "/he/agent/quotes", label: "ההצעות שלי", adminOnly: false },
  { href: "/he/agent/orders", label: "הזמנות", adminOnly: false },
  { href: "/he/agent/new-contract", label: "הסכם ישיר", adminOnly: false },
  { href: "/he/agent/contracts", label: "הסכמים", adminOnly: false },
  { href: "/he/agent/products", label: "מחירון", adminOnly: true },
  { href: "/he/agent/contract-template", label: "נוסח הסכם", adminOnly: true },
  { href: "/he/agent/team", label: "צוות", adminOnly: true },
];

const ROLE_LABEL: Record<AgentSession["role"], string> = {
  agent: "אזור סוכן",
  manager: "אזור מנהל",
  admin: "מנהל מערכת",
};

export function AgentShell({
  session,
  active,
  title,
  lead,
  action,
  children,
}: {
  session: AgentSession;
  active: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-grey">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-container flex-wrap items-center gap-4 px-6 py-3">
          <Logo href="/he/agent" width={118} />
          <span className="rounded-pill bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-pinkInk">
            {ROLE_LABEL[session.role]}
          </span>

          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.filter((item) => !item.adminOnly || session.isAdmin).map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-pinkStrong text-white"
                      : "text-brand-muted hover:bg-brand-tint hover:text-brand-pink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-semibold text-brand-dark">{session.fullName}</p>
              <p className="text-xs text-brand-muted">{session.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-container px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-dark">{title}</h1>
            {lead ? <p className="mt-1 text-sm text-brand-muted">{lead}</p> : null}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}
