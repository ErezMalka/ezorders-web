import { buildArticleOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/content/og-image";

export const alt = "EZOrders article";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildArticleOgImage("he", slug);
}
