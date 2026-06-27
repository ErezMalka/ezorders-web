import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact - ezorders",
  description:
    "Our experts can answer your questions. Contact EZOrders today and let’s start building your success together.",
};

export default function ContactPage() {
  return (
    <PageLayout>
      <section className="pb-20 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div>
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
                href="mailto:support@ezorders.com"
                className="font-normal text-brand-pink underline"
              >
                support@ezorders.com
              </a>
            </p>
            <p className="mt-2 font-semibold">
              Want to try EZOrders?{" "}
              <a
                href="https://admin.ezorders.com/#/create-account"
                className="font-normal text-brand-pink underline"
              >
                Start your 30 day free trial now.
              </a>
            </p>
          </div>
          <div className="rounded-card bg-brand-indigo p-8 md:p-12">
            <ContactForm />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}