import { NextResponse, type NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth/session.ts (middleware can't
// import next/headers-based helpers).
const SESSION_COOKIE = "hap_session";
const AUTH_PAGES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = request.cookies.has(SESSION_COOKIE);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!loggedIn && !isAuthPage) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (loggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (anything with a dot).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
