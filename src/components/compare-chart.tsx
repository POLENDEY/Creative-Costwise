import type { ReactNode } from "react";

type Row = { label: string; revenue: number; expense: number };

export function CompareChart({ title, rows }: { title: string; rows: Row[] }) {
  const active = rows.filter((row) => row.revenue > 0 || row.expense > 0);
  if (!active.length) return null;
  const max = Math.max(1, ...active.flatMap((row) => [row.revenue, row.expense]));
  const width = 640;
  const height = 168;
  const pad = 8;
  const group = (width - pad * 2) / active.length;
  const bar = Math.max(3, group * 0.28);
  const summary = active
    .map((row) => `${row.label}: revenue ${row.revenue}, expenses ${row.expense}`)
    .join(". ");

  return (
    <figure className="compare-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        {active.map((row, index) => {
          const x = pad + index * group;
          const revenueHeight = (row.revenue / max) * (height - 28);
          const expenseHeight = (row.expense / max) * (height - 28);
          return (
            <g key={row.label}>
              <rect x={x} y={height - 22 - revenueHeight} width={bar} height={revenueHeight} rx="2" fill="var(--accent)" />
              <rect x={x + bar + 2} y={height - 22 - expenseHeight} width={bar} height={expenseHeight} rx="2" fill="var(--ink)" opacity="0.35" />
              <text x={x} y={height - 6} fill="var(--muted)" fontSize="10">{row.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="compare-legend">
        <span><i className="compare-swatch compare-swatch-revenue" /> Revenue</span>
        <span><i className="compare-swatch compare-swatch-expense" /> Expenses</span>
      </div>
    </figure>
  );
}

const PIE_COLORS = ["var(--accent)", "#c4842a", "#247449", "#1d4ed8", "#7e22ce", "#0f766e", "#b45309", "#be123c"];

function pieSlice(cx: number, cy: number, radius: number, start: number, end: number) {
  const sweep = end - start;
  if (sweep >= Math.PI * 2 - 0.001) return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function ValueChart({ title, rows, total, aside }: {
  title: string;
  rows: { label: string; value: number; detail: string }[];
  total?: { amount: string; label: string };
  aside?: ReactNode;
}) {
  const active = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  if (!active.length && !total && !aside) return null;
  const sum = active.reduce((carry, row) => carry + row.value, 0);
  let cursor = -Math.PI / 2;
  const slices = active.map((row, index) => {
    const sweep = (row.value / sum) * Math.PI * 2;
    const start = cursor;
    cursor += sweep;
    const percent = (row.value / sum) * 100;
    const share = percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;
    return { ...row, start, end: cursor, color: PIE_COLORS[index % PIE_COLORS.length], share };
  });
  const summary = slices.map((slice) => `${slice.label} ${slice.detail}, ${slice.share}`).join(". ");

  return (
    <figure className="compare-chart compare-pie">
      <figcaption>{title}</figcaption>
      {slices.length > 0 && (
        <div className="compare-pie-chart">
          <svg viewBox="0 0 180 180" role="img" aria-label={summary}>
            {slices.map((slice) => (
              <path key={slice.label} d={pieSlice(90, 90, 78, slice.start, slice.end)} fill={slice.color} stroke="var(--surface)" strokeWidth="2" />
            ))}
          </svg>
          <ul className="compare-pie-legend">
            {slices.map((slice) => (
              <li key={slice.label}>
                <i className="compare-swatch" style={{ background: slice.color }} />
                <span><b>{slice.label}</b><small>{slice.detail} · {slice.share}</small></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(total || aside) && (
        <div className="compare-pie-side">
          {total && <p className="compare-pie-total"><b>{total.amount}</b><small>{total.label}</small></p>}
          {aside}
        </div>
      )}
    </figure>
  );
}
