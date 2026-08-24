import Link from "next/link";
import type { Article } from "@/lib/content/schema";
import { getBlogStrings } from "./strings";
import { localeDirection } from "@/i18n/config";

/**
 * One article in the listing grid.
 *
 * The cover renders a neutral placeholder when `featuredImage` is missing or the
 * file has not landed yet, so a published article never breaks the layout while
 * its image is still being generated.
 */
export function ArticleCard({ article }: { article: Article }) {
  const t = getBlogStrings(article.locale);
  const dir = localeDirection[article.locale];
  const href = `/${article.locale}/blog/${article.slug}`;

  return (
    <article
      dir={dir}
      className="group flex flex-col overflow-hidden rounded-card border border-black/5 bg-white shadow-sm transition hover:shadow-md"
    >
      <Link href={href} className="block" aria-label={article.title}>
        <div className="relative aspect-video w-full overflow-hidden bg-brand-tint">
          {article.featuredImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={article.featuredImage}
              alt={article.imageAlt}
              width={1600}
              height={900}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-brand-muted">
              {t.imagePending}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
          <span className="rounded-pill bg-brand-tint px-3 py-1 font-medium text-brand-pink">
            {article.category}
          </span>
          {article.draft && (
            <span className="rounded-pill bg-brand-dark px-3 py-1 font-medium text-white">
              {t.draftBadge}
            </span>
          )}
          <time dateTime={article.publishedAt}>{article.publishedAt}</time>
          <span aria-hidden="true">·</span>
          <span>{t.readingTime(article.readingTimeMinutes)}</span>
        </div>

        <h2 className="mb-3 text-xl font-bold leading-snug">
          <Link href={href} className="transition hover:text-brand-pink">
            {article.title}
          </Link>
        </h2>

        <p className="mb-6 flex-1 text-sm leading-relaxed text-brand-muted">{article.excerpt}</p>

        <Link
          href={href}
          className="mt-auto inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-brand-indigo transition hover:text-brand-pink"
        >
          {t.readMore}
          <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
        </Link>
      </div>
    </article>
  );
}
