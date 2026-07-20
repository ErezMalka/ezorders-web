import { ModuleIcon } from "@/components/Icons";
import { CTAButton } from "@/components/CTAButton";
import { getPlatformContent, type Locale } from "@/data/platformContent";

export function Capabilities({
  locale = "en",
  variant = "platform",
}: {
  locale?: Locale;
  variant?: "home" | "platform";
}) {
  const t = getPlatformContent(locale);
  const isHome = variant === "home";

  const titlePrefix = isHome ? t.homeCapTitlePrefix : t.capTitlePrefix;
  const titleAccent = isHome ? t.homeCapTitleAccent : t.capTitleAccent;
  const titleSuffix = isHome ? t.homeCapTitleSuffix : t.capTitleSuffix;
  const lead = isHome ? t.homeCapLead : t.capLead;
  const platformHref = locale === "he" ? "/he/platform" : "/platform";

  return (
    <section className={isHome ? "bg-brand-grey py-20" : "mx-auto max-w-container px-6 py-20"}>
      <div className={isHome ? "mx-auto max-w-container px-6" : ""}>
        <h2 className="max-w-3xl text-4xl font-bold md:text-5xl">
          {titlePrefix}
          <span className="text-brand-indigo">{titleAccent}</span>
          {titleSuffix}
        </h2>
        <p className="mt-4 max-w-2xl text-brand-muted">{lead}</p>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {t.capabilities.map((c) => (
            <div
              key={c.name}
              className="group rounded-card bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand-indigo transition group-hover:bg-brand-indigo group-hover:text-white">
                <ModuleIcon name={c.icon} className="h-8 w-8" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold">{c.name}</h3>
              <p className="text-sm leading-relaxed text-brand-muted">{c.body}</p>
            </div>
          ))}
        </div>

        {isHome && (
          <div className="mt-12">
            <CTAButton href={platformHref}>{t.homeCapCta}</CTAButton>
          </div>
        )}
      </div>
    </section>
  );
}
