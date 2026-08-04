import type { Metadata } from "next";
import { ArticlePage } from "@/components/article/ArticlePage";
import { articleMetadata } from "@/lib/content/metadata";
import { getArticleSlugs } from "@/lib/content/articles";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getArticleSlugs("he").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("he", slug);
}

export default async function HeArticleRoute({ params }: Params) {
  const { slug } = await params;
  return <ArticlePage locale="he" slug={slug} />;
}
