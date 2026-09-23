import Link from "next/link";
import type { Metadata } from "next";
import { Home, Plus } from "lucide-react";
import { listHouseholds } from "@/lib/api/households";
import { getAreas } from "@/lib/api/reference";
import { formatDate } from "@/lib/labels";
import { LinkButton } from "@/components/LinkButton";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect } from "@/components/FilterSelect";
import { SearchBox } from "@/components/SearchBox";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Households" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function HouseholdsPage(props: PageProps<"/households">) {
  const sp = await props.searchParams;
  const params = { q: str(sp.q), area: str(sp.area), page: str(sp.page) };
  const [result, areas] = await Promise.all([
    listHouseholds({ q: params.q, area_code: params.area, page: params.page ? Number(params.page) : 1 }),
    getAreas(),
  ]);

  return (
    <>
      <PageHeader
        title="Households"
        description="Everyone registered for support, with their latest survey."
        actions={
          <LinkButton type="primary" size="large" href="/households/new" icon={<Plus className="size-4" />}>
            Register household
          </LinkButton>
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <SearchBox placeholder="Household ID (start of it is enough)" />
        <FilterSelect
          name="area"
          label="Area"
          allLabel="All areas"
          options={areas.map((a) => ({ value: a.area_code, label: `${a.area_name} (${a.urban_rural})` }))}
        />
      </div>

      {result.rows.length === 0 ? (
        <EmptyState icon={Home} title="No households match" description="Try another ID or area." />
      ) : (
        <DataTable
          minWidth={720}
          columns={[
            { key: "id", title: "Household" },
            { key: "area", title: "Area" },
            { key: "members", title: "Members", align: "right" },
            { key: "registered", title: "Registered" },
            { key: "survey", title: "Last survey" },
            { key: "applications", title: "Applications", align: "right" },
          ]}
          rows={result.rows.map((r) => ({
            key: r.household.household_id,
            id: (
              <Link href={`/households/${r.household.household_id}`} className="font-mono text-sm font-medium">
                {r.household.household_id.slice(0, 8)}
              </Link>
            ),
            area: r.area_name,
            members: <span className="tabular-nums">{r.household_size ?? "—"}</span>,
            registered: <span className="text-muted-foreground">{formatDate(r.household.registered_at)}</span>,
            survey: <span className="text-muted-foreground">{formatDate(r.survey_date)}</span>,
            applications: <span className="tabular-nums">{r.applications}</span>,
          }))}
        />
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </>
  );
}
