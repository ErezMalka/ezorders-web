import { NextResponse, type NextRequest } from "next/server";

/**
 * Hebrew is the site's default locale. English lives under /en.
 *
 * - "/"            -> /he, unless NEXT_LOCALE=en says otherwise
 * - legacy English root paths (/about, /contact, ...) -> /en/<path>
 *
 * The NEXT_LOCALE cookie is written by LanguageSwitcher.
 */

const LEGACY_EN_PATHS = [
  "/about",
  "/contact",
  "/digital-menus",
  "/kiosk-stands",
  "/platform",
  "/pos",
  "/price",
  "/privacy",
  "/restaurant-ordering-app",
  "/restaurant-ordering-website",
  "/solutions",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const locale = request.cookies.get("NEXT_LOCALE")?.value === "en" ? "en" : "he";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url, 308);
  }

  if (LEGACY_EN_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // Expose the pathname to the root layout so it can render the correct
  // <html lang dir> per locale on the server. Passed as a request header —
  // it does not change the response, only what the layout can read.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all page routes so the root layout always sees `x-pathname`, but skip
  // API routes, Next internals, and any file with an extension (assets, feeds,
  // sitemap.xml, robots.txt, opengraph images) — those are not under the layout.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
