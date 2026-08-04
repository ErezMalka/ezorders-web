import { buildRssFeed } from "@/lib/content/feed";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed("he"), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
