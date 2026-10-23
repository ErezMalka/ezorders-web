"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);
import { CTAButton } from "@/components/CTAButton";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function Hero({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  const words = t.heroWords;
  const [wordIndex, setWordIndex] = useState(0);
  // Start on the first word, fully typed, not on "". This component renders on
  // the server too, and the server HTML is what a crawler or an AI fetcher
  // reads: starting empty published "Your entrance to the | with a click" as
  // the page's H1. Fully typed, the effect below simply pauses on the word and
  // then begins deleting, so the animation is unchanged for visitors.
  const [text, setText] = useState(() => words[0] ?? "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex];
    let delay = deleting ? 60 : 110;
    if (!deleting && text === current) {
      delay = 1600;
    } else if (deleting && text === "") {
      delay = 400;
    }
    const timer = setTimeout(() => {
      if (!deleting && text === current) {
        setDeleting(true);
      } else if (deleting && text === "") {
        setDeleting(false);
        setWordIndex((i) => (i + 1) % words.length);
      } else {
        setText(
          deleting
            ? current.slice(0, text.length - 1)
            : current.slice(0, text.length + 1)
        );
      }
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, deleting, wordIndex]);

  return (
    <section className="relative overflow-hidden pb-16 pt-36">
      <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
        <div>
          {t.heroBadge ? (
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pinkInk">
              {t.heroBadge}
            </span>
          ) : null}
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            {t.heroTitlePrefix}
            <span className="text-brand-indigo">
              {text}
              {/* The caret is drawn, not typed: a literal "|" became part of the H1 text. */}
              <span
                aria-hidden="true"
                className="ms-0.5 inline-block h-[0.9em] w-[2px] animate-pulse bg-current align-[-0.1em]"
              />
            </span>
            {t.heroTitleSuffix}
          </h1>
          <p className="mt-6 max-w-md text-lg text-brand-muted">{t.heroLead}</p>
          <div className="mt-8 flex items-center gap-8">
            <CTAButton href={locale === "he" ? "/he/contact" : "/contact"}>{t.ctaTrial}</CTAButton>
            <CTAButton href={locale === "he" ? "/he/solutions" : "/solutions"} variant="link">
              {t.ctaLearnMore}
            </CTAButton>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex h-[420px] w-full max-w-lg items-center justify-center rounded-card bg-brand-indigo p-6">
            <Player
              autoplay
              loop
              src="/animations/hero.json"
              className="max-h-[380px] w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
