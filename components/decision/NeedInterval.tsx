import type { ModelScore } from "@/types";
import { BAND_COLOR_VAR } from "@/components/Badges";

export function NeedInterval({ score, compact = false }: { score: ModelScore; compact?: boolean }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  const color = BAND_COLOR_VAR[score.band];
  return (
    <div className={compact ? "w-40" : "w-full"}>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full opacity-35"
          style={{ left: pct(score.need_lo), width: `${score.need_hi - score.need_lo}%`, background: color }}
        />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
          style={{ left: pct(score.need_mid), background: color }}
        />
        <div
          className="absolute inset-y-0 w-px -translate-x-1/2 bg-foreground"
          style={{ left: pct(score.cutoff) }}
          aria-hidden
        />
      </div>
      {!compact && (
        <div className="relative mt-1 h-5 text-xs text-muted-foreground">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2 font-medium whitespace-nowrap text-foreground" style={{ left: pct(score.cutoff) }}>
            Cutoff {score.cutoff.toFixed(1)}
          </span>
          <span className="absolute right-0">100</span>
        </div>
      )}
    </div>
  );
}
