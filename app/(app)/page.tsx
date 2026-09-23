import Link from "next/link";
import { Card } from "antd";
import {
  getCycleSummaries,
  getMonthlyApplications,
  getMonthlySupport,
  getOverrideStats,
  getRepeatSupportSummary,
} from "@/lib/api/dashboard";
import { getCurrentCycle } from "@/lib/api/reference";
import { getReviewQueue } from "@/lib/api/reviews";
import {
  BAND_LABELS,
  BANDS,
  BENEFICIARY_LABELS,
  REPEAT_LABELS,
  SUPPORT_GROUP_LABELS,
  SUPPORT_GROUPS,
  cycleLabel,
  formatCompactMoney,
  formatMoney,
  formatMonth,
  formatPercent,
} from "@/lib/labels";
import { BAND_COLOR_VAR } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { Meter, StatTile } from "@/components/StatTile";
import { StackedColumns, type ColumnDatum } from "@/components/charts/StackedColumns";
import { ShareBar } from "@/components/charts/ShareBar";

const SUPPORT_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export default async function DashboardPage() {
  const cycle = await getCurrentCycle();
  const [support, monthlyApps, summaries, repeat, overrides, queue] = await Promise.all([
    getMonthlySupport(),
    getMonthlyApplications(),
    getCycleSummaries(),
    getRepeatSupportSummary(cycle.cycle_id),
    getOverrideStats(),
    getReviewQueue(cycle.cycle_id),
  ]);
  const current = summaries.find((s) => s.cycle_id === cycle.cycle_id)!;
  const currency = cycle.budget_currency;

  // v_monthly_support -> one column per month, stacked by support group.
  const months = [...new Set(support.map((r) => r.month))].sort();
  const supportColumns: ColumnDatum[] = months.map((m) => {
    const values: Record<string, number> = {};
    support.filter((r) => r.month === m).forEach((r) => (values[r.support_group] = r.applicant_count));
    return { label: formatMonth(m).replace(" 20", " ’"), title: formatMonth(m), values };
  });
  const thisMonth = support.filter((r) => r.month === cycle.period_start.slice(0, 8) + "01");

  // v_monthly_applications -> band mix per month.
  const bandColumns: ColumnDatum[] = months.map((m) => {
    const rows = monthlyApps.filter((r) => r.month === m);
    const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + Number(r[k]), 0);
    return {
      label: formatMonth(m).replace(" 20", " ’"),
      title: formatMonth(m),
      values: {
        auto_approve: sum("auto_approved_count"),
        audit_approve: sum("audit_approved_count"),
        human_review: sum("human_review_count"),
        defer: sum("deferred_count"),
      },
    };
  });

  const lowOverride = overrides.override_rate !== null && overrides.override_rate < 0.05;

  return (
    <>
      <PageHeader title="Dashboard" description={`Current cycle: ${cycleLabel(cycle)}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Applications this cycle"
          value={current.total_applications.toLocaleString()}
          detail={`${current.total_households.toLocaleString()} households · ${formatPercent(
            current.repeat_applications / Math.max(current.total_applications, 1),
          )} repeat applicants`}
          href={`/applications?cycle=${cycle.cycle_id}`}
        />
        <StatTile
          label="Awarded vs budget"
          value={formatCompactMoney(current.total_awarded, currency)}
          detail={`of ${formatMoney(current.budget_total, currency)} (${formatPercent(
            current.total_awarded / current.budget_total,
          )})`}
          href={`/cycles/${cycle.cycle_id}`}
        >
          <Meter value={current.total_awarded} max={current.budget_total} label="Share of budget awarded" />
        </StatTile>
        <StatTile
          label="Waiting for a caseworker"
          value={queue.length.toLocaleString()}
          detail={`${queue.filter((q) => q.kind === "review").length} in the review band · ${
            queue.filter((q) => q.kind === "appeal").length
          } appeals`}
          href="/review"
        />
        <StatTile
          label="Reviewer override rate"
          value={formatPercent(overrides.override_rate, 1)}
          detail={`${overrides.overrides} of ${overrides.reviews} reviews went against the model's lean`}
          href="/fairness#overrides"
          warning={lowOverride ? "Below 5%: reviews may be a rubber stamp." : undefined}
        />
      </div>

      <Card
        className="mt-6"
        title="Applicants per month, by support group"
        extra={
          <span className="hidden text-sm font-normal text-muted-foreground md:inline">
            This month:{" "}
            {thisMonth.length
              ? SUPPORT_GROUPS.map((g) => {
                  const n = thisMonth.find((r) => r.support_group === g)?.applicant_count ?? 0;
                  return `${n} ${SUPPORT_GROUP_LABELS[g].toLowerCase()}`;
                }).join(" · ")
              : "no applications yet"}
          </span>
        }
      >
        <StackedColumns
          caption="Applicants per month by support group"
          series={SUPPORT_GROUPS.map((g, i) => ({ key: g, label: SUPPORT_GROUP_LABELS[g], color: SUPPORT_COLORS[i] }))}
          data={supportColumns}
        />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Decision bands per month">
          <StackedColumns
            caption="Applications per month by decision band"
            series={BANDS.map((b) => ({ key: b, label: BAND_LABELS[b], color: BAND_COLOR_VAR[b] }))}
            data={bandColumns}
            height={240}
          />
        </Card>

        <Card title="Repeat support this cycle">
          <p className="mb-5 text-sm text-muted-foreground">
            {repeat.total.toLocaleString()} applications in {cycleLabel(cycle)}.
          </p>
          <h3 className="mb-2.5 text-base font-medium">Applied before?</h3>
          <ShareBar
            label="Applications by repeat-applicant status"
            series={[
              { key: "first_time", label: REPEAT_LABELS.first_time, color: "var(--series-1)" },
              { key: "repeat_within_1y", label: REPEAT_LABELS.repeat_within_1y, color: "var(--series-2)" },
              { key: "repeat_over_1y", label: REPEAT_LABELS.repeat_over_1y, color: "var(--series-3)" },
            ]}
            values={repeat.repeat}
          />
          <h3 className="mt-7 mb-2.5 text-base font-medium">Helped before?</h3>
          <ShareBar
            label="Applications by previous awards"
            series={[
              { key: "never_helped", label: BENEFICIARY_LABELS.never_helped, color: "var(--series-1)" },
              { key: "helped_within_1y", label: BENEFICIARY_LABELS.helped_within_1y, color: "var(--series-2)" },
              { key: "helped_over_1y", label: BENEFICIARY_LABELS.helped_over_1y, color: "var(--series-3)" },
            ]}
            values={repeat.beneficiary}
          />
        </Card>
      </div>

      <Card
        className="mt-6"
        title="Recent funding cycles"
        extra={
          <Link href="/cycles" className="text-sm font-medium">
            All cycles
          </Link>
        }
        styles={{ body: { paddingBlock: 8 } }}
      >
        <ul className="divide-y divide-border">
          {[...summaries]
            .reverse()
            .slice(0, 6)
            .map((c) => (
              <li key={c.cycle_id}>
                <Link
                  href={`/cycles/${c.cycle_id}`}
                  className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-center gap-5 rounded-md px-2 py-3 text-base text-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <span className="font-medium">{formatMonth(c.period_start)}</span>
                  <Meter value={c.total_awarded} max={c.budget_total} label={`Cycle ${c.cycle_id} budget used`} className="m-0" />
                  <span className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatPercent(c.total_awarded / c.budget_total)} of budget
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
}
