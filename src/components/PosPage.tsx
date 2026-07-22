import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { ContactBand } from "@/components/sections/ContactBand";
import { ModuleIcon } from "@/components/Icons";
import { SIGNUP_URL } from "@/data/content";
import { getHomeContent, type Locale } from "@/data/homeContent";
import { getPosContent, type PosChip } from "@/data/posContent";

/** A POS-terminal styled card showing the register's module buttons. */
function PosTerminal({ label, modules }: { label: string; modules: PosChip[] }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-xl ring-1 ring-black/5">
      <div className="h-1.5 w-full bg-brand-pink" />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-brand-indigo">
            EZ<span className="text-brand-pink">Orders</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-pill bg-brand-tint px-3 py-1 text-xs font-medium text-brand-pink">
            <span className="h-2 w-2 rounded-full bg-brand-pink" />
            {label}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {modules.map((m) => (
            <div
              key={m.name}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-brand-grey p-3 text-center"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-indigo">
                <ModuleIcon name={m.icon} className="h-5 w-5" />
              </span>
              <span className="text-[10px] leading-tight text-brand-muted">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PosPage({ locale = "en" }: { locale?: Locale }) {
  const t = getPosContent(locale);
  const home = getHomeContent(locale);
  const solutionsHref = locale === "he" ? "/he/solutions" : "/solutions";
  const allServicesLabel = locale === "he" ? "כל השירותים" : "All Services";

  return (
    <PageLayout locale={locale}>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              {t.heroTag}
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              {t.heroTitleParts[0]}
              <span className="text-brand-indigo">{t.heroTitleParts[1]}</span>
              {t.heroTitleParts[2]}
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-muted">{t.heroLead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <CTAButton href={SIGNUP_URL}>{home.ctaTrial}</CTAButton>
              <CTAButton href={solutionsHref} variant="link">
                {allServicesLabel}
              </CTAButton>
            </div>
          </div>
          <div className="flex justify-center">
            <PosTerminal label={t.sessionLabel} modules={t.modules} />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-container px-6 py-20">
        <h2 className="text-4xl font-bold md:text-5xl">{t.featuresTitle}</h2>
        <p className="mt-4 max-w-2xl text-brand-muted">{t.featuresLead}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f) => (
            <div key={f.title} className="rounded-card bg-brand-grey p-6">
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-brand-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-brand-grey py-20">
        <div className="mx-auto max-w-container px-6">
          <h2 className="text-4xl font-bold md:text-5xl">{t.benefitsTitle}</h2>
          <p className="mt-4 max-w-2xl text-brand-muted">{t.benefitsLead}</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {t.benefits.map((b) => (
              <div key={b.title} className="rounded-card bg-white p-8">
                <h3 className="mb-3 text-xl font-semibold">{b.title}</h3>
                <p className="text-brand-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — refer to the up-to-date pricing calculator */}
      <section className="mx-auto max-w-container px-6 py-20 text-center">
        <p className="mb-3 inline-block rounded-pill bg-brand-tint px-5 py-1 text-sm font-medium text-brand-pink">
          {locale === "he" ? "מחירון" : "Pricing"}
        </p>
        <h2 className="text-3xl font-bold md:text-4xl">
          {locale === "he" ? "כמה זה עולה?" : "How much does it cost?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-brand-muted">
          {locale === "he"
            ? "המחירון המלא והמעודכן, כולל מחשבון אינטראקטיבי לבניית החבילה שלכם, נמצא בעמוד המחירים."
            : "Our full, up-to-date pricing — including an interactive package builder — lives on the pricing page."}
        </p>
        <div className="mt-8">
          <CTAButton href={locale === "he" ? "/he/price" : "/en/price"}>
            {locale === "he" ? "למחירון המלא" : "See full pricing"}
          </CTAButton>
        </div>
      </section>
      <ContactBand locale={locale} />
    </PageLayout>
  );
}
