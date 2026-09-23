import { Tag, Tooltip } from "antd";
import type { ApplicationStatus, DecisionBand } from "@/types";
import { BAND_DESCRIPTIONS, BAND_LABELS, STATUS_LABELS } from "@/lib/labels";

export const BAND_COLOR_VAR: Record<DecisionBand, string> = {
  auto_approve: "var(--band-auto)",
  audit_approve: "var(--band-audit)",
  human_review: "var(--band-review)",
  defer: "var(--band-defer)",
};

export function BandBadge({ band }: { band: DecisionBand | null | undefined }) {
  if (!band) return <span className="text-sm text-muted-foreground">Not scored</span>;
  return (
    <Tooltip title={BAND_DESCRIPTIONS[band]}>
      <span className="inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: BAND_COLOR_VAR[band] }} />
        {BAND_LABELS[band]}
      </span>
    </Tooltip>
  );
}

const STATUS_COLORS: Partial<Record<ApplicationStatus, string>> = {
  awarded: "green",
  auto_approved: "green",
  audit_approved: "green",
  in_review: "purple",
  appealed: "orange",
  submitted: "blue",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Tag color={STATUS_COLORS[status] ?? "default"} className="me-0 text-[13px]" variant="filled">
      {STATUS_LABELS[status]}
    </Tag>
  );
}
