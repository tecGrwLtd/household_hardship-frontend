import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Card, Tag } from "antd";
import { ClipboardCheck } from "lucide-react";
import { getCurrentCycle, getFundingCycles } from "@/lib/api/reference";
import { getReviewQueue } from "@/lib/api/reviews";
import { getSessionUser } from "@/lib/auth/session";
import { NEED_CATEGORY_LABELS, cycleLabel, formatDate, formatMoney } from "@/lib/labels";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { EmptyState } from "@/components/EmptyState";
import { NeedInterval } from "@/components/decision/NeedInterval";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewQueuePage(props: PageProps<"/review">) {
  const sp = await props.searchParams;
  const [current, cycles, user] = await Promise.all([getCurrentCycle(), getFundingCycles(), getSessionUser()]);
  // Default to the current cycle; "all" shows the whole backlog.
  const cycleParam = typeof sp.cycle === "string" ? sp.cycle : String(current.cycle_id);
  const cycleId = cycleParam === "all" ? undefined : Number(cycleParam);
  const kind = typeof sp.kind === "string" ? sp.kind : undefined;
  const queue = (await getReviewQueue(cycleId)).filter((q) => !kind || q.kind === kind);
  const currencyByCycle = new Map(cycles.map((c) => [c.cycle_id, c.budget_currency]));

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Close calls and appeals, oldest first."
      />

      {user?.role !== "caseworker" && (
        <Alert className="mb-5" type="info" showIcon title="Admins can view the queue. Log in as a caseworker to record decisions." />
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <FilterSelect
          name="cycle"
          label="Cycle"
          allLabel={cycleLabel(current)}
          options={[
            { value: "all", label: "All cycles" },
            ...cycles
              .filter((c) => c.cycle_id !== current.cycle_id)
              .map((c) => ({ value: String(c.cycle_id), label: cycleLabel(c) })),
          ]}
        />
        <FilterSelect
          name="kind"
          label="Type"
          options={[
            { value: "review", label: "Human review band" },
            { value: "appeal", label: "Appeals" },
          ]}
        />
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing waiting"
          description="Cases show up here after an allocation run, or when someone appeals."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map(({ application: a, score, lean, area_name, kind: k }) => (
            <li key={a.application_id}>
              <Link href={`/applications/${a.application_id}`} className="block text-foreground hover:text-foreground">
                <Card hoverable styles={{ body: { padding: 20 } }}>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_10rem] md:items-center">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-semibold">
                    #{a.application_id}
                    <Tag color={k === "appeal" ? "orange" : "purple"} variant="filled">
                      {k === "appeal" ? "Appeal" : "Review"}
                    </Tag>
                  </p>
                  <p className="mt-1 truncate text-muted-foreground">
                    {NEED_CATEGORY_LABELS[a.need_category]} · {formatMoney(a.amount_requested, currencyByCycle.get(a.cycle_id))} ·{" "}
                    {area_name ?? "Unknown area"} · submitted {formatDate(a.submitted_at)}
                  </p>
                </div>
                <div>
                  <NeedInterval score={score} compact />
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {score.need_lo.toFixed(1)}–{score.need_hi.toFixed(1)} vs cutoff {score.cutoff.toFixed(1)}
                  </p>
                </div>
                <p className="md:text-right">
                  Model leans <span className="font-semibold">{lean}</span>
                </p>
                </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
