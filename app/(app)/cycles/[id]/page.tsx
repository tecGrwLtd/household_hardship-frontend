import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Alert, Card } from "antd";
import { getCycleDetail } from "@/lib/api/cycles";
import { getSessionUser } from "@/lib/auth/session";
import { runAllocationAction } from "@/lib/actions";
import {
  BAND_DESCRIPTIONS,
  BAND_LABELS,
  BANDS,
  NEED_CATEGORY_LABELS,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
} from "@/lib/labels";
import { BAND_COLOR_VAR, BandBadge, StatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { Meter, StatTile } from "@/components/StatTile";
import { ShareBar } from "@/components/charts/ShareBar";
import { ActionButton } from "@/components/forms/ActionButton";
import { NeedInterval } from "@/components/decision/NeedInterval";
import { DataTable } from "@/components/DataTable";

export async function generateMetadata(props: PageProps<"/cycles/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Cycle ${id}` };
}

const SHOWN = 50;

export default async function CyclePage(props: PageProps<"/cycles/[id]">) {
  const { id } = await props.params;
  const [detail, user] = await Promise.all([getCycleDetail(Number(id)), getSessionUser()]);
  if (!detail) notFound();
  const { summary: s, ranked, bandCounts } = detail;
  const currency = s.budget_currency;
  const cutoffRank = ranked.findIndex((r) => r.score.need_mid <= (detail.cutoff ?? 0));
  const automated = (bandCounts.auto_approve + bandCounts.defer) / Math.max(ranked.length, 1);

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/cycles", label: "Funding cycles" }, { label: formatMonth(s.period_start) }]}
        title={`Cycle ${s.cycle_id} · ${formatMonth(s.period_start)}`}
        description={`${formatDate(s.period_start)} – ${formatDate(s.period_end)}`}
        actions={
          user?.role === "admin" ? (
            <ActionButton
              action={runAllocationAction.bind(null, s.cycle_id)}
              label="Run allocation"
              pendingLabel="Running…"
              confirm="Re-rank every application in this cycle against its budget? New applications will move into their bands."
            />
          ) : undefined
        }
      />

      {detail.awaitingAllocation > 0 && (
        <Alert
          className="mb-6"
          type="warning"
          showIcon
          title={`${detail.awaitingAllocation} new application${detail.awaitingAllocation === 1 ? " is" : "s are"} waiting for the allocation to run.`}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Budget" value={formatMoney(s.budget_total, currency)} detail="Fixed for this cycle" />
        <StatTile
          label="Awarded"
          value={formatMoney(s.total_awarded, currency)}
          detail={`${formatPercent(s.total_awarded / s.budget_total)} of the budget`}
        >
          <Meter value={s.total_awarded} max={s.budget_total} label="Share of budget awarded" />
        </StatTile>
        <StatTile
          label="Applications"
          value={s.total_applications.toLocaleString()}
          detail={`${s.total_households.toLocaleString()} households · ${s.repeat_applications} repeat`}
          href={`/applications?cycle=${s.cycle_id}`}
        />
        <StatTile
          label="Need-score cutoff"
          value={detail.cutoff !== null ? detail.cutoff.toFixed(1) : "—"}
          detail={detail.model_version ? `${detail.model_version} · ${formatDate(detail.scored_at)}` : "Not scored"}
        />
      </div>

      <Card className="mt-6" title="Decision bands">
        <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-muted-foreground">
            {formatPercent(automated)} decided automatically.
          </p>
          <ShareBar
            label="Applications by band"
            series={BANDS.map((b) => ({ key: b, label: BAND_LABELS[b], color: BAND_COLOR_VAR[b] }))}
            values={bandCounts}
          />
        </div>
        <dl className="flex flex-col gap-4">
          {BANDS.map((b) => (
            <div key={b}>
              <dt>
                <BandBadge band={b} />
              </dt>
              <dd className="mt-0.5 text-muted-foreground">{BAND_DESCRIPTIONS[b]}</dd>
            </div>
          ))}
        </dl>
        </div>
      </Card>

      <Card
        className="mt-6"
        title="Ranking"
        extra={
          <Link href={`/applications?cycle=${s.cycle_id}`} className="text-sm font-medium">
            All {ranked.length.toLocaleString()} ranked applications
          </Link>
        }
      >
        <p className="mb-4 text-muted-foreground">Band comes from the current model; status is the recorded decision.</p>
        <DataTable
          minWidth={900}
          highlightKey={cutoffRank >= 0 ? ranked[cutoffRank]?.application.application_id : undefined}
          highlightTitle="Budget cutoff falls here"
          columns={[
            { key: "rank", title: "Rank", align: "right", width: 80 },
            { key: "id", title: "Application" },
            { key: "need", title: "Need" },
            { key: "requested", title: "Requested", align: "right" },
            { key: "score", title: "Score vs cutoff" },
            { key: "band", title: "Band" },
            { key: "status", title: "Status" },
          ]}
          rows={ranked.slice(0, SHOWN).map((r) => ({
            key: r.application.application_id,
            rank: <span className="text-muted-foreground tabular-nums">{r.rank}</span>,
            id: (
              <Link href={`/applications/${r.application.application_id}`} className="font-medium">
                #{r.application.application_id}
              </Link>
            ),
            need: NEED_CATEGORY_LABELS[r.application.need_category],
            requested: (
              <span className="whitespace-nowrap tabular-nums">{formatMoney(r.application.amount_requested, currency)}</span>
            ),
            score: <NeedInterval score={r.score} compact />,
            band: <BandBadge band={r.score.band} />,
            status: <StatusBadge status={r.application.status} />,
          }))}
        />
        {ranked.length > SHOWN && (
          <p className="mt-3 text-sm text-muted-foreground">
            Showing the top {SHOWN}. The thick line marks where the budget runs out
            {cutoffRank >= SHOWN || cutoffRank < 0 ? " (further down the list)" : ""}.
          </p>
        )}
      </Card>
    </>
  );
}
