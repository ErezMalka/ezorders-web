import { ProcessStep } from "@/components/ProcessStep";
import { CTAButton } from "@/components/CTAButton";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function FriendlyProcess({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="bg-brand-tint py-20">
      <div className="mx-auto max-w-container px-6 text-center">
        <h2 className="text-4xl font-bold md:text-5xl">
          {t.processTitlePrefix}<span className="text-brand-indigo">{t.processTitleAccent}</span>{t.processTitleSuffix}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-brand-muted">{t.processLead}</p>

        <div className="mt-16 grid gap-12 text-left md:grid-cols-3">
          {t.process.map((step) => (
            <ProcessStep
              key={step.number}
              number={step.number}
              title={step.title}
              body={step.body}
            />
          ))}
        </div>

        <div className="mt-14">
          <CTAButton href={locale === "he" ? "/he/contact" : "/contact"}>{t.ctaTrial}</CTAButton>
        </div>
      </div>
    </section>
  );
}
