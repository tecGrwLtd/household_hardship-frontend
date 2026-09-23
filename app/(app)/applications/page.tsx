import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import type { ApplicationChannel, ApplicationStatus, DecisionBand, NeedCategory } from "@/types";
import { listApplications } from "@/lib/api/applications";
import { getFundingCycles } from "@/lib/api/reference";
import {
  BAND_LABELS,
  BANDS,
  CHANNEL_LABELS,
  NEED_CATEGORY_LABELS,
  STATUS_LABELS,
  cycleLabel,
  formatDate,
  formatMoney,
} from "@/lib/labels";
import { LinkButton } from "@/components/LinkButton";
import { DataTable } from "@/components/DataTable";
import { BandBadge, StatusBadge } from "@/components/Badges";
import { FilterSelect } from "@/components/FilterSelect";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { FileSearch } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

export const metadata: Metadata = { title: "Applications" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const sp = await props.searchParams;
  const params = {
    cycle: str(sp.cycle),
    need: str(sp.need),
    band: str(sp.band),
    status: str(sp.status),
    channel: str(sp.channel),
    q: str(sp.q),
    page: str(sp.page),
  };
  const [result, cycles] = await Promise.all([
    listApplications({
      cycle_id: params.cycle ? Number(params.cycle) : undefined,
      need_category: params.need as NeedCategory | undefined,
      band: params.band as DecisionBand | undefined,
      status: params.status as ApplicationStatus | undefined,
      channel: params.channel as ApplicationChannel | undefined,
      q: params.q,
      page: params.page ? Number(params.page) : 1,
    }),
    getFundingCycles(),
  ]);
  const currencyByCycle = new Map(cycles.map((c) => [c.cycle_id, c.budget_currency]));

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          params.cycle
            ? "Sorted by need score, the order the allocation ranked them in."
            : "Newest first. Choose a cycle to see its ranking."
        }
        actions={
          <LinkButton type="primary" size="large" href="/applications/new" icon={<Plus className="size-4" />}>
            New application
          </LinkButton>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <SearchBox placeholder="Application ID or household ID" />
        <FilterSelect
          name="cycle"
          label="Cycle"
          allLabel="All cycles"
          options={cycles.map((c) => ({ value: String(c.cycle_id), label: cycleLabel(c) }))}
        />
        <FilterSelect name="band" label="Band" options={BANDS.map((b) => ({ value: b, label: BAND_LABELS[b] }))} />
        <FilterSelect
          name="status"
          label="Status"
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          name="need"
          label="Need"
          options={Object.entries(NEED_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          name="channel"
          label="Channel"
          options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {result.rows.length === 0 ? (
        <EmptyState icon={FileSearch} title="No applications match" description="Try removing a filter." />
      ) : (
        <DataTable
          minWidth={900}
          columns={[
            { key: "id", title: "ID" },
            { key: "submitted", title: "Submitted" },
            { key: "need", title: "Need" },
            { key: "requested", title: "Requested", align: "right" },
            { key: "area", title: "Area" },
            { key: "score", title: "Need score", align: "right" },
            { key: "band", title: "Band" },
            { key: "status", title: "Status" },
          ]}
          rows={result.rows.map(({ application: a, score, area_name }) => ({
            key: a.application_id,
            id: (
              <Link href={`/applications/${a.application_id}`} className="font-medium">
                #{a.application_id}
              </Link>
            ),
            submitted: <span className="whitespace-nowrap text-muted-foreground">{formatDate(a.submitted_at)}</span>,
            need: NEED_CATEGORY_LABELS[a.need_category],
            requested: (
              <span className="whitespace-nowrap tabular-nums">
                {formatMoney(a.amount_requested, currencyByCycle.get(a.cycle_id))}
              </span>
            ),
            area: <span className="text-muted-foreground">{area_name ?? "—"}</span>,
            score: score ? (
              <span
                className="tabular-nums"
                title={`Interval ${score.need_lo.toFixed(1)}–${score.need_hi.toFixed(1)}, cutoff ${score.cutoff.toFixed(1)}`}
              >
                {score.need_mid.toFixed(1)}
              </span>
            ) : (
              "—"
            ),
            band: <BandBadge band={score?.band} />,
            status: <StatusBadge status={a.status} />,
          }))}
        />
      )}

      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}
