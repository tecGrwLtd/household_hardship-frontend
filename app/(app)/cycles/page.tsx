import Link from "next/link";
import type { Metadata } from "next";
import { getCycleSummaries } from "@/lib/api/dashboard";
import { formatDate, formatMoney, formatMonth, formatPercent } from "@/lib/labels";
import { PageHeader } from "@/components/PageHeader";
import { Meter } from "@/components/StatTile";
import { DataTable } from "@/components/DataTable";

export const metadata: Metadata = { title: "Funding cycles" };

export default async function CyclesPage() {
  const cycles = [...(await getCycleSummaries())].reverse();
  return (
    <>
      <PageHeader title="Funding cycles" description="Each cycle has a fixed budget. Newest first." />
      <DataTable
        minWidth={940}
        columns={[
          { key: "cycle", title: "Cycle" },
          { key: "period", title: "Period" },
          { key: "applications", title: "Applications", align: "right" },
          { key: "repeat", title: "Repeat", align: "right" },
          { key: "budget", title: "Budget", align: "right" },
          { key: "awarded", title: "Awarded", align: "right" },
          { key: "used", title: "Budget used", width: 220 },
        ]}
        rows={cycles.map((c) => ({
          key: c.cycle_id,
          cycle: (
            <>
              <Link href={`/cycles/${c.cycle_id}`} className="font-medium">
                {formatMonth(c.period_start)}
              </Link>
              <span className="ml-2 text-sm text-muted-foreground">#{c.cycle_id}</span>
            </>
          ),
          period: (
            <span className="whitespace-nowrap text-muted-foreground">
              {formatDate(c.period_start)} – {formatDate(c.period_end)}
            </span>
          ),
          applications: <span className="tabular-nums">{c.total_applications.toLocaleString()}</span>,
          repeat: <span className="tabular-nums">{formatPercent(c.repeat_applications / Math.max(c.total_applications, 1))}</span>,
          budget: <span className="whitespace-nowrap tabular-nums">{formatMoney(c.budget_total, c.budget_currency)}</span>,
          awarded: <span className="whitespace-nowrap tabular-nums">{formatMoney(c.total_awarded, c.budget_currency)}</span>,
          used: <Meter value={c.total_awarded} max={c.budget_total} label={`Cycle ${c.cycle_id} budget used`} showInfo className="m-0" />,
        }))}
      />
    </>
  );
}
