"use client";

import { useState } from "react";
import { Legend, type SeriesDef } from "./Legend";
import { niceTicks, useWidth } from "./useWidth";

export interface ColumnDatum {
  /** Short x-axis label. */
  label: string;
  /** Tooltip / table heading. */
  title: string;
  values: Record<string, number>;
}

const M = { top: 8, right: 8, bottom: 24, left: 44 };
const GAP = 2; // px between stacked segments
const RADIUS = 4;

export function StackedColumns({
  series,
  data,
  height = 240,
  caption,
}: {
  series: SeriesDef[];
  data: ColumnDatum[];
  height?: number;
  caption: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const ticks = niceTicks(Math.max(...totals, 1));
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(width - M.left - M.right, 50);
  const innerH = height - M.top - M.bottom;
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64))));

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Legend series={series} />
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <DataTable series={series} data={data} totals={totals} caption={caption} />
      ) : (
        <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={caption} className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-xs tabular-nums">
                  {t.toLocaleString()}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = M.left + band * i + band / 2;
              let acc = 0;
              const segs = series
                .map((s) => ({ s, v: d.values[s.key] ?? 0 }))
                .filter((x) => x.v > 0);
              return (
                <g key={d.title} opacity={hover === null || hover === i ? 1 : 0.55}>
                  {segs.map(({ s, v }, j) => {
                    const y0 = y(acc);
                    acc += v;
                    const y1 = y(acc);
                    const isTop = j === segs.length - 1;
                    const h = Math.max(0, y0 - y1 - (isTop ? 0 : GAP));
                    const top = y0 - h;
                    return isTop ? (
                      <path key={s.key} d={roundedTop(cx - barW / 2, top, barW, h, RADIUS)} fill={s.color} />
                    ) : (
                      <rect key={s.key} x={cx - barW / 2} y={top} width={barW} height={h} fill={s.color} />
                    );
                  })}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-xs">
                      {d.label}
                    </text>
                  )}
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${d.title}: ${totals[i]}`}
                  />
                </g>
              );
            })}
            <line x1={M.left} x2={M.left + innerW} y1={y(0)} y2={y(0)} className="stroke-muted-foreground/40" strokeWidth={1} />
          </svg>

          {hover !== null && (
            <Tooltip
              left={Math.min(Math.max(M.left + band * hover + band / 2, 90), width - 90)}
              datum={data[hover]}
              total={totals[hover]}
              series={series}
            />
          )}
        </div>
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function Tooltip({
  left,
  datum,
  total,
  series,
}: {
  left: number;
  datum: ColumnDatum;
  total: number;
  series: SeriesDef[];
}) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-md border border-border bg-popover p-2.5 text-xs shadow-md"
      style={{ left }}
    >
      <p className="mb-1.5 font-medium text-foreground">{datum.title}</p>
      <ul className="flex flex-col gap-1">
        {[...series].reverse().map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
            <span className="ml-auto text-foreground tabular-nums">{(datum.values[s.key] ?? 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 flex border-t border-border pt-1.5 font-medium text-foreground">
        Total <span className="ml-auto tabular-nums">{total.toLocaleString()}</span>
      </p>
    </div>
  );
}

function DataTable({
  series,
  data,
  totals,
  caption,
}: {
  series: SeriesDef[];
  data: ColumnDatum[];
  totals: number[];
  caption: string;
}) {
  return (
    <div className="max-h-72 overflow-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Period</th>
            {series.map((s) => (
              <th key={s.key} className="px-3 py-2 text-right font-medium">
                {s.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {data.map((d, i) => (
            <tr key={d.title} className="border-t border-border">
              <td className="px-3 py-1.5">{d.title}</td>
              {series.map((s) => (
                <td key={s.key} className="px-3 py-1.5 text-right">
                  {(d.values[s.key] ?? 0).toLocaleString()}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-medium">{totals[i].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
