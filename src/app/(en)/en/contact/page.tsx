import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/contact",
      he: "/he/contact",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he/contact",
    },
  },
  title: "Contact - ezorders",
  description:
    "Our experts can answer your questions. Contact EZOrders today and let’s start building your success together.",
};

export default function ContactPage() {
  return (
    <PageLayout>
      <section className="pb-20 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          {/* "contact@ezorders.com" is one unbreakable token, and a grid item's
              default min-width:auto sizes the column to it — 283px inside a
              257px column at 320px. `anywhere` lets it break, which also
              lowers the column's min-content width. */}
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pink">
              Contact
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Our experts can answer the questions
            </h1>
            <p className="mt-6 text-lg text-brand-muted">
              Ready to take your restaurant to the next level? Our experts are
              here to answer your questions and show you how EZorders can help
              grow your business. Contact us today and let’s start building your
              success together!
            </p>
            <p className="mt-6 font-semibold">
              Already a customer?{" "}
              <a
                href="mailto:contact@ezorders.com"
                className="font-normal text-brand-pink underline"
              >
                contact@ezorders.com
              </a>
            </p>
            <p className="mt-2 font-semibold">
              Want to see EZOrders in action? Fill out the form and we\u2019ll
              get back to you shortly to schedule a live demo.
            </p>
          </div>
          <div className="min-w-0 rounded-card bg-brand-indigo p-5 sm:p-8 md:p-12">
            <ContactForm />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
