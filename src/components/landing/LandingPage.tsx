import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LandingLeadForm } from "@/components/landing/LandingLeadForm";
import { Reveal } from "@/components/landing/Reveal";
import { ModuleIcon } from "@/components/Icons";
import type { LandingContent } from "@/data/landingPages";

/**
 * Shell for the paid-traffic landing pages.
 *
 * Deliberately NOT PageLayout: a page bought with ad money keeps one exit — the
 * form — so the site nav and full footer are replaced by a logo, a phone number
 * and anchors back to the form.
 *
 * The structure was already right and is unchanged: form above the fold, pain
 * before benefit, objections answered before the close, sticky CTA on mobile.
 * What this rewrite adds is what was missing — the page carried no imagery at
 * all. Three thousand pixels selling registers, screens and kiosks without once
 * showing one, which is a strange thing to ask someone to buy on trust. Each
 * page now leads with a real capture of the system, matched to the ad group
 * that feeds it.
 */

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`h-5 w-5 shrink-0 fill-current ${className}`}>
      <path d="M8.1 14.6 4.3 10.8l1.4-1.4 2.4 2.4 6-6 1.4 1.4z" />
    </svg>
  );
}

const PHONE = "*4958";

/**
 * The platforms the system connects to.
 *
 * Real, verifiable, and the one thing a foreign vendor cannot match — which is
 * exactly what belongs in the strip under a hero. Named rather than shown as
 * logos: using their marks would need permission this page does not have.
 */
const PLATFORMS = ["וולט", "תן ביס", "סיבוס", "משלוחה", "וולט דרייב", "HAAT"];

/**
 * The three channels an order can arrive through, shown rather than listed.
 *
 * Every one of these pages argues that one system covers every channel, and
 * that argument is easier to see than to read. Resized to 760px square from
 * 1024px originals: at the size they render, the full-size files were 280KB of
 * pictures nobody sees above the fold, on traffic paid for by the click.
 */
