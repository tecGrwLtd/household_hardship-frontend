import type { SeriesDef } from "./Legend";

export function ShareBar({
  series,
  values,
  label,
}: {
  series: SeriesDef[];
  values: Record<string, number>;
  label: string;
}) {
  const total = series.reduce((s, x) => s + (values[x.key] ?? 0), 0);
  const parts = series.filter((s) => (values[s.key] ?? 0) > 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={label}>
        {parts.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
            style={{ background: s.color, flexGrow: values[s.key] }}
            title={`${s.label}: ${values[s.key].toLocaleString()}`}
          />
        ))}
        {total === 0 && <div className="h-full flex-1 bg-muted" />}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {series.map((s) => {
          const v = values[s.key] ?? 0;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto tabular-nums">{v.toLocaleString()}</span>
              <span className="w-12 text-right text-muted-foreground tabular-nums">
                {total ? `${Math.round((v / total) * 100)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
