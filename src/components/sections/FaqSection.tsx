import type { FaqItem } from "@/data/faq";

/**
 * An FAQ block that emits FAQPage structured data alongside it.
 *
 * Two things the existing <FAQ /> could not do:
 *
 * 1. Every answer is in the HTML at all times. The old component rendered only
 *    the open item, so a crawler saw one answer out of five and the rest existed
 *    solely after a click. <details> keeps them all in the markup while still
 *    collapsing visually, and needs no JavaScript, so this stays a server
 *    component.
 *
 * 2. FAQPage JSON-LD. Schema.org requires an acceptedAnswer per question, which
 *    is why it could never have been added before: four of the five English
 *    questions had no answer to point at.
 *
 * Answered questions are the single strongest thing a page can carry for AI
 * search — a generative engine quotes an answer that stands on its own far more
 * readily than it paraphrases a marketing paragraph.
 */
export function FaqSection({
  items,
  locale = "he",
  heading,
}: {
  items: FaqItem[];
  locale?: "he" | "en";
  heading?: string;
}) {
  if (items.length === 0) return null;

  const he = locale === "he";
  const title = heading ?? (he ? "שאלות נפוצות" : "Frequently asked questions");

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section dir={he ? "rtl" : "ltr"} className="mx-auto max-w-3xl px-6 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2 className="mb-10 text-center text-3xl font-bold md:text-4xl">{title}</h2>

      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={item.q}
            // The first one open, the rest closed: a visitor sees immediately
            // that these are real answers rather than empty accordions.
            open={i === 0}
            className="group rounded-card border border-black/10 bg-white p-5 open:shadow-sm"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden="true"
                className="shrink-0 text-xl text-brand-pink transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-brand-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
