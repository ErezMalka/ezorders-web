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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
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
  ],
};
