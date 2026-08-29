import { PageLayout } from "./PageLayout";
import { CTAButton } from "./CTAButton";
import { FeatureCard } from "./FeatureCard";
import { PricingTable } from "./sections/PricingTable";
import { FaqSection } from "./sections/FaqSection";
import { GENERAL_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";
import { ContactBand } from "./sections/ContactBand";
import { getHomeContent, type Locale } from "@/data/homeContent";
import { ModuleIcon, type IconName } from "@/components/Icons";

export type ProductContent = {
  tag: string;
  titleParts: [string, string, string]; // middle part rendered in indigo
  heroBody: string;
  heroImage?: string;
  featuresHeading: string;
  featuresIntro: string;
  features: { title: string; body: string; icon?: IconName }[];
  benefitsHeading: string;
  benefitsIntro: string;
  benefits: { title: string; body: string }[];
  faq: { q: string; a?: string }[];
};

export function ProductPageLayout({
  content,
  locale = "en",
  path,
}: {
  content: ProductContent;
  locale?: Locale;
  /** Locale-agnostic route, e.g. "/kiosk-stands". Omit to skip breadcrumbs. */
  path?: string;
}) {
  const home = getHomeContent(locale);
  const solutionsHref = locale === "he" ? "/he/solutions" : "/solutions";
  const contactHref = locale === "he" ? "/he/contact" : "/contact";
  const allServicesLabel = locale === "he" ? "כל השירותים" : "All Services";

  return (
    <PageLayout locale={locale}>
      {/* Home > Solutions > this page. The article system has emitted this
          since it was built; the marketing pages never did. */}
      {path && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              breadcrumbSchema(locale, { name: content.tag, path }),
            ),
          }}
        />
      )}
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
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <CTAButton href={contactHref}>{home.ctaTrial}</CTAButton>
              <CTAButton href={solutionsHref} variant="link">
                {allServicesLabel}
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
            <FeatureCard
              key={f.title}
              title={f.title}
              body={f.body}
              icon={f.icon ? <ModuleIcon name={f.icon} className="h-8 w-8" /> : undefined}
            />
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
      <PricingTable locale={locale} />

      {/* FAQ. Only questions that have an answer: the shipped list carried four
          keyword-shaped ones ("What is digital ordering?") with nothing behind
          them, which rendered accordions that opened onto blank space and made
          FAQPage schema impossible. The general questions fill the gap with
          answers a customer actually asked for. */}
      <FaqSection
        locale={locale}
        items={[
          ...content.faq.filter((f): f is { q: string; a: string } => Boolean(f.a)),
          ...GENERAL_FAQ[locale],
        ]}
      />

      {/* CONTACT */}
      <ContactBand locale={locale} />
    </PageLayout>
  );
}
