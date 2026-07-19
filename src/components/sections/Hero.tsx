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
  const [text, setText] = useState("");
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
          <span className="mb-6 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
            {t.heroBadge}
          </span>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            {t.heroTitlePrefix}
            <span className="text-brand-indigo">
              {text}
              <span className="animate-pulse">|</span>
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
