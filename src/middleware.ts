import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Two unrelated jobs, kept visibly separate.
 *
 * 1. LOCALE. Hebrew is the site's default locale; English lives under /en.
 *      "/"                                      -> /he, unless NEXT_LOCALE=en
 *      legacy English root paths (/about, ...)  -> /en/<path>
 *    The NEXT_LOCALE cookie is written by LanguageSwitcher.
 *
 * 2. AGENT SESSION. Supabase access tokens are short-lived, and only middleware
 *    can hand a refreshed cookie back to the browser. Without this pass an agent
 *    is silently logged out roughly every hour. The redirect for signed-out
 *    visitors here is a courtesy, not the security boundary -- pages call
 *    requireAgentSession() and the data itself is guarded by RLS.
 */

const LEGACY_EN_PATHS = [
  "/about",
  "/accessibility",
  // "/blog" was the one page missing from this list, so it 404'd while every
  // sibling redirected. Search Console reported it as the site's only
  // "Not found (404)".
  "/blog",
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

const AGENT_PREFIX = "/he/agent";
const AGENT_PUBLIC_PATHS = [`${AGENT_PREFIX}/login`];

function isAgentPath(pathname: string): boolean {
  return pathname === AGENT_PREFIX || pathname.startsWith(`${AGENT_PREFIX}/`);
}

async function withAgentSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Unconfigured deployment: let the request through and let the page render the
  // "portal not configured" message, rather than bouncing to a login that also
  // cannot work.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the token when it is close to expiry and writes the new cookie
  // onto `response`. Must be awaited before the response is returned.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = AGENT_PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `${AGENT_PREFIX}/login`;
    loginUrl.search = "";
    // So the agent lands back where they were aiming after signing in.
    if (pathname !== AGENT_PREFIX) loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublic) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = AGENT_PREFIX;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAgentPath(pathname)) {
    return withAgentSession(request);
  }

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
    "/accessibility",
    // Must be listed HERE as well as in LEGACY_EN_PATHS. This matcher decides
    // whether the middleware runs at all; the other list only decides what it
    // does once it has. Adding the path to one and not the other leaves the
    // 404 exactly as it was, which is what happened on the first attempt.
    "/blog",
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
    "/he/agent/:path*",
  ],
};
