"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/utils";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { setSession } from "./session";

export type ActionResult = { error: string } | undefined;

// Only allow redirects to paths within this app.
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(values: LoginFormValues, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter your username and password." };

  try {
    const user = await login(parsed.data);
    await setSession(user.id);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  redirect(safeNext(next));
}
