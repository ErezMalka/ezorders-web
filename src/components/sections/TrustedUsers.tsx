import { getHomeContent, type Locale } from "@/data/homeContent";

export function TrustedUsers({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="mx-auto max-w-container px-6 py-12">
      <p className="mb-2 text-sm font-medium text-brand-pink">{t.trustedLabel}</p>
      <p className="text-yellow-400">★★★★★</p>
      <p className="mt-1 text-sm text-brand-muted">{t.trustedRated}</p>
      <p className="mt-3 text-2xl font-semibold">
        {t.trustedOver}
        <span className="text-brand-pink">13.5K</span>
        {t.trustedUsers}
      </p>
    </section>
  );
}
