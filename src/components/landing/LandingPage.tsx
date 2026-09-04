import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LandingLeadForm } from "@/components/landing/LandingLeadForm";
import type { LandingContent } from "@/data/landingPages";

// Shell for the paid-traffic landing pages. Deliberately NOT PageLayout: a
// landing page bought with ad money keeps one exit — the form — so the site
// header/nav and the full footer are replaced by a logo, a phone number and
// anchors back to the form.

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-1 h-5 w-5 shrink-0 fill-current">
      <path d="M8.1 14.6 4.3 10.8l1.4-1.4 2.4 2.4 6-6 1.4 1.4z" />
    </svg>
  );
}

const PHONE = "*4958";

export function LandingPage({ content }: { content: LandingContent }) {
  const formProps = {
    funnel: content.funnel,
    eventName: content.eventName,
    title: content.formTitle,
    subtitle: content.formSubtitle,
    cta: content.formCta,
    successTitle: content.successTitle,
    successText: content.successText,
    select: content.select,
  };

  return (
    <div id="top" className="pb-24 md:pb-0">
      {/* Slim bar — logo, phone, and a single anchor back to the form */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-3">
          <Logo href="#top" />
          <div className="flex items-center gap-3">
            <a
              href={`tel:${PHONE}`}
              className="hidden text-sm font-medium text-brand-indigo sm:block"
            >
              {PHONE}
            </a>
            <a
              href="#lead-form"
              className="rounded-pill bg-brand-pinkStrong px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-pinkInk"
            >
              {content.navCta}
            </a>
          </div>
        </div>
      </header>

      {/* Hero + form */}
      <section className="bg-brand-indigo">
        <div className="mx-auto grid max-w-container items-start gap-10 px-6 pb-16 pt-12 md:grid-cols-2 md:pb-20 md:pt-16">
          <div className="text-white">
            <span className="inline-block rounded-pill bg-white/15 px-4 py-1.5 text-sm font-medium">
              {content.eyebrow}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight md:text-[2.75rem]">
              {content.h1}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/80">{content.sub}</p>
            <ul className="mt-8 space-y-3">
              {content.heroBullets.map((b) => (
                <li key={b} className="flex gap-3 text-white/90">
                  <span className="text-brand-pink">
                    <Check />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-white/60">{content.heroFootnote}</p>
          </div>
          <LandingLeadForm {...formProps} />
        </div>
      </section>

      {/* The problem, in the visitor's words */}
      <section className="bg-brand-grey py-16 md:py-20">
        <div className="mx-auto max-w-container px-6">
          <h2 className="mx-auto mb-10 max-w-2xl text-center text-2xl font-extrabold text-brand-dark md:text-3xl">
            {content.painTitle}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {content.pains.map((p) => (
              <div key={p.title} className="rounded-card bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold text-brand-dark">{p.title}</h3>
                <p className="text-brand-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What they get */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-container px-6">
          <h2 className="mx-auto mb-3 max-w-2xl text-center text-2xl font-extrabold text-brand-dark md:text-3xl">
            {content.benefitsTitle}
          </h2>
          {content.benefitsSub ? (
            <p className="mx-auto mb-10 max-w-2xl text-center text-brand-muted">
              {content.benefitsSub}
            </p>
          ) : (
            <div className="mb-10" />
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {content.benefits.map((b) => (
              <div key={b.title} className="flex gap-4 rounded-card border border-black/5 p-6">
                <span className="text-brand-pink">
                  <Check />
                </span>
                <div>
                  <h3 className="mb-1 font-bold text-brand-dark">{b.title}</h3>
                  <p className="text-sm text-brand-muted">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-tint py-16 md:py-20">
        <div className="mx-auto max-w-container px-6">
          <h2 className="mb-10 text-center text-2xl font-extrabold text-brand-dark md:text-3xl">
            {content.stepsTitle}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {content.steps.map((s, i) => (
              <div key={s.title} className="rounded-card bg-white p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-indigo text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-1 font-bold text-brand-dark">{s.title}</h3>
                <p className="text-sm text-brand-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — answers the objections that otherwise become a bounce */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-brand-dark md:text-3xl">
            שאלות שנשאלות לפני שמתחילים
          </h2>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {content.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-brand-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-brand-dark py-16 text-center text-white md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-extrabold md:text-3xl">{content.closingTitle}</h2>
          <p className="mt-4 text-white/70">{content.closingText}</p>
          <a
            href="#lead-form"
            className="mt-8 inline-block rounded-pill bg-brand-pinkStrong px-9 py-3 font-medium text-white transition hover:bg-brand-pinkInk"
          >
            {content.closingCta}
          </a>
          <p className="mt-4 text-sm text-white/60">
            או חייגו{" "}
            <a href={`tel:${PHONE}`} className="font-medium text-white">
              {PHONE}
            </a>
          </p>
        </div>
      </section>

      <footer className="border-t border-black/5 py-6 text-center text-sm text-brand-muted">
        <p>
          © {new Date().getFullYear()} EZOrders ·{" "}
          <Link href="/he/privacy" className="underline">
            מדיניות פרטיות
          </Link>
        </p>
      </footer>

      {/* Mobile sticky CTA — the form is one tap away from anywhere on the page */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-3">
          <a
            href={`tel:${PHONE}`}
            className="flex-1 rounded-pill border border-brand-indigo px-4 py-3 text-center text-sm font-medium text-brand-indigo"
          >
            חייגו {PHONE}
          </a>
          <a
            href="#lead-form"
            className="flex-1 rounded-pill bg-brand-pinkStrong px-4 py-3 text-center text-sm font-medium text-white"
          >
            {content.navCta}
          </a>
        </div>
      </div>
    </div>
  );
}
