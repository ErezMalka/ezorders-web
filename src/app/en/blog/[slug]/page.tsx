import type { Metadata } from "next";
import { ArticlePage } from "@/components/article/ArticlePage";
import { articleMetadata } from "@/lib/content/metadata";
import { getArticleSlugs } from "@/lib/content/articles";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getArticleSlugs("en").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("en", slug);
}

export default async function EnArticleRoute({ params }: Params) {
  const { slug } = await params;
  return <ArticlePage locale="en" slug={slug} />;
}
