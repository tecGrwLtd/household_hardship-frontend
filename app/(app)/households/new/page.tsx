import type { Metadata } from "next";
import { getAreas, getCurrentCycle } from "@/lib/api/reference";
import { PageHeader } from "@/components/PageHeader";
import { HouseholdForm } from "@/components/forms/HouseholdForm";

export const metadata: Metadata = { title: "Register household" };

export default async function NewHouseholdPage() {
  const [areas, cycle] = await Promise.all([getAreas(), getCurrentCycle()]);
  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: "/households", label: "Households" }, { label: "Register" }]}
        title="Register a household"
        description="Household details and first survey."
      />
      <HouseholdForm areas={areas} currency={cycle.budget_currency} />
    </div>
  );
}
