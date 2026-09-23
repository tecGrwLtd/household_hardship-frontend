// Mirrors db/schema.sql and db/views.sql from the backend one-to-one.
// Field names stay snake_case so API responses can be used as-is.

// Enums

export type UrbanRural = "urban" | "rural";

export type Tenure = "owned" | "mortgaged" | "private_rent" | "social" | "informal" | "temporary";

export type EmploymentType =
  | "formal"
  | "informal"
  | "self_employed"
  | "unemployed"
  | "unable_to_work";

export type EducationLevel = "none" | "primary" | "secondary" | "vocational" | "tertiary";

export type NeedCategory =
  | "rent_arrears"
  | "medical"
  | "utilities"
  | "food"
  | "funeral"
  | "childcare"
  | "education"
  | "other";

export type ApplicationChannel = "online" | "phone" | "in_person" | "caseworker_submitted";

export type ApplicationStatus =
  | "submitted"
  | "in_review"
  | "auto_approved"
  | "audit_approved"
  | "deferred"
  | "appealed"
  | "withdrawn"
  | "awarded"
  | "closed";

export type DecisionBand = "auto_approve" | "human_review" | "defer" | "audit_approve";

/** Grouping of need categories used by v_monthly_support (support_group() in views.sql). */
export type SupportGroup = "education" | "health" | "financial" | "bereavement";

// Tables

export interface AreaReference {
  area_code: string;
  area_name: string;
  urban_rural: UrbanRural;
  area_deprivation_index: number | null;
  area_poverty_rate: number | null;
  distance_to_services_km: number | null;
  local_unemployment_rate: number | null;
  local_housing_cost_index: number | null;
}

export interface FundingCycle {
  cycle_id: number;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  budget_total: number;
  budget_currency: string;
  notes: string | null;
}

export interface Caseworker {
  caseworker_id: number;
  display_name: string;
  region: string | null;
  active: boolean;
}

export interface Household {
  household_id: string;
  area_code: string;
  registered_at: string;
  notes: string | null;
}

export interface HouseholdSurvey {
  household_id: string;
  survey_date: string;
  household_size: number;
  children_under_5: number;
  members_over_65: number;
  female_headed: boolean | null;
  single_caregiver: boolean | null;
  education_head: EducationLevel | null;
  literacy_head: boolean | null;
  roof_material: string | null;
  wall_material: string | null;
  floor_material: string | null;
  rooms: number | null;
  tenure: Tenure | null;
  water_source: string | null;
  sanitation_type: string | null;
  electricity: boolean | null;
  cooking_fuel: string | null;
  asset_phone: boolean;
  asset_radio: boolean;
  asset_tv: boolean;
  asset_fridge: boolean;
  asset_washing_machine: boolean;
  asset_bicycle: boolean;
  asset_motorcycle: boolean;
  asset_car: boolean;
  livestock_count: number | null;
  land_area: number | null;
  employment_type: EmploymentType | null;
  earners_count: number | null;
  hours_worked: number | null;
  monthly_income: number | null;
  income_std_12m: number | null;
  income_seasonality: number | null;
  essential_costs: number | null;
  food_security_score: number | null;
  chronic_illness: boolean | null;
  disability_in_household: boolean | null;
  dependents_requiring_care: number;
  shock_bereavement_12m: boolean;
  shock_serious_illness_12m: boolean;
  shock_job_loss_12m: boolean;
  shock_eviction_12m: boolean;
  shock_displacement_12m: boolean;
  shock_disaster_12m: boolean;
  shock_crop_failure_12m: boolean;
  /** Ground-truth welfare measure. Audit/evaluation only; never shown next to a decision. */
  consumption_pc: number | null;
}

/** AUDIT ONLY. Used for disparate-impact reporting; never shown next to a score or decision. */
export interface ProtectedAttributes {
  household_id: string;
  ethnicity: string | null;
  gender_head: string | null;
  disability: string | null;
  age_band: string | null;
  religion: string | null;
  nationality: string | null;
  immigration_status: string | null;
}

export interface Application {
  application_id: number;
  household_id: string;
  cycle_id: number;
  caseworker_id: number | null;
  submitted_at: string;
  amount_requested: number;
  need_category: NeedCategory;
  stated_need_amount: number | null;
  days_since_hardship_onset: number | null;
  prior_applications_count: number;
  days_since_last_application: number | null;
  referral_source: string | null;
  application_channel: ApplicationChannel | null;
  application_completeness: number | null;
  documentation_provided: boolean | null;
  status: ApplicationStatus;
}

/** [feature_name, shap_value] pairs, largest absolute contribution first. */
export type ShapFeatures = [string, number][];

export interface ModelScore {
  score_id: number;
  application_id: number;
  cycle_id: number;
  model_version: string;
  need_lo: number;
  need_mid: number;
  need_hi: number;
  cutoff: number;
  band: DecisionBand;
  top_shap_features: ShapFeatures | null;
  scored_at: string;
}

export type FinalDecision = "approved" | "denied" | "deferred" | "appeal_upheld" | string;

export interface ApplicationReview {
  review_id: number;
  application_id: number;
  caseworker_id: number;
  reviewed_at: string;
  initial_band: DecisionBand;
  final_decision: FinalDecision;
  overridden: boolean;
  notes: string | null;
}

export interface Award {
  award_id: number;
  application_id: number;
  household_id: string;
  award_amount: number;
  award_date: string;
  need_category: NeedCategory;
  outcome_followup_days: number | null;
}

export interface FairnessAudit {
  cycle_id: number;
  attribute: string;
  group_value: string;
  n: number;
  exclusion_error: number;
  gap_vs_best: number;
}

// Views

export interface MonthlySupportRow {
  month: string; // YYYY-MM-01
  support_group: SupportGroup;
  applicant_count: number;
  helped_before_count: number;
  helped_within_1y_count: number;
  helped_over_1y_count: number;
  awarded_count: number;
}

export interface MonthlyApplicationsRow {
  month: string;
  need_category: NeedCategory;
  support_group: SupportGroup;
  applicant_count: number;
  auto_approved_count: number;
  human_review_count: number;
  deferred_count: number;
  audit_approved_count: number;
}

export type RepeatBucket = "first_time" | "repeat_within_1y" | "repeat_over_1y" | "unknown";
export type BeneficiaryBucket = "never_helped" | "helped_within_1y" | "helped_over_1y";

export interface RepeatSupportRow {
  application_id: number;
  household_id: string;
  submitted_at: string;
  need_category: NeedCategory;
  prior_applications_count: number;
  days_since_last_application: number | null;
  is_repeat_applicant: boolean;
  repeat_bucket: RepeatBucket;
  beneficiary_bucket: BeneficiaryBucket;
}

export interface CycleSummaryRow {
  cycle_id: number;
  period_start: string;
  period_end: string;
  budget_total: number;
  budget_currency: string;
  total_applications: number;
  total_households: number;
  repeat_applications: number;
  total_awarded: number;
}

// App-level

export type UserRole = "admin" | "caseworker";

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  /** Set for caseworkers so reviews can record caseworker_id. */
  caseworker_id: number | null;
}

export interface ModelVersion {
  model_version: string;
  kind: "rule_based" | "trained";
  active: boolean;
  created_at: string;
  notes: string;
}
