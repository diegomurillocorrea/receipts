import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/** Rutas accesibles sin sesión (incluye /post: cartel público). */
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/post", "/streaming"];

/**
 * Si ya hay sesión, estas rutas redirigen al inicio (evita ver login con cuenta activa).
 * No incluir /post: los usuarios logueados deben poder ver el cartel sin ser enviados a /payments.
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

export async function proxy(request) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

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
