export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
