import type { ShapFeatures } from "@/types";
import { FEATURE_LABELS, humanize } from "@/lib/labels";

// Top SHAP contributions: bars grow right when a feature raises need, left when it lowers it.
export function Reasons({
  features,
  values = {},
}: {
  features: ShapFeatures | null;
  values?: Record<string, string>;
}) {
  if (!features?.length) {
    return <p className="text-sm text-muted-foreground">No explanation stored for this score.</p>;
  }
  const max = Math.max(...features.map(([, v]) => Math.abs(v)), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {features.map(([name, value]) => {
        const w = (Math.abs(value) / max) * 50;
        return (
          <li key={name} className="grid grid-cols-[minmax(0,1fr)_7rem_4.5rem] items-center gap-3 text-sm">
            <span className="min-w-0" title={name}>
              <span className="block truncate">{FEATURE_LABELS[name] ?? humanize(name)}</span>
              {values[name] && <span className="block text-xs text-muted-foreground">{values[name]}</span>}
            </span>
            <span className="relative h-2 rounded-full bg-muted" aria-hidden>
              <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <span
                className="absolute inset-y-0 rounded-full bg-primary"
                style={value >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
              />
            </span>
            <span className="text-right text-xs text-muted-foreground tabular-nums">
              {value >= 0 ? "+" : "−"}
              {Math.abs(value).toFixed(1)} pts
            </span>
          </li>
        );
      })}
    </ul>
  );
}
