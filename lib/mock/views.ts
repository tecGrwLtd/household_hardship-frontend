import "server-only";
import type {
  Application,
  Award,
  BeneficiaryBucket,
  CycleSummaryRow,
  FairnessAudit,
  ModelScore,
  MonthlyApplicationsRow,
  MonthlySupportRow,
  RepeatBucket,
  RepeatSupportRow,
} from "@/types";
import { supportGroup } from "@/lib/labels";
import { area, db, household, latestSurvey, nextId } from "./db";
import { allocateCycle } from "./scoring";

// JS port of db/views.sql, plus model_scores and fairness_audits.

const DAY = 86_400_000;

// model_scores

/** Score every cycle once, as `python -m backend.ml score` does on a fresh load. */
export function ensureScores() {
  if (db.model_scores.length) return;
  for (const cycle of db.funding_cycles) {
    const rows = allocateCycle(cycle, `${cycle.period_end}T18:00:00`, db.model_scores.length + 1);
    db.model_scores.push(...rows);
  }
}

/** Re-run allocation for one cycle; appends new score rows (latest wins). */
export function rescoreCycle(cycleId: number) {
  ensureScores();
  const cycle = db.funding_cycles.find((c) => c.cycle_id === cycleId);
  if (!cycle) throw new Error(`Unknown cycle ${cycleId}`);
  const rows = allocateCycle(cycle, new Date().toISOString(), nextId(db.model_scores, "score_id"));
  db.model_scores.push(...rows);
  return rows;
}

let latestVersion = -1;
let latestLen = -1;
let latestByApp = new Map<number, ModelScore>();

export function latestScores() {
  ensureScores();
  if (latestVersion !== db.version || latestLen !== db.model_scores.length) {
    latestByApp = new Map();
    for (const s of db.model_scores) {
      const prev = latestByApp.get(s.application_id);
      if (!prev || prev.score_id < s.score_id) latestByApp.set(s.application_id, s);
    }
    latestVersion = db.version;
    latestLen = db.model_scores.length;
  }
  return latestByApp;
}

// Awards / repeat support

function awardsByHousehold() {
  const map = new Map<string, Award[]>();
  for (const a of db.awards) {
    const list = map.get(a.household_id) ?? [];
    list.push(a);
    map.set(a.household_id, list);
  }
  return map;
}

function repeatBucket(a: Application): RepeatBucket {
  if (a.prior_applications_count === 0) return "first_time";
  if (a.days_since_last_application === null) return "unknown";
  return a.days_since_last_application < 365 ? "repeat_within_1y" : "repeat_over_1y";
}

function beneficiaryBucket(a: Application, prior: Award[] | undefined): BeneficiaryBucket {
  const submitted = Date.parse(a.submitted_at);
  const submittedDay = a.submitted_at.slice(0, 10);
  // Only awards for other applications, dated before the day this one came in.
  const before = (prior ?? []).filter(
    (w) => w.application_id !== a.application_id && w.award_date < submittedDay,
  );
  if (!before.length) return "never_helped";
  const last = Math.max(...before.map((w) => Date.parse(w.award_date)));
  return submitted - last < 365 * DAY ? "helped_within_1y" : "helped_over_1y";
}

/** v_repeat_support */
export function repeatSupport(): RepeatSupportRow[] {
  const byHh = awardsByHousehold();
  return db.applications.map((a) => ({
    application_id: a.application_id,
    household_id: a.household_id,
    submitted_at: a.submitted_at,
    need_category: a.need_category,
    prior_applications_count: a.prior_applications_count,
    days_since_last_application: a.days_since_last_application,
    is_repeat_applicant: a.prior_applications_count > 0,
    repeat_bucket: repeatBucket(a),
    beneficiary_bucket: beneficiaryBucket(a, byHh.get(a.household_id)),
  }));
}

const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;

