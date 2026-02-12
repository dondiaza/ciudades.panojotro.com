import { NextRequest, NextResponse } from "next/server";

import { sanitizeRedirectPath, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_EXACT_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

const PUBLIC_PREFIX_PATHS = ["/_next/"];
const PUBLIC_FILE_PATTERN = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff2?|ttf|eot)$/i;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  if (PUBLIC_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return PUBLIC_FILE_PATTERN.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const requestedPath = sanitizeRedirectPath(`${pathname}${search}`);
    if (requestedPath !== "/") {
      loginUrl.searchParams.set("from", requestedPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
