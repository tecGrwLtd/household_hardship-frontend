import type { Metadata } from "next";
import { Card } from "antd";
import { TriangleAlert } from "lucide-react";
import { getFairnessAudit } from "@/lib/api/fairness";
import { getOverrideStats } from "@/lib/api/dashboard";
import { getFundingCycles } from "@/lib/api/reference";
import { AUDIT_ATTRIBUTE_LABELS, cycleLabel, formatPercent, humanize } from "@/lib/labels";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { StatTile } from "@/components/StatTile";
import { DataTable } from "@/components/DataTable";

export const metadata: Metadata = { title: "Fairness audit" };

/** Below this many people, a group's rate is too noisy to compare. */
const MIN_N = 20;

export default async function FairnessPage(props: PageProps<"/fairness">) {
  const sp = await props.searchParams;
  const cycleId = typeof sp.cycle === "string" && sp.cycle ? Number(sp.cycle) : null;
  const [audit, overrides, cycles] = await Promise.all([
    getFairnessAudit(cycleId),
    getOverrideStats(),
    getFundingCycles(),
  ]);

  const byAttr = new Map<string, typeof audit.rows>();
  audit.rows.forEach((r) => byAttr.set(r.attribute, [...(byAttr.get(r.attribute) ?? []), r]));
  const comparable = audit.rows.filter((r) => r.n >= MIN_N);
  const worst = comparable.reduce<(typeof audit.rows)[number] | null>(
    (w, r) => (!w || r.gap_vs_best > w.gap_vs_best ? r : w),
    null,
  );
  const lowOverride = overrides.override_rate !== null && overrides.override_rate < 0.05;

  return (
    <>
      <PageHeader
        title="Fairness audit"
        description="Deferral rates among the poorest 10% of applicants, by group."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <FilterSelect
          name="cycle"
          label="Cycle"
          allLabel="All cycles"
          options={cycles.map((c) => ({ value: String(c.cycle_id), label: cycleLabel(c) }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Exclusion error, worst-off 10%"
          value={formatPercent(audit.overall_exclusion_error, 1)}
          detail={`Share of the ${audit.bottom_decile_n.toLocaleString()} lowest-consumption applicants who were deferred`}
        />
        <StatTile
          label="Largest gap between groups"
          value={worst ? formatPercent(worst.gap_vs_best, 1) : "—"}
          detail={
            worst
              ? `${AUDIT_ATTRIBUTE_LABELS[worst.attribute]}: ${humanize(worst.group_value)} vs the best-served group`
              : `No group has ${MIN_N}+ people yet`
          }
        />
        <StatTile
          label="Reviewer override rate"
          value={formatPercent(overrides.override_rate, 1)}
          detail={`${overrides.overrides} of ${overrides.reviews} reviews`}
          warning={lowOverride ? "Below 5%: reviews may be a rubber stamp." : undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...byAttr.entries()].map(([attr, rows]) => (
          <Card key={attr} title={AUDIT_ATTRIBUTE_LABELS[attr] ?? humanize(attr)}>
            {rows.length < 2 ? (
              <p className="text-muted-foreground">
                Only one value recorded ({humanize(rows[0]?.group_value)}).
              </p>
            ) : (
              <table className="w-full">
                <thead className="text-sm text-muted-foreground">
                  <tr>
                    <th className="pb-3 text-left font-medium">Group</th>
                    <th className="pb-3 text-right font-medium">People</th>
                    <th className="w-2/5 pb-3 pl-4 text-left font-medium">Deferred</th>
                    <th className="pb-3 text-right font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rows.map((r) => (
                    <tr key={r.group_value} className="border-t border-border">
                      <td className="py-2.5">{humanize(r.group_value)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.n}</td>
                      <td className="py-2.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/15">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${r.exclusion_error * 100}%` }} />
                          </div>
                          <span className="w-12 text-right text-sm">{formatPercent(r.exclusion_error)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        {r.n < MIN_N ? (
                          <span className="text-sm text-muted-foreground" title={`Fewer than ${MIN_N} people`}>
                            too few
                          </span>
                        ) : (
                          `+${(r.gap_vs_best * 100).toFixed(1)}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))}
      </div>

      <Card id="overrides" className="mt-6 scroll-mt-20" title="Override rate by caseworker">
        <p className="mb-4 text-muted-foreground">Share of reviews that went against the model&apos;s lean.</p>
        <DataTable
          minWidth={600}
          columns={[
            { key: "name", title: "Caseworker" },
            { key: "region", title: "Region" },
            { key: "reviews", title: "Reviews", align: "right" },
            { key: "overrides", title: "Overrides", align: "right" },
            { key: "rate", title: "Rate", align: "right" },
          ]}
          rows={overrides.byCaseworker.map((c) => {
            const low = c.override_rate !== null && c.reviews >= MIN_N && c.override_rate < 0.05;
            return {
              key: c.caseworker_id,
              name: c.display_name,
              region: <span className="text-muted-foreground">{c.region ?? "—"}</span>,
              reviews: <span className="tabular-nums">{c.reviews}</span>,
              overrides: <span className="tabular-nums">{c.overrides}</span>,
              rate: (
                <span className={low ? "inline-flex items-center gap-1 font-medium text-warning tabular-nums" : "tabular-nums"}>
                  {low && <TriangleAlert className="size-4" aria-label="Below 5%" />}
                  {formatPercent(c.override_rate, 1)}
                </span>
              ),
            };
          })}
        />
      </Card>
    </>
  );
}
