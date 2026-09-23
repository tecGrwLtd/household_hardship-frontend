"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createApplication, recordAppeal } from "@/lib/api/applications";
import { runAllocation } from "@/lib/api/cycles";
import { createHousehold } from "@/lib/api/households";
import { submitReview } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/utils";
import { newApplicationSchema, type NewApplicationInput } from "@/lib/validations/application";
import { newHouseholdSchema, type NewHouseholdInput } from "@/lib/validations/household";
import { reviewSchema, type ReviewInput } from "@/lib/validations/review";

export type ActionResult = { error: string } | { ok: true; message?: string } | undefined;

async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

function fail(e: unknown): ActionResult {
  if (e instanceof ApiError) return { error: e.message };
  throw e;
}

export async function createHouseholdAction(input: NewHouseholdInput): Promise<ActionResult> {
  await requireUser();
  const parsed = newHouseholdSchema.safeParse(input);
  if (!parsed.success) return { error: "Some fields are invalid. Check the form and try again." };
  let id: string;
  try {
    id = (await createHousehold(parsed.data)).household_id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/households");
  redirect(`/households/${id}?created=1`);
}

export async function createApplicationAction(input: NewApplicationInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = newApplicationSchema.safeParse(input);
  if (!parsed.success) return { error: "Some fields are invalid. Check the form and try again." };
  let id: number;
  try {
    id = (await createApplication(parsed.data, user.caseworker_id)).application_id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/applications");
  redirect(`/applications/${id}?created=1`);
}

export async function submitReviewAction(input: ReviewInput): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "caseworker" || user.caseworker_id === null) {
    return { error: "Only caseworkers can record review decisions." };
  }
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await submitReview(parsed.data, user.caseworker_id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Decision recorded." };
}

export async function recordAppealAction(applicationId: number): Promise<ActionResult> {
  await requireUser();
  try {
    await recordAppeal(applicationId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Appeal recorded. It is now in the review queue." };
}

export async function runAllocationAction(cycleId: number): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Only admins can run an allocation." };
  try {
    const { scored, moved } = await runAllocation(cycleId);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Scored ${scored.toLocaleString()} applications. ${moved} new application${moved === 1 ? "" : "s"} moved on.`,
    };
  } catch (e) {
    return fail(e);
  }
}
