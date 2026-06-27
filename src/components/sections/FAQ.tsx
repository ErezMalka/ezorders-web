"use client";

import { useState } from "react";

type Item = { q: string; a?: string };

export function FAQ({ items }: { items: Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="mb-10 text-center text-4xl font-bold">FAQ</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.q} className="rounded-card border border-gray-200 p-5">
            <button
              className="flex w-full items-center justify-between text-left font-semibold"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {item.q}
              <span>{openIndex === i ? "−" : "+"}</span>
            </button>
            {openIndex === i && item.a && (
              <p className="mt-3 text-brand-muted">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}