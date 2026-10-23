import type { MetadataRoute } from "next";

const BASE = "https://ezorders.com";

/**
 * Kept out of the AI crawlers' way: the sales-agent back office (behind a
 * login, and noindex on every page) and the API routes.
 */
const PRIVATE = ["/he/agent/", "/api/"];

/**
 * AI crawlers and answer engines, named explicitly.
 *
 * The "*" group already allows them, so this changes nothing for a crawler
 * that falls through to it. It is here because several operators document that
 * they look for their own token first, and because an explicit "Allow" is an
 * unambiguous statement that this site WANTS to be read, quoted and linked by
 * AI search - it sells to restaurant owners who increasingly ask an assistant
 * instead of a search box.
 *
 * - GPTBot / OAI-SearchBot / ChatGPT-User: OpenAI training, ChatGPT search,
 *   and fetches made on a user's behalf.
 * - PerplexityBot: Perplexity's index.
 * - ClaudeBot / Claude-SearchBot: Anthropic's crawler and search index.
 * - Google-Extended / Applebot-Extended: the opt-in tokens for Gemini and
 *   Apple Intelligence; they never fetch, they only read this file.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Unchanged. Not given the disallow list: the agent pages already carry
      // noindex, and a crawler blocked by robots.txt never gets to read it.
      { userAgent: "*", allow: "/" },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    // No `host`: it is a non-standard Yandex directive that Google ignores.
    sitemap: `${BASE}/sitemap.xml`,
  };
}
