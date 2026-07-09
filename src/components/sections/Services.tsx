import { ServiceCard } from "@/components/ServiceCard";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function Services({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <h2 className="text-4xl font-bold md:text-5xl">
        {t.servicesTitlePrefix}<span className="text-brand-indigo">{t.servicesTitleAccent}</span>{t.servicesTitleSuffix}
      </h2>
      <p className="mt-4 max-w-2xl text-brand-muted">{t.servicesLead}</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {t.services.map((s) => (
          <ServiceCard
            key={s.title}
            cta={t.ctaLearnMore}
            title={s.title}
            body={s.body}
            href={s.href}
            icon={
              s.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.icon} alt="" width={60} height={60} aria-hidden="true" />
              ) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
