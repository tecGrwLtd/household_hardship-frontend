import type {
  ApplicationChannel,
  ApplicationStatus,
  BeneficiaryBucket,
  DecisionBand,
  NeedCategory,
  RepeatBucket,
  SupportGroup,
} from "@/types";

// Display labels and formatting shared by server and client code.

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  rent_arrears: "Rent arrears",
  medical: "Medical",
  utilities: "Utilities",
  food: "Food",
  funeral: "Funeral",
  childcare: "Childcare",
  education: "Education",
  other: "Other",
};

/**
 * Must match support_group() at the top of the backend's db/views.sql.
 * TODO: confirm childcare's group with the backend team.
 */
export function supportGroup(category: NeedCategory): SupportGroup {
  switch (category) {
    case "education":
    case "childcare":
      return "education";
    case "medical":
      return "health";
    case "funeral":
      return "bereavement";
    default:
      return "financial";
  }
}

export const SUPPORT_GROUPS: SupportGroup[] = ["education", "health", "financial", "bereavement"];

export const SUPPORT_GROUP_LABELS: Record<SupportGroup, string> = {
  education: "Education",
  health: "Health",
  financial: "Financial",
  bereavement: "Bereavement",
};

export const BANDS: DecisionBand[] = ["auto_approve", "audit_approve", "human_review", "defer"];

export const BAND_LABELS: Record<DecisionBand, string> = {
  auto_approve: "Auto-approve",
  audit_approve: "Audit approve",
  human_review: "Human review",
  defer: "Defer",
};

export const BAND_DESCRIPTIONS: Record<DecisionBand, string> = {
  auto_approve: "Lower bound of the interval is above the cutoff.",
  audit_approve: "Below the cutoff, approved at random as part of the 4% audit sample.",
  human_review: "Interval straddles the cutoff. A caseworker decides.",
  defer: "Upper bound is below the cutoff. Deferred with an appeal route, never a final refusal.",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  in_review: "In review",
  auto_approved: "Auto-approved",
  audit_approved: "Audit approved",
  deferred: "Deferred",
  appealed: "Appealed",
  withdrawn: "Withdrawn",
  awarded: "Awarded",
  closed: "Closed",
};

export const CHANNEL_LABELS: Record<ApplicationChannel, string> = {
  online: "Online",
  phone: "Phone",
  in_person: "In person",
  caseworker_submitted: "Caseworker-submitted",
};

export const REPEAT_LABELS: Record<RepeatBucket, string> = {
  first_time: "First-time",
  repeat_within_1y: "Repeat, within 1 year",
  repeat_over_1y: "Repeat, over 1 year",
  unknown: "Repeat, date unknown",
};

export const BENEFICIARY_LABELS: Record<BeneficiaryBucket, string> = {
  never_helped: "Never helped",
  helped_within_1y: "Helped within 1 year",
  helped_over_1y: "Helped over 1 year ago",
};

/** Plain-language names for model features shown as decision reasons. */
export const FEATURE_LABELS: Record<string, string> = {
  deficit_ratio: "Shortfall between income and essential costs",
  monthly_deficit: "Monthly shortfall",
  food_security_score: "Food insecurity score",
  shock_count_12m: "Shocks in the last 12 months",
  dependency_ratio: "Children under 5 and adults over 65",
  crowding: "People per room",
  asset_index: "Household assets",
  area_deprivation_index: "Area deprivation",
  income_volatility: "Income volatility",
  dependents_requiring_care: "Dependents needing care",
  request_closes_gap: "Request closes the gap",
};

export const AUDIT_ATTRIBUTE_LABELS: Record<string, string> = {
  gender_head: "Gender of household head",
  disability: "Disability",
  age_band: "Age band",
  ethnicity: "Ethnicity",
  religion: "Religion",
  nationality: "Nationality",
  urban_rural: "Urban / rural",
  need_category: "Need category",
  application_channel: "Application channel",
  referral_source: "Referral source",
};

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatMoney(amount: number | null | undefined, currency = "RWF") {
  if (amount === null || amount === undefined) return "—";
  return `${Math.round(amount).toLocaleString("en-US")} ${currency}`;
}

export function formatCompactMoney(amount: number, currency = "RWF") {
  const abs = Math.abs(amount);
  const v =
    abs >= 1e6 ? `${(amount / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M` : abs >= 1e3 ? `${Math.round(amount / 1e3)}K` : `${Math.round(amount)}`;
  return `${v} ${currency}`;
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(iso: string) {
  return new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function cycleLabel(c: { cycle_id: number; period_start: string }) {
  return `Cycle ${c.cycle_id} · ${formatMonth(c.period_start)}`;
}
