import { FeatureCard } from "@/components/FeatureCard";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function Benefits({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="flex justify-center">
          <div className="flex h-[420px] w-full max-w-md items-center justify-center rounded-full bg-brand-grey">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/benefits-app.png"
              alt="App preview"
              className="max-h-[400px] w-auto"
            />
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            {t.benefitsTitlePrefix}<span className="text-brand-indigo">{t.benefitsTitleAccent}</span>{t.benefitsTitleSuffix}
          </h2>
          <p className="mt-4 text-brand-muted">{t.benefitsLead}</p>
          <div className="mt-10 space-y-8">
            {t.benefits.map((b) => (
              <FeatureCard key={b.title} title={b.title} body={b.body} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
