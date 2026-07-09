import { getPricingContent, type Locale } from "@/data/pricingContent";

export function StatsStrip({ locale = "en" }: { locale?: Locale }) {
  const t = getPricingContent(locale);
  return (
    <section className="bg-brand-grey py-16">
      <div className="mx-auto max-w-container px-6">
        <h2 className="mb-10 text-center text-3xl font-bold">{t.statsTitle}</h2>
        <div className="grid gap-8 text-center md:grid-cols-4">
          {t.stats.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold text-brand-indigo">
                {s.value}
                {s.suffix}
              </p>
              <p className="mt-2 text-brand-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
