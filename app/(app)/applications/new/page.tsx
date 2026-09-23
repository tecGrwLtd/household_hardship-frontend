import type { Metadata } from "next";
import { getCurrentCycle } from "@/lib/api/reference";
import { cycleLabel } from "@/lib/labels";
import { PageHeader } from "@/components/PageHeader";
import { ApplicationForm } from "@/components/forms/ApplicationForm";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage(props: PageProps<"/applications/new">) {
  const { household } = await props.searchParams;
  const cycle = await getCurrentCycle();
  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: "/applications", label: "Applications" }, { label: "New" }]}
        title="New application"
        description="One per household per funding cycle."
      />
      <ApplicationForm
        householdId={typeof household === "string" ? household : undefined}
        currency={cycle.budget_currency}
        cycleName={cycleLabel(cycle)}
      />
    </div>
  );
}
