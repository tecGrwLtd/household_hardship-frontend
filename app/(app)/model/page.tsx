import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getModelVersions } from "@/lib/api/models";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate, humanize } from "@/lib/labels";
import { Card, Tag } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";

export const metadata: Metadata = { title: "Model" };

const CHECKS = [
  ["Exclusion error, worst-off 10%", "Headline metric. Agree the threshold before launch."],
  ["Gap between groups", "Largest minus smallest exclusion error across audit groups."],
  ["Model vs caseworkers", "Failure rate at matched approval rates; the model must beat the human baseline."],
  ["Interval coverage", "The 80% interval should contain the true value 78–82% of the time."],
  ["Override rate", "Below about 5% means the human review is not real."],
  ["Drift, monthly", "Score distribution by group, feature drift (PSI), interval coverage, stability of the top 10 reasons."],
];

export default async function ModelPage() {
  const user = await getSessionUser();
  if (user?.role !== "admin") redirect("/");
  const versions = await getModelVersions();

  return (
    <>
      <PageHeader
        title="Model"
        description="Active version and release checklist."
      />

      <Card title="Versions">
        <DataTable
          minWidth={640}
          columns={[
            { key: "version", title: "Version" },
            { key: "kind", title: "Type" },
            { key: "created", title: "Created" },
            { key: "notes", title: "Notes" },
            { key: "status", title: "Status" },
          ]}
          rows={versions.map((v) => ({
            key: v.model_version,
            version: <span className="font-mono text-sm">{v.model_version}</span>,
            kind: humanize(v.kind),
            created: <span className="text-muted-foreground">{formatDate(v.created_at)}</span>,
            notes: <span className="text-muted-foreground">{v.notes}</span>,
            status: v.active ? (
              <Tag color="green" variant="filled">
                Active
              </Tag>
            ) : (
              <Tag variant="filled">Inactive</Tag>
            ),
          }))}
        />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Training a new version">
          <p className="mb-4 text-muted-foreground">
            Training runs on the backend. It prints the evaluation and the new version name; activate it only if the
            checks on the right pass.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
            {`python -m backend.ml --dsn $DSN train
python -m backend.ml --dsn $DSN activate <version>
python -m backend.ml --dsn $DSN score`}
          </pre>
          <p className="mt-4 text-muted-foreground">
            The model predicts measured welfare (consumption per person), never past approval decisions. Protected
            attributes, caseworker IDs and credit data are never features.
          </p>
        </Card>

        <Card title="Checks before activating">
          <dl className="flex flex-col gap-4">
            {CHECKS.map(([name, text]) => (
              <div key={name}>
                <dt className="font-medium">{name}</dt>
                <dd className="text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