/** v_monthly_support */
export function monthlySupport(): MonthlySupportRow[] {
  const byHh = awardsByHousehold();
  const awarded = new Set(db.awards.map((w) => w.application_id));
  const rows = new Map<string, MonthlySupportRow>();
  for (const a of db.applications) {
    const month = monthOf(a.submitted_at);
    const group = supportGroup(a.need_category);
    const key = `${month}|${group}`;
    const row =
      rows.get(key) ??
      ({
        month,
        support_group: group,
        applicant_count: 0,
        helped_before_count: 0,
        helped_within_1y_count: 0,
        helped_over_1y_count: 0,
        awarded_count: 0,
      } satisfies MonthlySupportRow);
    row.applicant_count += 1;
    const b = beneficiaryBucket(a, byHh.get(a.household_id));
    if (b !== "never_helped") row.helped_before_count += 1;
    if (b === "helped_within_1y") row.helped_within_1y_count += 1;
    if (b === "helped_over_1y") row.helped_over_1y_count += 1;
    if (awarded.has(a.application_id)) row.awarded_count += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((x, y) => x.month.localeCompare(y.month));
}

/** v_monthly_applications */
export function monthlyApplications(): MonthlyApplicationsRow[] {
  const latest = latestScores();
  const rows = new Map<string, MonthlyApplicationsRow>();
  for (const a of db.applications) {
    const month = monthOf(a.submitted_at);
    const key = `${month}|${a.need_category}`;
    const row =
      rows.get(key) ??
      ({
        month,
        need_category: a.need_category,
        support_group: supportGroup(a.need_category),
        applicant_count: 0,
        auto_approved_count: 0,
        human_review_count: 0,
        deferred_count: 0,
        audit_approved_count: 0,
      } satisfies MonthlyApplicationsRow);
    row.applicant_count += 1;
    const band = latest.get(a.application_id)?.band;
    if (band === "auto_approve") row.auto_approved_count += 1;
    if (band === "human_review") row.human_review_count += 1;
    if (band === "defer") row.deferred_count += 1;
    if (band === "audit_approve") row.audit_approved_count += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (x, y) => x.month.localeCompare(y.month) || x.need_category.localeCompare(y.need_category),
  );
}

/** v_cycle_summary */
export function cycleSummary(): CycleSummaryRow[] {
  const awardByApp = new Map<number, number>();
  for (const w of db.awards) {
    awardByApp.set(w.application_id, (awardByApp.get(w.application_id) ?? 0) + w.award_amount);
  }
  return db.funding_cycles
    .map((c) => {
      const apps = db.applications.filter((a) => a.cycle_id === c.cycle_id);
      return {
        cycle_id: c.cycle_id,
        period_start: c.period_start,
        period_end: c.period_end,
        budget_total: c.budget_total,
        budget_currency: c.budget_currency,
        total_applications: apps.length,
        total_households: new Set(apps.map((a) => a.household_id)).size,
        repeat_applications: apps.filter((a) => a.prior_applications_count > 0).length,
        total_awarded: apps.reduce((sum, a) => sum + (awardByApp.get(a.application_id) ?? 0), 0),
      };
    })
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

// fairness_audits: the spec's audit(), per cycle or across all cycles

// Protected attributes plus need category, channel and referral source.
export const AUDIT_ATTRIBUTES = [
  "gender_head",
  "disability",
  "age_band",
  "ethnicity",
  "religion",
  "nationality",
  "urban_rural",
  "need_category",
  "application_channel",
  "referral_source",
] as const;

export type AuditAttribute = (typeof AUDIT_ATTRIBUTES)[number];

// Share of the bottom decile (by consumption_pc) that was deferred, per group.
// cycleId null = all cycles. Only place protected_attributes is read.
export function fairnessAudit(cycleId: number | null) {
  const latest = latestScores();
  const protectedByHh = new Map(db.protected_attributes.map((p) => [p.household_id, p]));
  const apps = db.applications.filter(
    (a) => (cycleId === null || a.cycle_id === cycleId) && latest.has(a.application_id),
  );
  const withTruth = apps
    .map((a) => ({ a, truth: latestSurvey(a.household_id)?.consumption_pc ?? null }))
    .filter((x): x is { a: Application; truth: number } => x.truth !== null)
    .sort((x, y) => x.truth - y.truth);
  const bottom = withTruth.slice(0, Math.max(1, Math.round(withTruth.length * 0.1)));

  const deferred = (a: Application) => latest.get(a.application_id)?.band === "defer";
  const valueOf = (a: Application, attr: AuditAttribute): string => {
    if (attr === "need_category") return a.need_category;
    if (attr === "application_channel") return a.application_channel ?? "unknown";
    if (attr === "referral_source") return a.referral_source ?? "unknown";
    if (attr === "urban_rural") {
      const hh = household(a.household_id);
      return (hh && area(hh.area_code)?.urban_rural) ?? "unknown";
    }
    return protectedByHh.get(a.household_id)?.[attr] ?? "not_recorded";
  };

  const rows: FairnessAudit[] = [];
  for (const attr of AUDIT_ATTRIBUTES) {
    const groups = new Map<string, Application[]>();
    for (const { a } of bottom) {
      const v = valueOf(a, attr);
      groups.set(v, [...(groups.get(v) ?? []), a]);
    }
    const attrRows = [...groups.entries()].map(([group_value, list]) => ({
      cycle_id: cycleId ?? 0,
      attribute: attr,
      group_value,
      n: list.length,
      exclusion_error: list.filter(deferred).length / list.length,
      gap_vs_best: 0,
    }));
    const best = Math.min(...attrRows.map((r) => r.exclusion_error));
    attrRows.forEach((r) => (r.gap_vs_best = r.exclusion_error - best));
    rows.push(...attrRows.sort((x, y) => y.gap_vs_best - x.gap_vs_best));
  }

  return {
    bottom_decile_n: bottom.length,
    overall_exclusion_error: bottom.filter(({ a }) => deferred(a)).length / bottom.length,
    rows,
  };
}

// Override monitoring (application_reviews)

export function overrideStats() {
  const reviews = db.application_reviews;
  const byCaseworker = db.caseworkers.map((cw) => {
    const mine = reviews.filter((r) => r.caseworker_id === cw.caseworker_id);
    return {
      caseworker_id: cw.caseworker_id,
      display_name: cw.display_name,
      region: cw.region,
      reviews: mine.length,
      overrides: mine.filter((r) => r.overridden).length,
      override_rate: mine.length ? mine.filter((r) => r.overridden).length / mine.length : null,
    };
  });
  return {
    reviews: reviews.length,
    overrides: reviews.filter((r) => r.overridden).length,
    override_rate: reviews.length ? reviews.filter((r) => r.overridden).length / reviews.length : null,
    byCaseworker,
  };
}
