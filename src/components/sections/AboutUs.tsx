import { CTAButton } from "@/components/CTAButton";
import { SIGNUP_URL } from "@/data/content";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function AboutUs({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="bg-brand-grey py-20">
      <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            {t.aboutTitlePrefix}<span className="text-brand-indigo">{t.aboutTitleAccent}</span>{t.aboutTitleSuffix}
          </h2>
          <div className="mt-6 space-y-4 text-brand-muted">
            {t.aboutParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <CTAButton href={SIGNUP_URL} className="mt-8">
            {t.ctaTrial}
          </CTAButton>
        </div>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/about-chef.svg"
            alt="Chef"
            className="max-h-[460px] w-auto"
          />
        </div>
      </div>
    </section>
  );
}
