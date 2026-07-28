import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/** Rutas accesibles sin sesión. */
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/streaming"];

/**
 * Si ya hay sesión, estas rutas redirigen al inicio (evita ver login con cuenta activa).
 */
const AUTH_REDIRECT_HOME_PATHS = ["/login", "/signup", "/auth/callback"];

function matchesPathList(pathname, list) {
  return list.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicPath(pathname) {
  return matchesPathList(pathname, PUBLIC_PATHS);
}

function shouldRedirectAuthenticatedUserToHome(pathname) {
  return matchesPathList(pathname, AUTH_REDIRECT_HOME_PATHS);
}

function getCurrentSupabaseCookiePrefix() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    const projectRef = host.split(".")[0];
    if (!projectRef) return null;
    return `sb-${projectRef}-`;
  } catch {
    return null;
  }
}

/** Borra cookies de auth de otros proyectos Supabase (evita 431 por headers enormes). */
function clearStaleSupabaseCookies(request, response) {
  const currentPrefix = getCurrentSupabaseCookiePrefix();
  if (!currentPrefix) return;

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-")) continue;
    if (cookie.name.startsWith(currentPrefix)) continue;

    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
    });
  }
}

export async function proxy(request) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  clearStaleSupabaseCookies(request, response);

  const supabase = createClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session && shouldRedirectAuthenticatedUserToHome(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!session && !isPublicPath(pathname)) {
    // Route handlers return JSON errors (rather than an HTML login redirect) for API clients.
    if (pathname.startsWith("/api/")) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
