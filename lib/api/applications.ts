import "server-only";
import type {
  Application,
  ApplicationChannel,
  ApplicationStatus,
  DecisionBand,
  HouseholdSurvey,
  ModelScore,
  NeedCategory,
} from "@/types";
import { area, db, household, latestSurvey, nextId, touch } from "@/lib/mock/db";
import { latestScores, repeatSupport } from "@/lib/mock/views";
import type { NewApplicationValues } from "@/lib/validations/application";
import { ApiError, delay, paginate } from "./utils";

export interface ApplicationFilters {
  cycle_id?: number;
  need_category?: NeedCategory;
  band?: DecisionBand;
  status?: ApplicationStatus;
  channel?: ApplicationChannel;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ApplicationListRow {
  application: Application;
  score: ModelScore | null;
  area_name: string | null;
}

export async function listApplications(filters: ApplicationFilters = {}) {
  await delay();
  const latest = latestScores();
  const q = filters.q?.trim().toLowerCase();
  let rows = db.applications.filter(
    (a) =>
      (!filters.cycle_id || a.cycle_id === filters.cycle_id) &&
      (!filters.need_category || a.need_category === filters.need_category) &&
      (!filters.status || a.status === filters.status) &&
      (!filters.channel || a.application_channel === filters.channel) &&
      (!filters.band || latest.get(a.application_id)?.band === filters.band) &&
      (!q || String(a.application_id) === q || a.household_id.startsWith(q)),
  );
  // Within one cycle, show the ranking the allocation used; otherwise newest first.
  rows = filters.cycle_id
    ? rows.sort(
        (x, y) =>
          (latest.get(y.application_id)?.need_mid ?? -1) - (latest.get(x.application_id)?.need_mid ?? -1),
      )
    : rows.sort((x, y) => y.submitted_at.localeCompare(x.submitted_at) || y.application_id - x.application_id);
  const page = paginate(rows, filters.page, filters.pageSize);
  return {
    ...page,
    rows: page.rows.map(
      (a): ApplicationListRow => ({
        application: a,
        score: latest.get(a.application_id) ?? null,
        area_name: area(household(a.household_id)?.area_code ?? "")?.area_name ?? null,
      }),
    ),
  };
}

/** Survey without the ground-truth welfare target, which must never sit beside a decision. */
export type DecisionSurvey = Omit<HouseholdSurvey, "consumption_pc">;

export function withoutTruth(s: HouseholdSurvey | undefined): DecisionSurvey | null {
  if (!s) return null;
  const rest: Partial<HouseholdSurvey> = { ...s };
  delete rest.consumption_pc;
  return rest as DecisionSurvey;
}

export async function getApplication(id: number) {
  await delay();
  const app = db.applications.find((a) => a.application_id === id);
  if (!app) return undefined;
  const hh = household(app.household_id);
  const scores = db.model_scores
    .filter((s) => s.application_id === id)
    .sort((a, b) => b.score_id - a.score_id);
  const caseworkerName = (cid: number | null) =>
    db.caseworkers.find((c) => c.caseworker_id === cid)?.display_name ?? null;
  const repeat = repeatSupport().find((r) => r.application_id === id)!;
  return {
    application: app,
    cycle: db.funding_cycles.find((c) => c.cycle_id === app.cycle_id)!,
    household: hh ?? null,
    area: hh ? (area(hh.area_code) ?? null) : null,
    survey: withoutTruth(latestSurvey(app.household_id)),
    score: latestScores().get(id) ?? null,
    scoreHistory: scores,
    submittedBy: caseworkerName(app.caseworker_id),
    reviews: db.application_reviews
      .filter((r) => r.application_id === id)
      .sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))
      .map((r) => ({ ...r, caseworker_name: caseworkerName(r.caseworker_id) })),
    awards: db.awards.filter((w) => w.application_id === id),
    otherApplications: db.applications
      .filter((a) => a.household_id === app.household_id && a.application_id !== id)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    repeat,
  };
}

/** Optional fields counted towards application_completeness. */
const OPTIONAL_FIELDS = ["stated_need_amount", "days_since_hardship_onset", "referral_source"] as const;

export async function createApplication(
  input: NewApplicationValues,
  caseworkerId: number | null,
): Promise<Application> {
  await delay(300);
  if (!household(input.household_id)) throw new ApiError("Household not found.");
  if (!latestSurvey(input.household_id)) {
    throw new ApiError("This household has no survey yet. Record a survey before applying.");
  }
  const today = new Date().toISOString().slice(0, 10);
  const cycle =
    db.funding_cycles.find((c) => c.period_start <= today && today <= c.period_end) ??
    [...db.funding_cycles].sort((a, b) => b.period_start.localeCompare(a.period_start))[0];

  // The backend derives these from history; staff never type them in.
  const previous = db.applications
    .filter((a) => a.household_id === input.household_id)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const now = new Date();
  const filled = OPTIONAL_FIELDS.filter((f) => input[f] !== null && input[f] !== undefined);

  const app: Application = {
    application_id: nextId(db.applications, "application_id"),
    household_id: input.household_id,
    cycle_id: cycle.cycle_id,
    caseworker_id: caseworkerId,
    submitted_at: now.toISOString().slice(0, 19),
    amount_requested: input.amount_requested,
    need_category: input.need_category,
    stated_need_amount: input.stated_need_amount ?? null,
    days_since_hardship_onset: input.days_since_hardship_onset ?? null,
    prior_applications_count: previous.length,
    days_since_last_application: previous.length
      ? Math.floor((now.getTime() - Date.parse(previous[0].submitted_at)) / 86_400_000)
      : null,
    referral_source: input.referral_source ?? null,
    application_channel: input.application_channel,
    application_completeness: Math.round((filled.length / OPTIONAL_FIELDS.length) * 1000) / 1000,
    documentation_provided: input.documentation_provided,
    status: "submitted",
  };
  db.applications.push(app);
  touch();
  return app;
}

/** Deferred applicants can appeal; the appeal goes back to a human. */
export async function recordAppeal(id: number) {
  await delay(200);
  const app = db.applications.find((a) => a.application_id === id);
  if (!app) throw new ApiError("Application not found.");
  if (app.status !== "deferred") throw new ApiError("Only deferred applications can be appealed.");
  app.status = "appealed";
  touch();
  return app;
}
