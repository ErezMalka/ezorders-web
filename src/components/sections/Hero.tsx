"use client";

import { Player } from "@lottiefiles/react-lottie-player";
import { CTAButton } from "@/components/CTAButton";
import { SIGNUP_URL } from "@/data/content";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-36">
      <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <span className="mb-6 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
            More than Faster
          </span>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Your entrance to the <span className="text-brand-indigo">awesome</span>{" "}
            with a click
          </h1>
          <p className="mt-6 max-w-md text-lg text-brand-muted">
            It’s the time to dive in the newest technology that will let you
            enjoy the digital world and it’s benefits.
          </p>
          <div className="mt-8 flex items-center gap-8">
            <CTAButton href={SIGNUP_URL}>Try Free for 14 Days</CTAButton>
            <CTAButton href="/solutions" variant="link">
              Learn More
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