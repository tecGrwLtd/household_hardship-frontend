import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Alert, Card, Tag } from "antd";
import { getApplication } from "@/lib/api/applications";
import { leanOf } from "@/lib/api/reviews";
import { getSessionUser } from "@/lib/auth/session";
import { recordAppealAction } from "@/lib/actions";
import {
  BAND_DESCRIPTIONS,
  BENEFICIARY_LABELS,
  CHANNEL_LABELS,
  NEED_CATEGORY_LABELS,
  REPEAT_LABELS,
  cycleLabel,
  formatDate,
  formatMoney,
  formatPercent,
  humanize,
} from "@/lib/labels";
import { BandBadge, StatusBadge } from "@/components/Badges";
import { NeedInterval } from "@/components/decision/NeedInterval";
import { Reasons } from "@/components/decision/Reasons";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { ActionButton } from "@/components/forms/ActionButton";
import { PageHeader } from "@/components/PageHeader";

export async function generateMetadata(props: PageProps<"/applications/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Application #${id}` };
}

export default async function ApplicationPage(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const data = await getApplication(Number(id));
  if (!data) notFound();
  const user = await getSessionUser();
  const { application: a, cycle, score, survey, area } = data;
  const currency = cycle.budget_currency;
  const waiting = a.status === "in_review" || a.status === "appealed";
  const deficit =
    survey && survey.essential_costs !== null && survey.monthly_income !== null
      ? survey.essential_costs - survey.monthly_income
      : null;
  const shocks = survey
    ? Object.entries(survey).filter(([k, v]) => k.startsWith("shock_") && v === true).map(([k]) => k)
    : [];
  const assets = survey
    ? Object.entries(survey).filter(([k, v]) => k.startsWith("asset_") && v === true).map(([k]) => k.slice(6))
    : [];

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/applications", label: "Applications" }, { label: `#${a.application_id}` }]}
        title={`Application #${a.application_id}`}
        extra={<StatusBadge status={a.status} />}
        description={`${NEED_CATEGORY_LABELS[a.need_category]} · ${cycleLabel(cycle)}`}
      />

      {created === "1" && (
        <Alert
          className="mb-6"
          type="success"
          showIcon
          title="Application saved"
          description={`It gets a need score and band when an admin runs the allocation for ${cycleLabel(cycle)}.`}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Model recommendation" extra={<BandBadge band={score?.band} />}>
            {score ? (
              <>
                <NeedInterval score={score} />
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <Fact label="Need score" value={score.need_mid.toFixed(1)} />
                  <Fact label="80% interval" value={`${score.need_lo.toFixed(1)}–${score.need_hi.toFixed(1)}`} />
                  <Fact label="Cycle cutoff" value={score.cutoff.toFixed(1)} />
                  <Fact label="Model lean" value={leanOf(score) === "approve" ? "Approve" : "Defer"} />
                </dl>
                <p className="mt-5 text-muted-foreground">{BAND_DESCRIPTIONS[score.band]}</p>
                <p className="mt-2 text-muted-foreground">
                  The cutoff depends on this cycle&apos;s budget and who else applied.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {score.model_version} · scored {formatDate(score.scored_at)}
                  {data.scoreHistory.length > 1 && ` · ${data.scoreHistory.length} scores on record`}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Not scored yet. It will be ranked when the allocation for {cycleLabel(cycle)} runs.
              </p>
            )}
          </Card>

          {score && (
            <Card title="Main reasons for this score">
              <p className="mb-5 text-muted-foreground">Points added to or taken off the need score.</p>
              <Reasons features={score.top_shap_features} values={featureValues(survey, area?.area_deprivation_index ?? null)} />
            </Card>
          )}

          {a.status === "deferred" && (
            <Card title="Deferred, not refused">
              <p className="mb-4 text-muted-foreground">
                The applicant can appeal; appeals go to the review queue.
              </p>
              <ActionButton
                action={recordAppealAction.bind(null, a.application_id)}
                label="Record an appeal"
                pendingLabel="Recording…"
                variant="outline"
                confirm="Record that the applicant has appealed? The application will go to the review queue."
              />
            </Card>
          )}

          <Card title={waiting ? "Your decision" : "Review history"}>
            {waiting && score && user?.role === "caseworker" && (
              <ReviewForm
                applicationId={a.application_id}
                isAppeal={a.status === "appealed"}
                lean={leanOf(score)}
                amountRequested={a.amount_requested}
                currency={currency}
              />
            )}
            {waiting && user?.role !== "caseworker" && (
              <p className="text-muted-foreground">
                Waiting for a caseworker. Log in with a caseworker account to record a decision.
              </p>
            )}
            {!waiting && data.reviews.length === 0 && (
              <p className="text-muted-foreground">No human review on record for this application.</p>
            )}
            {data.reviews.length > 0 && (
              <ul className={waiting ? "mt-6 divide-y divide-border border-t border-border" : "divide-y divide-border"}>
                {data.reviews.map((r) => (
                  <li key={r.review_id} className="py-3">
                    <p>
                      <span className="font-medium">{humanize(r.final_decision)}</span> by {r.caseworker_name} ·{" "}
                      {formatDate(r.reviewed_at)}
                      {r.overridden && (
                        <Tag color="purple" variant="filled" className="ml-2">
                          Override
                        </Tag>
                      )}
                    </p>
                    {r.notes && <p className="mt-1 text-muted-foreground">{r.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Application">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact label="Amount requested" value={formatMoney(a.amount_requested, currency)} />
              <Fact label="Stated need" value={formatMoney(a.stated_need_amount, currency)} />
              <Fact label="Submitted" value={formatDate(a.submitted_at)} />
              <Fact
                label="Days since hardship began"
                value={a.days_since_hardship_onset?.toLocaleString() ?? "—"}
              />
              <Fact label="Channel" value={a.application_channel ? CHANNEL_LABELS[a.application_channel] : "—"} />
              <Fact label="Referral source" value={humanize(a.referral_source)} />
              <Fact label="Completeness" value={formatPercent(a.application_completeness)} />
              <Fact label="Documents provided" value={a.documentation_provided ? "Yes" : "No"} />
              <Fact label="Applied before" value={REPEAT_LABELS[data.repeat.repeat_bucket]} />
              <Fact label="Helped before" value={BENEFICIARY_LABELS[data.repeat.beneficiary_bucket]} />
              <Fact label="Submitted by" value={data.submittedBy ?? "Applicant"} />
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card
            title="Household"
            extra={
              <Link href={`/households/${a.household_id}`} className="text-sm font-medium">
                View household
              </Link>
            }
          >
            {survey ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Fact label="Area" value={area ? `${area.area_name} (${area.urban_rural})` : "—"} />
                <Fact label="Surveyed" value={formatDate(survey.survey_date)} />
                <Fact
                  label="Members"
                  value={`${survey.household_size} (${survey.children_under_5} under 5, ${survey.members_over_65} over 65)`}
                />
                <Fact label="Rooms" value={survey.rooms ?? "—"} />
                <Fact label="Monthly income" value={formatMoney(survey.monthly_income, currency)} />
                <Fact label="Essential costs" value={formatMoney(survey.essential_costs, currency)} />
                <Fact label="Monthly shortfall" value={deficit !== null ? formatMoney(Math.max(0, deficit), currency) : "—"} />
                <Fact label="Food insecurity (0–8)" value={survey.food_security_score ?? "—"} />
                <Fact label="Employment" value={humanize(survey.employment_type)} />
                <Fact label="Tenure" value={humanize(survey.tenure)} />
                <Fact
                  label="Shocks, last 12 months"
                  value={shocks.length ? shocks.map((s) => humanize(s.replace("shock_", "").replace("_12m", ""))).join(", ") : "None"}
                />
                <Fact label="Assets" value={assets.length ? assets.map(humanize).join(", ") : "None"} />
              </dl>
            ) : (
              <p className="text-muted-foreground">No survey on record.</p>
            )}
          </Card>

          <Card title="Awards">
            {data.awards.length ? (
              <ul className="divide-y divide-border">
                {data.awards.map((w) => (
                  <li key={w.award_id} className="flex justify-between py-2">
                    <span>{formatDate(w.award_date)}</span>
                    <span className="tabular-nums">{formatMoney(w.award_amount, currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No award for this application.</p>
            )}
          </Card>

          <Card title="Other applications from this household">
            {data.otherApplications.length ? (
              <ul className="divide-y divide-border">
                {data.otherApplications.slice(0, 8).map((o) => (
                  <li key={o.application_id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/applications/${o.application_id}`} className="font-medium">
                      #{o.application_id}
                    </Link>
                    <span className="text-muted-foreground">{formatDate(o.submitted_at)}</span>
                    <span className="flex-1 truncate">{NEED_CATEGORY_LABELS[o.need_category]}</span>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">This is the household&apos;s first application.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/** The household's own value for each model feature, shown beside its reason. */
function featureValues(
  s: NonNullable<Awaited<ReturnType<typeof getApplication>>>["survey"],
  deprivation: number | null,
): Record<string, string> {
  if (!s) return {};
  const income = s.monthly_income ?? 0;
  const costs = s.essential_costs ?? 0;
  const count = (prefix: string) => Object.entries(s).filter(([k, v]) => k.startsWith(prefix) && v === true).length;
  return {
    deficit_ratio: costs > 0 ? `Income covers ${formatPercent(Math.min(income / costs, 9.99))} of essential costs` : "No costs recorded",
    food_security_score: `${s.food_security_score ?? "—"} of 8`,
    shock_count_12m: `${count("shock_")} shock${count("shock_") === 1 ? "" : "s"}`,
    dependency_ratio: `${s.children_under_5 + s.members_over_65} of ${s.household_size} members`,
    crowding: s.rooms ? `${(s.household_size / s.rooms).toFixed(1)} people per room` : "Rooms not recorded",
    asset_index: `Owns ${count("asset_")} of 8 listed assets`,
    area_deprivation_index: deprivation !== null ? `Index ${deprivation.toFixed(2)}` : "—",
    income_volatility:
      s.income_std_12m !== null && income > 0 ? `Varies by ${formatPercent(s.income_std_12m / income)} month to month` : "—",
    dependents_requiring_care: `${s.dependents_requiring_care} dependent${s.dependents_requiring_care === 1 ? "" : "s"}`,
  };
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
