import { cookies } from "next/headers";
import type { User } from "@/types";
import { getUserById } from "@/lib/api/auth";

// The cookie only holds the user id while auth is mocked.
// TODO: store the backend's token here instead.

export const SESSION_COOKIE = "hap_session";

export async function getSessionUser(): Promise<User | undefined> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  return id ? getUserById(id) : undefined;
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
