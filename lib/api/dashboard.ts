import "server-only";
import type {
  BeneficiaryBucket,
  CycleSummaryRow,
  MonthlyApplicationsRow,
  MonthlySupportRow,
  RepeatBucket,
} from "@/types";
import { db } from "@/lib/mock/db";
import {
  cycleSummary,
  monthlyApplications,
  monthlySupport,
  overrideStats,
  repeatSupport,
} from "@/lib/mock/views";
import { delay } from "./utils";

// Each function maps to one dashboard view in the backend's db/views.sql.

/** v_monthly_support */
export async function getMonthlySupport(): Promise<MonthlySupportRow[]> {
  await delay();
  return monthlySupport();
}

/** v_monthly_applications */
export async function getMonthlyApplications(): Promise<MonthlyApplicationsRow[]> {
  await delay();
  return monthlyApplications();
}

/** v_cycle_summary */
export async function getCycleSummaries(): Promise<CycleSummaryRow[]> {
  await delay();
  return cycleSummary();
}

/** v_repeat_support, counted per bucket (optionally for one cycle). */
export async function getRepeatSupportSummary(cycleId?: number) {
  await delay();
  const inCycle = cycleId
    ? new Set(db.applications.filter((a) => a.cycle_id === cycleId).map((a) => a.application_id))
    : null;
  const rows = repeatSupport().filter((r) => !inCycle || inCycle.has(r.application_id));
  const repeat: Record<RepeatBucket, number> = {
    first_time: 0,
    repeat_within_1y: 0,
    repeat_over_1y: 0,
    unknown: 0,
  };
  const beneficiary: Record<BeneficiaryBucket, number> = {
    never_helped: 0,
    helped_within_1y: 0,
    helped_over_1y: 0,
  };
  for (const r of rows) {
    repeat[r.repeat_bucket] += 1;
    beneficiary[r.beneficiary_bucket] += 1;
  }
  return { total: rows.length, repeat, beneficiary };
}

/** Review override rate overall and per caseworker (from application_reviews). */
export async function getOverrideStats() {
  await delay();
  return overrideStats();
}
