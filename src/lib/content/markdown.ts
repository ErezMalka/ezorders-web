/**
 * Markdown -> sanitized HTML, for article bodies only.
 *
 * Defence in depth, because this HTML is injected with dangerouslySetInnerHTML:
 *
 *   1. schema.ts REJECTS raw HTML in the source Markdown at build time.
 *      Refusing is safer than cleaning, and article Markdown is
 *      machine-generated, so there is no legitimate reason for it to contain
 *      HTML.
 *   2. marked is configured to escape rather than pass through any HTML that
 *      slipped past step 1.
 *   3. sanitize-html applies a strict allowlist to the final output.
 *
 * Any one of the three would probably do. All three are cheap, and this runs at
 * build time on a public site.
 */

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h2", "h3", "h4",
  "p", "blockquote", "ul", "ol", "li",
  "strong", "em", "code", "pre", "a", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    // Heading ids power the in-page anchors.
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
  },
  // Absolute http(s) and site-relative links only. No mailto:, no javascript:,
  // no data: URIs.
  allowedSchemes: ["http", "https"],
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    // Every external link opens safely; internal links are left alone.
    a: (tagName, attribs) => {
      const href = attribs.href || "";
      const external = /^https?:\/\//i.test(href) && !href.includes("ezorders.com");
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" }
          : attribs,
      };
    },
  },
  disallowedTagsMode: "discard",
};

/** Deterministic heading id: same text always yields the same anchor. */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    // Keep Hebrew letters as well as ASCII alphanumerics.
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Render an article body to sanitized HTML.
 * Deterministic: identical Markdown always yields identical HTML.
 */
export function renderMarkdown(body: string): string {
  const renderer = new marked.Renderer();

  // Give h2/h3/h4 stable ids for deep links and a future table of contents.
  renderer.heading = ({ tokens, depth }) => {
    const text = stripInline(tokens);
    const level = Math.min(Math.max(depth, 2), 4); // h1 is the page title
    const id = slugifyHeading(text);
    return `<h${level} id="${id}">${escapeHtml(text)}</h${level}>\n`;
  };

  const html = marked.parse(body, {
    renderer,
    gfm: true,
    breaks: false,
    async: false,
  }) as string;

  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

type InlineToken = { raw?: string; text?: string; tokens?: InlineToken[] };

function stripInline(tokens: InlineToken[] | undefined): string {
  if (!tokens) return "";
  return tokens
    .map((t) => (t.tokens ? stripInline(t.tokens) : t.text ?? t.raw ?? ""))
    .join("")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text excerpt fallback. Never used when frontmatter supplies one. */
export function excerptFrom(body: string, maxChars = 160): string {
  const text = body
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/[*_`>#-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
}
