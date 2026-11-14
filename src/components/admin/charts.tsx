import { useState, type ReactNode } from "react";
import { compact, niceMax, num, type Point } from "@/components/admin/format";

/** A card with a title and a Chart / Table switch, so every chart also has its numbers. */
export function ChartCard({
  title,
  hint,
  points,
  unit,
  tall,
}: {
  title: string;
  hint?: string;
  points: Point[];
  unit: string;
  tall?: boolean;
}) {
  const [table, setTable] = useState(false);
  return (
    <section className="adm-panel">
      <header className="adm-panel-head">
        <div>
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        <button type="button" className="adm-link" onClick={() => setTable((on) => !on)}>
          {table ? "Chart" : "Table"}
        </button>
      </header>
      {table ? (
        <div className="adm-scroll" tabIndex={0}>
          <table className="adm-data">
            <thead>
              <tr>
                <th>Period</th>
                <th>{unit}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point, index) => (
                <tr key={`${point.label}-${index}`}>
                  <td>{point.label}</td>
                  <td>{num(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Columns points={points} unit={unit} tall={tall} />
      )}
    </section>
  );
}

/** Thin columns from one baseline, a hairline grid, and a tooltip on hover or focus. */
export function Columns({ points, unit, tall }: { points: Point[]; unit: string; tall?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...points.map((point) => point.value)));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const step = Math.max(1, Math.ceil(points.length / 6));
  const at = (index: number) => ((index + 0.5) / points.length) * 100;

  return (
    <figure className="adm-chart" data-tall={tall ? "true" : "false"} aria-label={`${unit} over time, ${num(total)} in total`}>
      <div className="adm-plot" onMouseLeave={() => setActive(null)}>
        {[0, max / 2, max].map((tick) => (
          <div key={tick} className="adm-grid" style={{ bottom: `${(tick / max) * 100}%` }}>
            <span>{compact(tick)}</span>
          </div>
        ))}
        <div className="adm-bars" data-hover={active !== null ? "true" : undefined}>
          {points.map((point, index) => (
            <button
              key={`${point.label}-${index}`}
              type="button"
              className="adm-bar"
              data-active={active === index ? "true" : undefined}
              aria-label={`${point.label}: ${num(point.value)} ${unit}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <i style={{ height: `${(point.value / max) * 100}%` }} data-zero={point.value === 0 ? "true" : undefined} />
            </button>
          ))}
        </div>
        {active !== null && points[active] ? (
          <div
            className="adm-tip"
            style={{ left: `${at(active)}%` }}
            data-edge={at(active) < 14 ? "start" : at(active) > 86 ? "end" : undefined}
            role="status"
          >
            <b>
              {num(points[active].value)} {unit}
            </b>
            <span>{points[active].label}</span>
          </div>
        ) : null}
      </div>
      <div className="adm-axis" aria-hidden="true">
        {points.map((point, index) =>
          index % step === 0 ? (
            <span key={`${point.label}-${index}`} style={{ left: `${at(index)}%` }}>
              {point.label.split(" – ")[0]}
            </span>
          ) : null,
        )}
      </div>
    </figure>
  );
}

/** A small line for a stat tile, with a dot on the latest value. */
export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="adm-spark" aria-hidden="true" />;
  const width = 96;
  const height = 30;
  const max = Math.max(1, ...values);
  const x = (index: number) => 5 + (index / (values.length - 1)) * (width - 10);
  const y = (value: number) => height - 6 - (value / max) * (height - 12);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg className="adm-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="#b9b8b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last] ?? 0)} r="4" fill="#17181a" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/** One row per name: the name, a bar against the largest value, and the figure. */
export function RankBars({
  rows,
  empty,
  render,
}: {
  rows: { key: string; name: string; value: number; note?: string }[];
  empty: string;
  render?: (row: { key: string; name: string; value: number }) => ReactNode;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length || rows.every((row) => row.value === 0)) return <p className="adm-empty">{empty}</p>;
  return (
    <ol className="adm-rank">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="adm-rank-name">
            {render ? render(row) : row.name}
            {row.note ? <small>{row.note}</small> : null}
          </span>
          <span className="adm-rank-bar" aria-hidden="true">
            <i style={{ width: `${(row.value / max) * 100}%` }} data-zero={row.value === 0 ? "true" : undefined} />
          </span>
          <span className="adm-rank-count">{num(row.value)}</span>
        </li>
      ))}
    </ol>
  );
}
