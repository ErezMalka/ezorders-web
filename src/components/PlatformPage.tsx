import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { Capabilities } from "@/components/sections/Capabilities";
import { ContactBand } from "@/components/sections/ContactBand";
import { ModuleIcon } from "@/components/Icons";
import { SIGNUP_URL } from "@/data/content";
import {
  getPlatformContent,
  type Locale,
  type PlatformFeature,
} from "@/data/platformContent";

function FeatureList({ features }: { features: PlatformFeature[] }) {
  return (
    <ul className="mt-8 space-y-6">
      {features.map((f) => (
        <li key={f.title} className="flex gap-4">
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-pink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L19 7" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-brand-muted">{f.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A product-style dashboard card with a pink top border, like the EZOrders admin. */
function DashboardMock({
  label,
  title,
  stats,
}: {
  label: string;
  title: string;
  stats: { value: string; label: string; delta?: string }[];
}) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-xl ring-1 ring-black/5">
      <div className="h-1.5 w-full bg-brand-pink" />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-brand-indigo">EZ<span className="text-brand-pink">Orders</span></span>
          <span className="rounded-pill bg-brand-tint px-3 py-1 text-xs font-medium text-brand-pink">
            {label}
          </span>
        </div>
        <p className="mt-5 text-sm font-medium text-brand-muted">{title}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-brand-grey p-4">
              <p className="text-2xl font-bold text-brand-dark">{s.value}</p>
              <p className="mt-1 text-xs text-brand-muted">{s.label}</p>
              {s.delta && (
                <span className="mt-2 inline-block rounded-pill bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-pink">
                  {s.delta}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end gap-1.5">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t bg-brand-indigo/80"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A reports card: trend line + sales-by-channel breakdown, product-styled. */
function ReportsMock({
  label,
  title,
  rows,
}: {
  label: string;
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-xl ring-1 ring-black/5">
      <div className="h-1.5 w-full bg-brand-pink" />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-brand-indigo">EZ<span className="text-brand-pink">Orders</span></span>
          <span className="rounded-pill bg-brand-tint px-3 py-1 text-xs font-medium text-brand-pink">
            {label}
          </span>
        </div>
        <p className="mt-5 text-sm font-medium text-brand-muted">{title}</p>
        <svg viewBox="0 0 320 90" className="mt-3 w-full" role="img" aria-hidden="true">
          <polyline
            points="0,70 45,55 90,60 135,35 180,42 225,20 270,28 320,10"
            fill="none"
            stroke="#3B33C8"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="0,70 45,55 90,60 135,35 180,42 225,20 270,28 320,10 320,90 0,90"
            fill="#3B33C8"
            opacity={0.08}
          />
        </svg>
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-brand-muted">{r.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-grey">
                <span
                  className="block h-full rounded-full bg-brand-pink"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-end text-xs font-semibold text-brand-dark">{r.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleChips({ items }: { items: { name: string; icon: Parameters<typeof ModuleIcon>[0]["name"] }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((m) => (
        <div
          key={m.name}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand-indigo">
            <ModuleIcon name={m.icon} className="h-7 w-7" />
          </span>
          <span className="text-sm font-medium">{m.name}</span>
        </div>
      ))}
    </div>
  );
}

export function PlatformPage({ locale = "en" }: { locale?: Locale }) {
  const t = getPlatformContent(locale);
  const contactHref = locale === "he" ? "/he/contact" : "/contact";

  return (
    <PageLayout locale={locale}>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              {t.heroTag}
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              {t.heroTitlePrefix}
              <span className="text-brand-indigo">{t.heroTitleAccent}</span>
              {t.heroTitleSuffix}
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-muted">{t.heroLead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <CTAButton href={SIGNUP_URL}>{t.ctaPrimary}</CTAButton>
              <CTAButton href={contactHref} variant="link">
                {t.ctaSecondary}
              </CTAButton>
            </div>
          </div>
          <div className="flex justify-center">
            <DashboardMock label={t.dashboardLabel} title={t.dashboardTitle} stats={t.stats} />
          </div>
        </div>
      </section>

      {/* CAPABILITIES GRID */}
      <Capabilities locale={locale} variant="platform" />

      {/* POS */}
      <section className="bg-brand-grey py-20">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <ModuleChips items={t.posModules} />
          </div>
          <div className="order-1 md:order-2">
            <span className="mb-4 inline-block rounded-pill bg-white px-5 py-2 text-sm font-medium text-brand-pink">
              {t.posTag}
            </span>
            <h2 className="text-3xl font-bold md:text-4xl">{t.posTitle}</h2>
            <p className="mt-4 text-brand-muted">{t.posLead}</p>
            <FeatureList features={t.posFeatures} />
          </div>
        </div>
      </section>

      {/* MULTI-BRANCH */}
      <section className="mx-auto max-w-container px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              {t.branchesTag}
            </span>
            <h2 className="text-3xl font-bold md:text-4xl">{t.branchesTitle}</h2>
            <p className="mt-4 text-brand-muted">{t.branchesLead}</p>
            <FeatureList features={t.branchesFeatures} />
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-md space-y-3">
              {t.branchLevels.map((level, i) => (
                <div
                  key={level.name}
                  className="flex items-center gap-4 rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5"
                  style={{ marginInlineStart: `${i * 28}px` }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-indigo text-white">
                    <ModuleIcon name={level.icon} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-semibold">{level.name}</p>
                    <p className="text-sm text-brand-muted">{level.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="bg-brand-grey py-20">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div className="order-2 md:order-1 flex justify-center">
            <ReportsMock label={t.analyticsTag} title={t.reportsMock.title} rows={t.reportsMock.rows} />
          </div>
          <div className="order-1 md:order-2">
            <span className="mb-4 inline-block rounded-pill bg-white px-5 py-2 text-sm font-medium text-brand-pink">
              {t.analyticsTag}
            </span>
            <h2 className="text-3xl font-bold md:text-4xl">{t.analyticsTitle}</h2>
            <p className="mt-4 text-brand-muted">{t.analyticsLead}</p>
            <FeatureList features={t.analyticsFeatures} />
          </div>
        </div>
      </section>

      {/* LOYALTY */}
      <section className="mx-auto max-w-container px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              {t.loyaltyTag}
            </span>
            <h2 className="text-3xl font-bold md:text-4xl">{t.loyaltyTitle}</h2>
            <p className="mt-4 text-brand-muted">{t.loyaltyLead}</p>
            <FeatureList features={t.loyaltyFeatures} />
          </div>
          <div className="flex justify-center">
            <div className="grid w-full max-w-md grid-cols-2 gap-4">
              {t.loyaltyCards.map((card) => (
                <div
                  key={card.name}
                  className="flex flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-sm ring-1 ring-black/5"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand-indigo">
                    <ModuleIcon name={card.icon} className="h-8 w-8" />
                  </span>
                  <span className="text-sm font-medium">{card.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ContactBand locale={locale} />
    </PageLayout>
  );
}
