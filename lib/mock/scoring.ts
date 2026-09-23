import "server-only";
import type { Application, DecisionBand, FundingCycle, ModelScore, ShapFeatures } from "@/types";
import { area, db, household, latestSurvey } from "./db";

// Stand-in for `python -m backend.ml score` until the API is connected.
// Linear need index (0-100) so contributions can double as SHAP values,
// then allocate() from the design doc. Never reads protected attributes.

export const MOCK_MODEL_VERSION = "rules-v0-mock";
const RANDOM_AUDIT_RATE = 0.04;

/** Feature weights, in need-index points per standard deviation. */
const WEIGHTS: Record<string, number> = {
  deficit_ratio: 9,
  food_security_score: 7,
  shock_count_12m: 5,
  dependency_ratio: 4,
  crowding: 3,
  asset_index: -5, // more assets -> less need
  area_deprivation_index: 3,
  income_volatility: 2,
  dependents_requiring_care: 2,
};

type FeatureRow = Record<keyof typeof WEIGHTS, number>;

function features(app: Application): FeatureRow | null {
  const s = latestSurvey(app.household_id);
  if (!s) return null;
  const hh = household(app.household_id);
  const ar = hh ? area(hh.area_code) : undefined;
  const income = s.monthly_income ?? 0;
  const costs = s.essential_costs ?? 0;
  const deficit = costs - income;
  const assets = [
    s.asset_phone,
    s.asset_radio,
    s.asset_tv,
    s.asset_fridge,
    s.asset_washing_machine,
    s.asset_bicycle,
    s.asset_motorcycle,
    s.asset_car,
  ].filter(Boolean).length;
  const shocks = [
    s.shock_bereavement_12m,
    s.shock_serious_illness_12m,
    s.shock_job_loss_12m,
    s.shock_eviction_12m,
    s.shock_displacement_12m,
    s.shock_disaster_12m,
    s.shock_crop_failure_12m,
  ].filter(Boolean).length;
  return {
    deficit_ratio: deficit / Math.max(costs, 1),
    food_security_score: s.food_security_score ?? 0,
    shock_count_12m: shocks,
    dependency_ratio: (s.children_under_5 + s.members_over_65) / Math.max(s.household_size, 1),
    crowding: s.household_size / Math.max(s.rooms ?? 1, 1),
    asset_index: assets,
    area_deprivation_index: ar?.area_deprivation_index ?? 0,
    income_volatility: (s.income_std_12m ?? 0) / Math.max(income, 1),
    dependents_requiring_care: s.dependents_requiring_care ?? 0,
  };
}

// Standardisation stats over every surveyed application, cached per db version.
let statsVersion = -1;
let stats: Record<string, { mean: number; sd: number }> = {};

function ensureStats() {
  if (statsVersion === db.version) return;
  const rows = db.applications.map(features).filter((r): r is FeatureRow => r !== null);
  stats = {};
  for (const key of Object.keys(WEIGHTS)) {
    const vals = rows.map((r) => r[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
    stats[key] = { mean, sd };
  }
  statsVersion = db.version;
}

function scoreOne(app: Application) {
  ensureStats();
  const f = features(app);
  if (!f) return null;
  const contributions: ShapFeatures = Object.entries(WEIGHTS).map(([key, w]) => {
    const z = (f[key] - stats[key].mean) / stats[key].sd;
    return [key, Math.max(-25, Math.min(25, w * z))];
  });
  const mid = Math.max(0, Math.min(100, 50 + contributions.reduce((a, [, c]) => a + c, 0)));
  // Wider interval where the model knows less: incomplete applications,
  // missing documentation, first-time applicants.
  const halfWidth =
    4 +
    8 * (1 - (app.application_completeness ?? 0.5)) +
    (app.documentation_provided ? 0 : 2) +
    (app.prior_applications_count === 0 ? 2 : 0);
  contributions.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return {
    need_lo: round(Math.max(0, mid - halfWidth)),
    need_mid: round(mid),
    need_hi: round(Math.min(100, mid + halfWidth)),
    top_shap_features: contributions.slice(0, 5).map(([k, v]) => [k, round(v)]) as ShapFeatures,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

// Seeded so the audit sample is the same every run.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function allocateCycle(cycle: FundingCycle, scoredAt: string, scoreIdStart: number) {
  const apps = db.applications.filter(
    (a) => a.cycle_id === cycle.cycle_id && a.status !== "withdrawn",
  );
  const scored = apps
    .map((a) => ({ app: a, s: scoreOne(a) }))
    .filter((x): x is { app: Application; s: NonNullable<ReturnType<typeof scoreOne>> } => !!x.s)
    .sort((a, b) => b.s.need_mid - a.s.need_mid);

  let cum = 0;
  let cutoffIdx = 0;
  for (const x of scored) {
    cum += x.app.amount_requested;
    if (cum <= cycle.budget_total) cutoffIdx += 1;
  }
  const cutoff = scored.length ? scored[Math.min(cutoffIdx, scored.length - 1)].s.need_mid : 0;

  const bands = scored.map((x): DecisionBand =>
    x.s.need_lo > cutoff ? "auto_approve" : x.s.need_hi < cutoff ? "defer" : "human_review",
  );

  // Audit sample stays inside allocate() so it can't be turned off separately.
  const deferredIdx = bands.flatMap((b, i) => (b === "defer" ? [i] : []));
  const nAudit = Math.round(deferredIdx.length * RANDOM_AUDIT_RATE);
  const rng = mulberry32(cycle.cycle_id * 7919);
  for (let k = 0; k < nAudit; k++) {
    const j = k + Math.floor(rng() * (deferredIdx.length - k));
    [deferredIdx[k], deferredIdx[j]] = [deferredIdx[j], deferredIdx[k]];
    bands[deferredIdx[k]] = "audit_approve";
  }

  return scored.map(
    (x, i): ModelScore => ({
      score_id: scoreIdStart + i,
      application_id: x.app.application_id,
      cycle_id: cycle.cycle_id,
      model_version: MOCK_MODEL_VERSION,
      need_lo: x.s.need_lo,
      need_mid: x.s.need_mid,
      need_hi: x.s.need_hi,
      cutoff: round(cutoff),
      band: bands[i],
      top_shap_features: x.s.top_shap_features,
      scored_at: scoredAt,
    }),
  );
}
