import "server-only";
import type { Household, HouseholdSurvey } from "@/types";
import { area, db, household, latestSurvey, touch } from "@/lib/mock/db";
import type { NewHouseholdValues } from "@/lib/validations/household";
import { withoutTruth } from "./applications";
import { ApiError, delay, paginate } from "./utils";

export async function listHouseholds(params: { q?: string; area_code?: string; page?: number }) {
  await delay();
  const q = params.q?.trim().toLowerCase();
  const appCount = new Map<string, number>();
  for (const a of db.applications) appCount.set(a.household_id, (appCount.get(a.household_id) ?? 0) + 1);
  const rows = db.households
    .filter(
      (h) =>
        (!params.area_code || h.area_code === params.area_code) &&
        (!q || h.household_id.startsWith(q)),
    )
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  const page = paginate(rows, params.page, 25);
  return {
    ...page,
    rows: page.rows.map((h) => {
      const s = latestSurvey(h.household_id);
      return {
        household: h,
        area_name: area(h.area_code)?.area_name ?? h.area_code,
        household_size: s?.household_size ?? null,
        survey_date: s?.survey_date ?? null,
        applications: appCount.get(h.household_id) ?? 0,
      };
    }),
  };
}

export async function getHousehold(id: string) {
  await delay();
  const h = household(id);
  if (!h) return undefined;
  return {
    household: h,
    area: area(h.area_code) ?? null,
    survey: withoutTruth(latestSurvey(id)),
    applications: db.applications
      .filter((a) => a.household_id === id)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    awards: db.awards.filter((w) => w.household_id === id),
  };
}

/** Register a household with its first survey wave and (audit-only) protected attributes. */
export async function createHousehold(input: NewHouseholdValues): Promise<Household> {
  await delay(300);
  if (!area(input.area_code)) throw new ApiError("Unknown area.");
  const now = new Date().toISOString();
  const h: Household = {
    household_id: crypto.randomUUID(),
    area_code: input.area_code,
    registered_at: now.slice(0, 10),
    notes: input.notes?.trim() || null,
  };
  const survey: HouseholdSurvey = {
    ...input.survey,
    household_id: h.household_id,
    survey_date: now.slice(0, 10),
    // Measured separately and only for approved/audited applicants.
    consumption_pc: null,
  };
  db.households.push(h);
  db.household_surveys.push(survey);
  db.protected_attributes.push({ household_id: h.household_id, ...input.protected });
  touch();
  return h;
}
