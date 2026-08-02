import Link from "next/link";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { ContactBand } from "@/components/sections/ContactBand";
import { getArticle, getTranslation, isTranslationStale } from "@/lib/content/articles";
import { renderMarkdown } from "@/lib/content/markdown";
import { articleJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/content/jsonld";
import { localeDirection, type Locale } from "@/i18n/config";
import { getBlogStrings } from "./strings";

/**
 * Shared article page, rendered by both /en/blog/[slug] and /he/blog/[slug].
 *
 * Markdown is rendered to sanitized HTML at build time (see lib/content/markdown.ts:
  * raw HTML is rejected in the source, escaped by the renderer, and stripped by an
 * allowlist sanitizer) and injected once here.
 */
export function ArticlePage({ locale, slug }: { locale: Locale; slug: string }) {
  const article = getArticle(locale, slug);
  if (!article) notFound();

  const t = getBlogStrings(locale);
  const dir = localeDirection[locale];
  const html = renderMarkdown(article.body);

  // The same article in the other locale, when it is actually published.
  const otherLocale: Locale = locale === "he" ? "en" : "he";
  const translation = getTranslation(article, otherLocale);
  const stale = isTranslationStale(article) === true;

  return (
    <PageLayout locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd(article)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(article, t.blog)) }}
      />

      <article dir={dir}>
        {/* HEADER */}
        <header className="bg-brand-grey pb-12 pt-36">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="text-sm text-brand-muted">
                <Link href={`/${locale}/blog`} className="transition hover:text-brand-pink">
                  {t.blog}
                </Link>
              </nav>
              {translation && (
                <Link
                  href={`/${otherLocale}/blog/${translation.slug}`}
                  hrefLang={otherLocale}
                  lang={otherLocale}
                  dir={localeDirection[otherLocale]}
                  className="rounded-pill border border-black/10 px-4 py-1.5 text-sm font-medium text-brand-indigo transition hover:border-brand-pink hover:text-brand-pink"
                >
                  {t.readInOther}
                </Link>
              )}
            </div>

            {stale && (
              <p className="mb-5 rounded-card bg-brand-tint px-4 py-3 text-sm text-brand-muted">
                {t.translationStale}
              </p>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
              <span className="rounded-pill bg-brand-tint px-3 py-1 font-medium text-brand-pink">
                {article.category}
              </span>
              {article.draft && (
                <span className="rounded-pill bg-brand-dark px-3 py-1 font-medium text-white">
                  {t.draftBadge}
                </span>
              )}
              <span>
                {t.published} <time dateTime={article.publishedAt}>{article.publishedAt}</time>
              </span>
              {article.updatedAt !== article.publishedAt && (
                <span>
                  · {t.updated} <time dateTime={article.updatedAt}>{article.updatedAt}</time>
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span>{t.readingTime(article.readingTimeMinutes)}</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{article.title}</h1>
            <p className="mt-6 text-lg text-brand-muted">{article.excerpt}</p>
          </div>
        </header>

        {/* COVER */}
        <div className="mx-auto max-w-4xl px-6">
          <div className="-mt-6 overflow-hidden rounded-card bg-brand-tint shadow-sm">
            <div className="relative aspect-video w-full">
              {article.featuredImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={article.featuredImage}
                  alt={article.imageAlt}
                  width={1600}
                  height={900}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-brand-muted">
                  {t.imagePending}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="mx-auto max-w-3xl px-6 py-14">
          <div
            className="article-body"
            /* Sanitized at build time; see lib/content/markdown.ts */
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* CTA */}
          <div className="mt-14 rounded-card bg-brand-grey p-8 text-center">
            <CTAButton href={article.cta.href}>{article.cta.label}</CTAButton>
          </div>

          {/* SOURCES */}
          {article.sources.length > 0 && (
            <section className="mt-14 border-t border-black/10 pt-8">
              <h2 className="mb-2 text-xl font-bold">{t.sources}</h2>
              <p className="mb-4 text-sm text-brand-muted">{t.sourcesNote}</p>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                {article.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-brand-indigo underline-offset-2 transition hover:text-brand-pink hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-12">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-indigo transition hover:text-brand-pink"
            >
              <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span>
              {t.backToBlog}
            </Link>
          </div>
        </div>
      </article>

      <ContactBand />
    </PageLayout>
  );
}
