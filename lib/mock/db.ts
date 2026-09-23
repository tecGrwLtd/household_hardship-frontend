import "server-only";
import type {
  Application,
  ModelScore,
  ModelVersion,
  ApplicationReview,
  AreaReference,
  Award,
  Caseworker,
  FundingCycle,
  Household,
  HouseholdSurvey,
  ProtectedAttributes,
} from "@/types";
import areaReference from "./seed/area_reference.json";
import fundingCycles from "./seed/funding_cycles.json";
import caseworkers from "./seed/caseworkers.json";
import households from "./seed/households.json";
import householdSurveys from "./seed/household_surveys.json";
import protectedAttributes from "./seed/protected_attributes.json";
import applications from "./seed/applications.json";
import applicationReviews from "./seed/application_reviews.json";
import awards from "./seed/awards.json";

// In-memory copy of the backend's synthetic dataset (db/seed/*.csv, converted
// by scripts/convert_seed.py). Writes mutate these arrays and last until the
// server restarts. Nothing outside lib/api should import this file.

type Columnar = { columns: string[]; rows: unknown[][] };

function toObjects<T>(table: Columnar): T[] {
  return table.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    table.columns.forEach((c, i) => (obj[c] = row[i]));
    return obj as T;
  });
}

function createDb() {
  const db = {
    area_reference: toObjects<AreaReference>(areaReference as Columnar),
    funding_cycles: toObjects<FundingCycle>(fundingCycles as Columnar),
    caseworkers: toObjects<Caseworker>(caseworkers as Columnar),
    households: toObjects<Household>(households as Columnar),
    household_surveys: toObjects<HouseholdSurvey>(householdSurveys as Columnar),
    protected_attributes: toObjects<ProtectedAttributes>(protectedAttributes as Columnar),
    applications: toObjects<Application>(applications as Columnar),
    application_reviews: toObjects<ApplicationReview>(applicationReviews as Columnar),
    awards: toObjects<Award>(awards as Columnar),
    /** Not in the seed: the backend fills it by scoring. See lib/mock/views.ts. */
    model_scores: [] as ModelScore[],
    model_versions: [
      {
        model_version: "rules-v0-mock",
        kind: "rule_based",
        active: true,
        created_at: "2024-09-15T00:00:00",
        notes: "Transparent rule-based placeholder, like the backend's rules-v0.",
      },
    ] as ModelVersion[],
    /** Bumped on every write so cached derived data (scores, views) is rebuilt. */
    version: 0,
  };
  return db;
}

// Survive dev-server hot reloads so mock writes aren't lost on every edit.
const globalForDb = globalThis as unknown as { __hardshipMockDb?: ReturnType<typeof createDb> };
export const db = (globalForDb.__hardshipMockDb ??= createDb());

export function touch() {
  db.version += 1;
}

// Lookups

let indexVersion = -1;
let surveyByHousehold = new Map<string, HouseholdSurvey>();
let areaByCode = new Map<string, AreaReference>();
let householdById = new Map<string, Household>();
let appById = new Map<number, Application>();

function ensureIndexes() {
  if (indexVersion === db.version) return;
  surveyByHousehold = new Map();
  // Latest survey wave per household.
  for (const s of db.household_surveys) {
    const prev = surveyByHousehold.get(s.household_id);
    if (!prev || prev.survey_date < s.survey_date) surveyByHousehold.set(s.household_id, s);
  }
  areaByCode = new Map(db.area_reference.map((a) => [a.area_code, a]));
  householdById = new Map(db.households.map((h) => [h.household_id, h]));
  appById = new Map(db.applications.map((a) => [a.application_id, a]));
  indexVersion = db.version;
}

export function latestSurvey(householdId: string) {
  ensureIndexes();
  return surveyByHousehold.get(householdId);
}

export function area(code: string) {
  ensureIndexes();
  return areaByCode.get(code);
}

export function household(id: string) {
  ensureIndexes();
  return householdById.get(id);
}

export function application(id: number) {
  ensureIndexes();
  return appById.get(id);
}

export function nextId<T>(rows: T[], key: keyof T): number {
  return rows.reduce((max, r) => Math.max(max, Number(r[key])), 0) + 1;
}
