"use client";

import Link from "next/link";
import { useState } from "react";
import { nav, SIGNUP_URL } from "@/data/content";
import { CTAButton } from "./CTAButton";
import { Logo } from "./Logo";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 z-50 w-full">
      <div className="mx-auto flex max-w-container items-center justify-between px-6 py-6">
        <Logo />

        <nav className="hidden items-center gap-8 font-medium md:flex">
          {nav.map((entry) =>
            "items" in entry ? (
              <div key={entry.label} className="group relative">
                <Link href={entry.href} className="flex items-center gap-1">
                  {entry.label}
                  <span className="text-xs">▾</span>
                </Link>
                <div className="invisible absolute left-0 top-full w-64 rounded-card bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {entry.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className="block rounded-lg px-4 py-2 hover:bg-brand-grey"
                    >
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={entry.label} href={entry.href}>
                {entry.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:block">
          <CTAButton href={SIGNUP_URL}>Try Free for 14 Days</CTAButton>
        </div>

        <button
          className="text-2xl md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="mx-4 rounded-card bg-white p-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-2 font-medium">
            {nav.map((entry) => (
              <div key={entry.label}>
                <Link href={entry.href} className="block py-2" onClick={() => setOpen(false)}>
                  {entry.label}
                </Link>
                {"items" in entry &&
                  entry.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className="block py-1 pl-4 text-sm text-brand-muted"
                      onClick={() => setOpen(false)}
                    >
                      {i.label}
                    </Link>
                  ))}
              </div>
            ))}
            <CTAButton href={SIGNUP_URL} className="mt-2">
              Try Free for 14 Days
            </CTAButton>
          </nav>
        </div>
      )}
    </header>
  );
}