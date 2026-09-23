import "server-only";
import type { Application, ModelScore } from "@/types";
import { area, db, household, nextId, touch } from "@/lib/mock/db";
import { latestScores } from "@/lib/mock/views";
import type { ReviewValues } from "@/lib/validations/review";
import { ApiError, delay } from "./utils";

export type Lean = "approve" | "defer";

/** Which way the model leans: need_mid above the cutoff leans approve. */
export function leanOf(score: ModelScore): Lean {
  return score.need_mid >= score.cutoff ? "approve" : "defer";
}

export interface QueueItem {
  application: Application;
  score: ModelScore;
  lean: Lean;
  area_name: string | null;
  kind: "review" | "appeal";
}

/** Human-review band awaiting a decision, plus appeals. Oldest first. */
export async function getReviewQueue(cycleId?: number): Promise<QueueItem[]> {
  await delay();
  const latest = latestScores();
  return db.applications
    .filter(
      (a) =>
        (!cycleId || a.cycle_id === cycleId) &&
        (a.status === "in_review" || a.status === "appealed") &&
        latest.has(a.application_id),
    )
    .map((a) => {
      const score = latest.get(a.application_id)!;
      return {
        application: a,
        score,
        lean: leanOf(score),
        area_name: area(household(a.household_id)?.area_code ?? "")?.area_name ?? null,
        kind: a.status === "appealed" ? ("appeal" as const) : ("review" as const),
      };
    })
    .sort((x, y) => x.application.submitted_at.localeCompare(y.application.submitted_at));
}

export async function getReviewQueueCount(cycleId: number): Promise<number> {
  return db.applications.filter(
    (a) => a.cycle_id === cycleId && (a.status === "in_review" || a.status === "appealed"),
  ).length;
}

/**
 * Record a caseworker's decision. `overridden` is set when the decision goes
 * against the model's lean; a written reason is required in that case.
 */
export async function submitReview(input: ReviewValues, caseworkerId: number) {
  await delay(300);
  const app = db.applications.find((a) => a.application_id === input.application_id);
  if (!app) throw new ApiError("Application not found.");
  if (app.status !== "in_review" && app.status !== "appealed") {
    throw new ApiError("This application is not waiting for a review.");
  }
  const score = latestScores().get(app.application_id);
  if (!score) throw new ApiError("Run the allocation for this cycle before reviewing.");

  const approving = input.final_decision !== "deferred";
  const overridden = (leanOf(score) === "approve") !== approving;
  if (overridden && (input.notes ?? "").trim().length < 10) {
    throw new ApiError("Explain the override in the notes (at least 10 characters).");
  }
  if (approving && !(input.award_amount && input.award_amount > 0)) {
    throw new ApiError("Enter the award amount.");
  }

  const review = {
    review_id: nextId(db.application_reviews, "review_id"),
    application_id: app.application_id,
    caseworker_id: caseworkerId,
    reviewed_at: new Date().toISOString().slice(0, 19),
    initial_band: score.band,
    final_decision: input.final_decision,
    overridden,
    notes: input.notes?.trim() || null,
  };
  db.application_reviews.push(review);

  if (approving) {
    app.status = "awarded";
    db.awards.push({
      award_id: nextId(db.awards, "award_id"),
      application_id: app.application_id,
      household_id: app.household_id,
      award_amount: input.award_amount!,
      award_date: new Date().toISOString().slice(0, 10),
      need_category: app.need_category,
      outcome_followup_days: null,
    });
  } else {
    app.status = "deferred";
  }
  touch();
  return review;
}
