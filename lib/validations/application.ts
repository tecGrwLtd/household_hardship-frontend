import { z } from "zod";
import { optionalEnum, optionalNumber, requiredNumber } from "./shared";

export const NEED_CATEGORIES = [
  "rent_arrears",
  "medical",
  "utilities",
  "food",
  "funeral",
  "childcare",
  "education",
  "other",
] as const;

export const CHANNELS = ["online", "phone", "in_person", "caseworker_submitted"] as const;

/** Values seen in the backend's seed data. */
export const REFERRAL_SOURCES = [
  "self",
  "ngo_partner",
  "caseworker_outreach",
  "community_leader",
  "prior_beneficiary",
] as const;

export const newApplicationSchema = z.object({
  household_id: z.uuid("Enter a valid household ID"),
  need_category: z.enum(NEED_CATEGORIES, { error: "Choose a need category" }),
  amount_requested: requiredNumber("Amount requested", { min: 1 }),
  stated_need_amount: optionalNumber("Stated need", { min: 0 }),
  days_since_hardship_onset: optionalNumber("Days since hardship began", { min: 0, int: true }),
  referral_source: optionalEnum(REFERRAL_SOURCES),
  application_channel: z.enum(CHANNELS, { error: "Choose how the application came in" }),
  documentation_provided: z.boolean(),
});

export type NewApplicationInput = z.input<typeof newApplicationSchema>;
export type NewApplicationValues = z.output<typeof newApplicationSchema>;
