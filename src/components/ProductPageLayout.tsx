import { PageLayout } from "./PageLayout";
import { CTAButton } from "./CTAButton";
import { FeatureCard } from "./FeatureCard";
import { PricingTable } from "./sections/PricingTable";
import { FAQ } from "./sections/FAQ";
import { ContactBand } from "./sections/ContactBand";
import { SIGNUP_URL } from "@/data/content";

export type ProductContent = {
  tag: string;
  titleParts: [string, string, string]; // middle part rendered in indigo
  heroBody: string;
  heroImage?: string;
  featuresHeading: string;
  featuresIntro: string;
  features: { title: string; body: string }[];
  benefitsHeading: string;
  benefitsIntro: string;
  benefits: { title: string; body: string }[];
  faq: { q: string; a?: string }[];
};

export function ProductPageLayout({ content }: { content: ProductContent }) {
  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              {content.tag}
            </span>
            <h1 className="text-5xl font-bold leading-tight md:text-6xl">
              {content.titleParts[0]}
              <span className="text-brand-indigo">{content.titleParts[1]}</span>
              {content.titleParts[2]}
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-muted">
              {content.heroBody}
            </p>
            <div className="mt-8 flex items-center gap-8">
              <CTAButton href={SIGNUP_URL}>Try Free for 14 Days</CTAButton>
              <CTAButton href="/solutions" variant="link">
                All Services
              </CTAButton>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-[420px] w-full max-w-md items-center justify-center rounded-card bg-brand-indigo">
              {content.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={content.heroImage}
                  alt={content.tag}
                  className="max-h-[380px] w-auto"
                />
              ) : (
                <span className="text-white/40">Product image</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-container px-6 py-20">
        <h2 className="text-4xl font-bold md:text-5xl">{content.featuresHeading}</h2>
        <p className="mt-4 max-w-2xl text-brand-muted">{content.featuresIntro}</p>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {content.features.map((f) => (
            <FeatureCard key={f.title} title={f.title} body={f.body} />
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-brand-grey py-20">
        <div className="mx-auto max-w-container px-6">
          <h2 className="text-4xl font-bold md:text-5xl">
            {content.benefitsHeading}
          </h2>
          <p className="mt-4 max-w-2xl text-brand-muted">
            {content.benefitsIntro}
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {content.benefits.map((b) => (
              <div key={b.title} className="rounded-card bg-white p-8">
                <h3 className="mb-3 text-xl font-semibold">{b.title}</h3>
                <p className="text-brand-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <PricingTable />

      {/* FAQ */}
      <FAQ items={content.faq} />

      {/* CONTACT */}
      <ContactBand />
    </PageLayout>
  );
}