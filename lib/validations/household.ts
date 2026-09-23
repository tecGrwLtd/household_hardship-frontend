import { z } from "zod";
import { optionalEnum, optionalNumber, optionalText, requiredNumber } from "./shared";

// Mirrors household_surveys and protected_attributes in the backend schema.
// Category values are the ones used in the backend's seed data.

export const EDUCATION_LEVELS = ["none", "primary", "secondary", "vocational", "tertiary"] as const;
export const TENURES = ["owned", "mortgaged", "private_rent", "social", "informal", "temporary"] as const;
export const EMPLOYMENT_TYPES = [
  "formal",
  "informal",
  "self_employed",
  "unemployed",
  "unable_to_work",
] as const;
export const ROOF_MATERIALS = ["concrete", "iron_sheet", "thatch", "tile"] as const;
export const WALL_MATERIALS = ["burnt_brick", "concrete_block", "mud_brick", "wood"] as const;
export const FLOOR_MATERIALS = ["cement", "earth", "tile"] as const;
export const WATER_SOURCES = ["piped_indoor", "public_tap", "borehole", "vendor", "surface_water"] as const;
export const SANITATION_TYPES = ["flush_private", "pit_latrine_private", "pit_latrine_shared", "none"] as const;
export const COOKING_FUELS = ["electricity", "gas", "charcoal", "firewood"] as const;

export const ASSETS = [
  "asset_phone",
  "asset_radio",
  "asset_tv",
  "asset_fridge",
  "asset_washing_machine",
  "asset_bicycle",
  "asset_motorcycle",
  "asset_car",
] as const;

export const SHOCKS = [
  "shock_bereavement_12m",
  "shock_serious_illness_12m",
  "shock_job_loss_12m",
  "shock_eviction_12m",
  "shock_displacement_12m",
  "shock_disaster_12m",
  "shock_crop_failure_12m",
] as const;

const surveySchema = z
  .object({
    household_size: requiredNumber("Household size", { min: 1, int: true }),
    children_under_5: requiredNumber("Children under 5", { min: 0, int: true }),
    members_over_65: requiredNumber("Members over 65", { min: 0, int: true }),
    female_headed: z.boolean(),
    single_caregiver: z.boolean(),
    education_head: optionalEnum(EDUCATION_LEVELS),
    literacy_head: z.boolean(),
    roof_material: optionalEnum(ROOF_MATERIALS),
    wall_material: optionalEnum(WALL_MATERIALS),
    floor_material: optionalEnum(FLOOR_MATERIALS),
    rooms: requiredNumber("Rooms", { min: 0, int: true }),
    tenure: optionalEnum(TENURES),
    water_source: optionalEnum(WATER_SOURCES),
    sanitation_type: optionalEnum(SANITATION_TYPES),
    electricity: z.boolean(),
    cooking_fuel: optionalEnum(COOKING_FUELS),
    asset_phone: z.boolean(),
    asset_radio: z.boolean(),
    asset_tv: z.boolean(),
    asset_fridge: z.boolean(),
    asset_washing_machine: z.boolean(),
    asset_bicycle: z.boolean(),
    asset_motorcycle: z.boolean(),
    asset_car: z.boolean(),
    livestock_count: optionalNumber("Livestock", { min: 0, int: true }),
    land_area: optionalNumber("Land area", { min: 0 }),
    employment_type: optionalEnum(EMPLOYMENT_TYPES),
    earners_count: optionalNumber("Earners", { min: 0, int: true }),
    hours_worked: optionalNumber("Hours worked", { min: 0, max: 168 }),
    monthly_income: requiredNumber("Monthly income", { min: 0 }),
    income_std_12m: optionalNumber("Income variation", { min: 0 }),
    income_seasonality: optionalNumber("Income seasonality", { min: 0 }),
    essential_costs: requiredNumber("Essential costs", { min: 0 }),
    food_security_score: requiredNumber("Food insecurity score", { min: 0, max: 8, int: true }),
    chronic_illness: z.boolean(),
    disability_in_household: z.boolean(),
    dependents_requiring_care: requiredNumber("Dependents requiring care", { min: 0, int: true }),
    shock_bereavement_12m: z.boolean(),
    shock_serious_illness_12m: z.boolean(),
    shock_job_loss_12m: z.boolean(),
    shock_eviction_12m: z.boolean(),
    shock_displacement_12m: z.boolean(),
    shock_disaster_12m: z.boolean(),
    shock_crop_failure_12m: z.boolean(),
  })
  .refine((s) => s.children_under_5 + s.members_over_65 <= s.household_size, {
    message: "Children under 5 plus members over 65 can't exceed the household size",
    path: ["household_size"],
  });

/** AUDIT ONLY: stored separately, never used for scoring or shown to reviewers. */
const protectedSchema = z.object({
  gender_head: optionalText(),
  disability: optionalText(),
  age_band: optionalText(20),
  ethnicity: optionalText(),
  religion: optionalText(),
  nationality: optionalText(),
  immigration_status: optionalText(),
});

export const newHouseholdSchema = z.object({
  area_code: z.string({ error: "Choose an area" }).min(1, "Choose an area"),
  notes: z.string().max(500).optional(),
  survey: surveySchema,
  protected: protectedSchema,
});

export type NewHouseholdInput = z.input<typeof newHouseholdSchema>;
export type NewHouseholdValues = z.output<typeof newHouseholdSchema>;
