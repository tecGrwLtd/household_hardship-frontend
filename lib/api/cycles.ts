import "server-only";
import type { Application, DecisionBand, ModelScore } from "@/types";
import { db, nextId, touch } from "@/lib/mock/db";
import { cycleSummary, latestScores, rescoreCycle } from "@/lib/mock/views";
import { ApiError, delay } from "./utils";

export interface RankedApplication {
  rank: number;
  application: Application;
  score: ModelScore;
}

export async function getCycleDetail(cycleId: number) {
  await delay();
  const summary = cycleSummary().find((c) => c.cycle_id === cycleId);
  if (!summary) return undefined;
  const latest = latestScores();
  const ranked = db.applications
    .filter((a) => a.cycle_id === cycleId && latest.has(a.application_id))
    .map((a) => ({ application: a, score: latest.get(a.application_id)! }))
    .sort((x, y) => y.score.need_mid - x.score.need_mid)
    .map((x, i): RankedApplication => ({ rank: i + 1, ...x }));
  const bandCounts: Record<DecisionBand, number> = {
    auto_approve: 0,
    audit_approve: 0,
    human_review: 0,
    defer: 0,
  };
  ranked.forEach((r) => (bandCounts[r.score.band] += 1));
  const unscored = db.applications.filter(
    (a) => a.cycle_id === cycleId && a.status === "submitted",
  ).length;
  return {
    summary,
    cutoff: ranked[0]?.score.cutoff ?? null,
    model_version: ranked[0]?.score.model_version ?? null,
    scored_at: ranked.reduce((m, r) => (r.score.scored_at > m ? r.score.scored_at : m), ""),
    bandCounts,
    ranked,
    awaitingAllocation: unscored,
  };
}

/**
 * Run the allocation for a cycle (rank under budget + bands + audit sample)
 * and move newly submitted applications into their next workflow state.
 * Auto- and audit-approvals get an award for the amount requested; award
 * sizing is outside the model's scope, so staff can adjust it later.
 */
export async function runAllocation(cycleId: number) {
  await delay(400);
  if (!db.funding_cycles.some((c) => c.cycle_id === cycleId)) {
    throw new ApiError("Unknown funding cycle.");
  }
  const scores = rescoreCycle(cycleId);
  let moved = 0;
  for (const s of scores) {
    const app = db.applications.find((a) => a.application_id === s.application_id);
    if (!app || app.status !== "submitted") continue;
    moved += 1;
    if (s.band === "human_review") app.status = "in_review";
    else if (s.band === "defer") app.status = "deferred";
    else {
      app.status = s.band === "auto_approve" ? "auto_approved" : "audit_approved";
      db.awards.push({
        award_id: nextId(db.awards, "award_id"),
        application_id: app.application_id,
        household_id: app.household_id,
        award_amount: app.amount_requested,
        award_date: new Date().toISOString().slice(0, 10),
        need_category: app.need_category,
        outcome_followup_days: null,
      });
    }
  }
  touch();
  return { scored: scores.length, moved };
}
