import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

function logout(request: NextRequest) {
  // 303 so a POST is followed by a GET of /login.
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

// Clears a stale or unwanted session and sends the user to /login.
export const GET = logout;

// The "Log out" menu item posts a plain form here rather than calling a server
// action, so it still works from a tab that was loaded before a rebuild.
export const POST = logout;