const CHANNELS = [
  { src: "/images/lp/channel-kiosk.webp", title: "מהקיוסק", text: "הסועד מזמין ומשלם בעצמו, בלי תור בדלפק." },
  { src: "/images/lp/channel-qr.webp", title: "מהשולחן", text: "סריקת QR, תפריט בטלפון, הזמנה ותשלום במקום." },
  { src: "/images/lp/channel-web.webp", title: "מהאתר", text: "ערוץ ההזמנות שלכם — בלי עמלה לאף אחד." },
];

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
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-3">
          <Logo href="#top" />
          <div className="flex items-center gap-3">
            <a href={`tel:${PHONE}`} className="hidden text-sm font-semibold text-brand-indigo sm:block">
              {PHONE}
            </a>
            <a
              href="#lead-form"
              className="rounded-pill bg-brand-pinkStrong px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-pinkInk"
            >
              {content.navCta}
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────
          Layered rather than a flat block of indigo: a soft radial lifts the
          corner behind the headline so the form card has something to sit on
          instead of floating on a solid rectangle. */}
      <section className="relative isolate overflow-hidden bg-brand-indigo">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70rem 40rem at 85% -10%, rgba(240,93,134,.38), transparent 60%)," +
              "radial-gradient(50rem 30rem at 10% 110%, rgba(255,255,255,.16), transparent 60%)",
          }}
        />
        {/* On a phone the form comes second, straight after the headline.
            Measured with everything in one column: it sat 898px down, a full
            screen of scrolling before a visitor who already clicked an ad could
            act. On desktop the grid puts it back beside the copy, spanning both
            rows of the column next to it. */}
        <div className="mx-auto grid max-w-container items-start gap-10 px-6 pb-14 pt-12 md:grid-cols-[1.05fr_.95fr] md:pb-20 md:pt-16">
          <div className="text-white md:col-start-1 md:row-start-1">
            <span className="inline-block rounded-pill bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/20">
              {content.eyebrow}
            </span>
            <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.12] tracking-tight md:text-[2.9rem]">
              {content.h1}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/85">{content.sub}</p>
          </div>

          {/* Second in the DOM, so a phone reaches it right after the headline.
              On desktop it moves to the next column and spans both rows. */}
          <div className="md:col-start-2 md:row-start-1 md:row-span-2">
            <LandingLeadForm {...formProps} />
          </div>

          <div className="text-white md:col-start-1 md:row-start-2">
            {/* Bullets and the product side by side, not stacked. Stacked, the
                content column ran far taller than the form beside it and left a
                block of empty indigo the width of the page. */}
            <div className="flex items-start gap-8">
              <ul className="min-w-0 flex-1 space-y-3">
                {content.heroBullets.map((b) => (
                  <li key={b} className="flex gap-3 text-white/90">
                    <Check className="mt-1 text-brand-pink" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <figure className="hidden w-fit shrink-0 rounded-2xl bg-white/10 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur-sm lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.heroImage.src}
                  alt={content.heroImage.alt}
                  width={content.heroImage.width}
                  height={content.heroImage.height}
                  className="max-h-[19rem] w-auto rounded-xl"
                  decoding="async"
                />
              </figure>
            </div>

            <p className="mt-8 text-sm text-white/75">{content.heroFootnote}</p>
          </div>
        </div>

        {/* Integration strip — the differentiator, immediately under the fold line */}
        <div className="relative border-t border-white/10 bg-black/10">
          <div className="mx-auto flex max-w-container flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/75">מתחבר ל־</span>
            {PLATFORMS.map((p) => (
              <span key={p} className="text-sm font-semibold text-white/85">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Below lg the shot moves out of the hero and into its own band, so a
          narrow column never has to hold text and a portrait image side by
          side. */}
      <div className="bg-brand-indigo px-6 pb-10 lg:hidden">
        <figure className="mx-auto w-fit rounded-2xl bg-white/10 p-2 ring-1 ring-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.heroImage.src}
            alt={content.heroImage.alt}
            width={content.heroImage.width}
            height={content.heroImage.height}
            className="max-h-64 w-auto rounded-xl"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>

      {/* ── THE PROBLEM ──────────────────────────────────────────────── */}
      <section className="bg-brand-grey py-16 md:py-24">
        <div className="mx-auto max-w-container px-6">
          <Reveal>
            <h2 className="mx-auto mb-12 max-w-2xl text-center text-2xl font-extrabold leading-snug tracking-tight text-brand-dark md:text-[2rem]">
              {content.painTitle}
            </h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {content.pains.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <article className="h-full rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(20,19,43,.04),0_12px_32px_-24px_rgba(20,19,43,.4)]">
                  {/* Muted here on purpose: this is the section about what
                      hurts, so the icons should not look like features. */}
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-grey text-brand-muted">
                    <ModuleIcon name={p.icon} className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-brand-dark">{p.title}</h3>
                  <p className="leading-7 text-brand-muted">{p.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT THEY GET, beside a real screen ──────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-2xl font-extrabold leading-snug tracking-tight text-brand-dark md:text-[2rem]">
              {content.benefitsTitle}
            </h2>
            {content.benefitsSub ? (
              <p className="mx-auto mt-3 max-w-2xl text-center leading-7 text-brand-muted">{content.benefitsSub}</p>
            ) : null}
          </Reveal>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_.85fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {content.benefits.map((b, i) => (
                <Reveal key={b.title} delay={i * 60}>
                  <div className="flex h-full gap-4 rounded-2xl border border-black/5 bg-white p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(20,19,43,.04),0_16px_40px_-28px_rgba(59,51,200,.7)]">
                    {/* The benefits are the product, so these carry the brand
                        colour — the tint keeps them from shouting over the
                        headline. */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-indigo">
                      <ModuleIcon name={b.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1 font-bold text-brand-dark">{b.title}</h3>
                      <p className="text-sm leading-6 text-brand-muted">{b.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {content.proofImage ? (
              <Reveal delay={120}>
                <figure className="rounded-2xl border border-black/5 bg-brand-tint p-3 shadow-[0_1px_2px_rgba(20,19,43,.04),0_24px_60px_-40px_rgba(59,51,200,.6)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={content.proofImage.src}
                    alt={content.proofImage.alt}
                    width={content.proofImage.width}
                    height={content.proofImage.height}
                    className="mx-auto max-h-[26rem] w-auto rounded-xl"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="mt-3 text-center text-xs text-brand-muted">
                    צילום מסך מהמערכת עצמה
                  </figcaption>
                </figure>
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── THE CHANNELS, SHOWN ──────────────────────────────────────────
          Every one of these pages argues that one system covers every channel.
          Three pictures make that case faster than three more paragraphs. */}
      <section className="bg-brand-dark py-16 md:py-20">
        <div className="mx-auto max-w-container px-6">
          <Reveal>
            <h2 className="mb-3 text-center text-2xl font-extrabold tracking-tight text-white md:text-[2rem]">
              הזמנה אחת, שלוש דרכים להגיע
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-center leading-7 text-white/75">
              מכל אחד מהערוצים ההזמנה נוחתת באותה קופה, על אותו מסך מטבח, ובאותו דוח בסוף היום.
            </p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-3">
            {CHANNELS.map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <figure className="h-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.src}
                    alt=""
                    width={760}
                    height={760}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="p-5">
                    <h3 className="mb-1 font-bold text-white">{c.title}</h3>
                    <p className="text-sm leading-6 text-white/75">{c.text}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────
          A connected sequence rather than three loose cards. The steps happen
          in order, so the rail between them says so. */}
      <section className="bg-brand-tint py-16 md:py-24">
        <div className="mx-auto max-w-container px-6">
          <Reveal>
            <h2 className="mb-12 text-center text-2xl font-extrabold tracking-tight text-brand-dark md:text-[2rem]">
              {content.stepsTitle}
            </h2>
          </Reveal>
          <ol className="relative grid gap-5 md:grid-cols-3">
            <div
              aria-hidden
              className="absolute inset-x-8 top-9 hidden border-t-2 border-dashed border-brand-indigo/25 md:block"
            />
            {content.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <li className="relative h-full rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,19,43,.04),0_12px_32px_-24px_rgba(20,19,43,.4)]">
                  {/* The number stays on the rail; the icon sits beside it and
                      says what the step is about. */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-sm font-bold text-white ring-4 ring-brand-tint">
                      {i + 1}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-indigo">
                      <ModuleIcon name={s.icon} className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mb-1 font-bold text-brand-dark">{s.title}</h3>
                  <p className="text-sm leading-6 text-brand-muted">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ — the objections that otherwise become a bounce ───────── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 className="mb-10 text-center text-2xl font-extrabold tracking-tight text-brand-dark md:text-[2rem]">
              שאלות שנשאלות לפני שמתחילים
            </h2>
          </Reveal>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {content.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-brand-indigo transition-transform duration-200 group-open:rotate-45"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 leading-7 text-brand-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSE ────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-brand-dark py-16 text-center text-white md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(45rem 24rem at 50% 0%, rgba(59,51,200,.55), transparent 65%)" }}
        />
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-[2rem]">{content.closingTitle}</h2>
          <p className="mt-4 leading-7 text-white/75">{content.closingText}</p>
          <a
            href="#lead-form"
            className="mt-8 inline-block rounded-pill bg-brand-pinkStrong px-9 py-3.5 font-semibold text-white shadow-lg transition hover:bg-brand-pinkInk"
          >
            {content.closingCta}
          </a>
          <p className="mt-4 text-sm text-white/60">
            או חייגו{" "}
            <a href={`tel:${PHONE}`} className="font-semibold text-white underline-offset-4 hover:underline">
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

      {/* Mobile sticky CTA — the form is one tap away from anywhere */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-3">
          <a
            href={`tel:${PHONE}`}
            className="flex-1 rounded-pill border border-brand-indigo px-4 py-3 text-center text-sm font-semibold text-brand-indigo"
          >
            חייגו {PHONE}
          </a>
          <a
            href="#lead-form"
            className="flex-1 rounded-pill bg-brand-pinkStrong px-4 py-3 text-center text-sm font-semibold text-white"
          >
            {content.navCta}
          </a>
        </div>
      </div>
    </div>
  );
}
