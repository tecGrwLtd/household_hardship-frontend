import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Alert, Card, Descriptions } from "antd";
import { Plus } from "lucide-react";
import { getHousehold } from "@/lib/api/households";
import {
  NEED_CATEGORY_LABELS,
  formatDate,
  formatMoney,
  formatPercent,
  humanize,
} from "@/lib/labels";
import { LinkButton } from "@/components/LinkButton";
import { StatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Household" };

export default async function HouseholdPage(props: PageProps<"/households/[id]">) {
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const data = await getHousehold(id);
  if (!data) notFound();
  const { household: h, survey: s, area } = data;
  const totalAwarded = data.awards.reduce((sum, w) => sum + w.award_amount, 0);

  const groups: { title: string; rows: [string, React.ReactNode][] }[] = s
    ? [
        {
          title: "Composition",
          rows: [
            ["Household size", s.household_size],
            ["Children under 5", s.children_under_5],
            ["Members over 65", s.members_over_65],
            ["Female-headed", yesNo(s.female_headed)],
            ["Single caregiver", yesNo(s.single_caregiver)],
            ["Head's education", humanize(s.education_head)],
            ["Head can read and write", yesNo(s.literacy_head)],
            ["Dependents needing care", s.dependents_requiring_care],
          ],
        },
        {
          title: "Housing",
          rows: [
            ["Rooms", s.rooms ?? "—"],
            ["Tenure", humanize(s.tenure)],
            ["Roof / walls / floor", [s.roof_material, s.wall_material, s.floor_material].map(humanize).join(" / ")],
            ["Water source", humanize(s.water_source)],
            ["Sanitation", humanize(s.sanitation_type)],
            ["Electricity", yesNo(s.electricity)],
            ["Cooking fuel", humanize(s.cooking_fuel)],
          ],
        },
        {
          title: "Income and work",
          rows: [
            ["Employment", humanize(s.employment_type)],
            ["Earners", s.earners_count ?? "—"],
            ["Hours worked per week", s.hours_worked ?? "—"],
            ["Monthly income", formatMoney(s.monthly_income)],
            ["Essential costs", formatMoney(s.essential_costs)],
            ["Income seasonality", s.income_seasonality !== null ? formatPercent(s.income_seasonality) : "—"],
          ],
        },
        {
          title: "Wellbeing and assets",
          rows: [
            ["Food insecurity (0–8)", s.food_security_score ?? "—"],
            ["Chronic illness in household", yesNo(s.chronic_illness)],
            ["Disability in household", yesNo(s.disability_in_household)],
            [
              "Assets",
              Object.entries(s)
                .filter(([k, v]) => k.startsWith("asset_") && v === true)
                .map(([k]) => humanize(k.slice(6)))
                .join(", ") || "None",
            ],
            ["Livestock", s.livestock_count ?? "—"],
            ["Land (ha)", s.land_area ?? "—"],
            [
              "Shocks, last 12 months",
              Object.entries(s)
                .filter(([k, v]) => k.startsWith("shock_") && v === true)
                .map(([k]) => humanize(k.replace("shock_", "").replace("_12m", "")))
                .join(", ") || "None",
            ],
          ],
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/households", label: "Households" }, { label: h.household_id.slice(0, 8) }]}
        title={`Household ${h.household_id.slice(0, 8)}`}
        description={
          <>
            {area ? `${area.area_name} (${area.urban_rural})` : h.area_code} · registered {formatDate(h.registered_at)} ·{" "}
            <span className="font-mono text-sm">{h.household_id}</span>
          </>
        }
        actions={
          <LinkButton
            type="primary"
            size="large"
            href={`/applications/new?household=${h.household_id}`}
            icon={<Plus className="size-4" />}
          >
            New application
          </LinkButton>
        }
      />

      {created === "1" && (
        <Alert className="mb-6" type="success" showIcon title="Household registered with its first survey." />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Latest survey" extra={<span className="text-sm font-normal text-muted-foreground">{s ? `Taken ${formatDate(s.survey_date)}` : ""}</span>}>
          {!s && <p className="text-muted-foreground">No survey on record.</p>}
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <Descriptions
                key={g.title}
                title={g.title}
                bordered
                size="small"
                column={{ xs: 1, sm: 1, md: 2, xxl: 2 }}
                items={g.rows.map(([label, value]) => ({ key: label, label, children: value }))}
              />
            ))}
          </div>
          {h.notes && <p className="mt-5 text-muted-foreground">Notes: {h.notes}</p>}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Applications">
            {data.applications.length ? (
              <ul className="divide-y divide-border">
                {data.applications.map((a) => (
                  <li key={a.application_id} className="flex items-center gap-3 py-2">
                    <Link href={`/applications/${a.application_id}`} className="font-medium">
                      #{a.application_id}
                    </Link>
                    <span className="text-muted-foreground">{formatDate(a.submitted_at)}</span>
                    <span className="flex-1 truncate">{NEED_CATEGORY_LABELS[a.need_category]}</span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No applications yet.</p>
            )}
          </Card>
          <Card title="Awards">
            <p className="mb-3 text-muted-foreground">
              {data.awards.length} award{data.awards.length === 1 ? "" : "s"}, {formatMoney(totalAwarded)} in total
            </p>
            <ul className="divide-y divide-border">
              {data.awards.map((w) => (
                <li key={w.award_id} className="flex justify-between py-1.5">
                  <span>
                    {formatDate(w.award_date)} · {NEED_CATEGORY_LABELS[w.need_category]}
                  </span>
                  <span className="tabular-nums">{formatMoney(w.award_amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function yesNo(v: boolean | null) {
  return v === null ? "—" : v ? "Yes" : "No";
}
