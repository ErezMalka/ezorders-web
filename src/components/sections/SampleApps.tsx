"use client";

import { useState } from "react";

const sampleApps = [
  { name: "App 1", image: "/images/sample-app-1.png" },
  { name: "App 2", image: "/images/sample-app-2.png" },
  { name: "App 3", image: "/images/sample-app-3.png" },
];

export function SampleApps() {
  const [index, setIndex] = useState(0);

  const prev = () =>
    setIndex((i) => (i === 0 ? sampleApps.length - 1 : i - 1));
  const next = () =>
    setIndex((i) => (i === sampleApps.length - 1 ? 0 : i + 1));

  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            Sample <span className="text-brand-indigo">Apps</span>
          </h2>
        </div>
        <p className="text-lg text-brand-muted">
          See real restaurant apps built with EZorders-fully branded,
          live-synced menus, powered by the same online restaurant ordering
          system you can launch.
        </p>
      </div>

      <div className="relative mt-12 flex items-center justify-center">
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink text-white transition hover:bg-brand-pinkDark"
        >
          ‹
        </button>

        <div className="flex h-[420px] w-full items-center justify-center rounded-card bg-brand-tint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sampleApps[index].image}
            alt={sampleApps[index].name}
            className="max-h-[380px] w-auto"
          />
        </div>

        <button
          onClick={next}
          aria-label="Next"
          className="absolute right-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink text-white transition hover:bg-brand-pinkDark"
        >
          ›
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {sampleApps.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full ${
              i === index ? "bg-brand-pink" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}