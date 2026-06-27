"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { pricingPlans, SIGNUP_URL } from "@/data/content";
import { CTAButton } from "@/components/CTAButton";

export function PricingTable() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="mb-10 text-center">
        <p className="mb-2 inline-block rounded-pill bg-brand-tint px-5 py-1 text-sm font-medium text-brand-pink">
          Pricing
        </p>
        <h2 className="text-4xl font-bold md:text-5xl">
          <span className="text-brand-indigo">Plans</span> & Pricing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-muted">
          Whether your time-saving automation needs are large or small, we’re
          here to help you scale.
        </p>

        <div className="mt-6 inline-flex rounded-pill bg-brand-grey p-1">
          <button
            onClick={() => setYearly(false)}
            className={clsx(
              "rounded-pill px-6 py-2 text-sm font-medium",
              !yearly ? "bg-brand-pink text-white" : "text-brand-dark"
            )}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setYearly(true)}
            className={clsx(
              "rounded-pill px-6 py-2 text-sm font-medium",
              yearly ? "bg-brand-pink text-white" : "text-brand-dark"
            )}
          >
            YEARLY
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {pricingPlans.map((plan) => (
          <div
            key={plan.name}
            className={clsx(
              "rounded-card p-8",
              plan.popular ? "bg-brand-indigo text-white" : "bg-brand-grey"
            )}
          >
            {plan.popular && (
              <span className="mb-3 inline-block rounded-pill bg-brand-pink px-4 py-1 text-xs font-semibold">
                MOST POPULAR
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
                /month
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
              href={SIGNUP_URL}
              className={clsx(plan.popular && "bg-white !text-brand-indigo")}
            >
              Choose plan
            </CTAButton>
          </div>
        ))}
      </div>
    </section>
  );
}