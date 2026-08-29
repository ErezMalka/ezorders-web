import { PageLayout } from "@/components/PageLayout";
import { ContactBand } from "@/components/sections/ContactBand";
import { getArticles } from "@/lib/content/articles";
import { localeDirection, type Locale } from "@/i18n/config";
import { getBlogStrings } from "./strings";
import { ArticleCard } from "./ArticleCard";

/**
 * Shared blog index, rendered by both /en/blog and /he/blog.
 *
 * Follows the existing shared-page-component pattern (PlatformPage, PosPage) so
 * the two locale routes stay thin and cannot drift apart.
 */
export function BlogIndex({ locale }: { locale: Locale }) {
  const articles = getArticles(locale);
  const t = getBlogStrings(locale);
  const dir = localeDirection[locale];

  return (
    <PageLayout locale={locale}>
      <section dir={dir} className="bg-brand-grey pb-16 pt-36 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pinkInk">
            {t.eyebrow}
          </span>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{t.indexTitle}</h1>
          <p className="mt-6 text-lg text-brand-muted">{t.indexIntro}</p>
        </div>
      </section>

      <section dir={dir} className="mx-auto max-w-container px-6 py-16">
        {articles.length === 0 ? (
          <p className="py-12 text-center text-brand-muted">{t.empty}</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </section>

      <ContactBand />
    </PageLayout>
  );
}
