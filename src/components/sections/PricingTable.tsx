"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { getPricingContent, type Locale } from "@/data/pricingContent";
import { CTAButton } from "@/components/CTAButton";

/**
 * `as` chooses the heading level for the section title.
 *
 * This component is both the whole of /en/price and one section among many
 * inside ProductPageLayout. On the pricing page it is the page's subject and
 * must be the h1 — without that, /en/price shipped with no h1 at all, which
 * costs it the strongest on-page ranking signal there is and leaves screen
 * reader users no landmark. Inside a product page the surrounding page already
 * owns the h1, so h2 stays the default and the outline remains correct.
 */
export function PricingTable({
  locale = "en",
  as: Heading = "h2",
}: {
  locale?: Locale;
  as?: "h1" | "h2";
}) {
  const t = getPricingContent(locale);
  const [yearly, setYearly] = useState(false);

  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="mb-10 text-center">
        <p className="mb-2 inline-block rounded-pill bg-brand-tint px-5 py-1 text-sm font-medium text-brand-pinkInk">
          {t.badge}
        </p>
        <Heading className="text-4xl font-bold md:text-5xl">
          <span className="text-brand-indigo">{t.titleAccent}</span>{t.titleRest}
        </Heading>
        <p className="mx-auto mt-3 max-w-xl text-brand-muted">
          {t.lead}
        </p>

        <div className="mt-6 inline-flex rounded-pill bg-brand-grey p-1">
          <button
            onClick={() => setYearly(false)}
            className={clsx(
              "rounded-pill px-6 py-2 text-sm font-medium",
              !yearly ? "bg-brand-pinkStrong text-white" : "text-brand-dark"
            )}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setYearly(true)}
            className={clsx(
              "rounded-pill px-6 py-2 text-sm font-medium",
              yearly ? "bg-brand-pinkStrong text-white" : "text-brand-dark"
            )}
          >
            {t.yearly}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {t.plans.map((plan) => (
          <div
            key={plan.name}
            className={clsx(
              "rounded-card p-8",
              plan.popular ? "bg-brand-indigo text-white" : "bg-brand-grey"
            )}
          >
            {plan.popular && (
              <span className="mb-3 inline-block rounded-pill bg-brand-pinkStrong px-4 py-1 text-xs font-semibold">
                {t.mostPopular}
              </span>
            )}
            <p className="text-3xl font-bold">
              $ {plan.price}
              <span
                className={clsx(
                  "text-base font-normal",
                  plan.popular ? "text-white/80" : "text-brand-muted"
                )}
              >
                {t.perMonth}
              </span>
            </p>
            <h3
              className={clsx(
                "mt-2 text-xl font-semibold",
                plan.popular ? "text-white" : "text-brand-indigo"
              )}
            >
              {plan.name}
            </h3>
            <ul
              className={clsx(
                "my-6 space-y-2 text-sm",
                plan.popular ? "text-white/90" : "text-brand-muted"
              )}
            >
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <CTAButton
              href={locale === "he" ? "/he/contact" : "/en/contact"}
              className={clsx(plan.popular && "bg-white !text-brand-indigo")}
            >
              {t.choosePlan}
            </CTAButton>
          </div>
        ))}
      </div>
    </section>
  );
}
