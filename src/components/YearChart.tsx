import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { yearTotal, type Row } from "../data.ts";
import type { Theme } from "../palette.ts";

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface Props {
  rows: Row[];
  series: Series[];
  stacked: boolean;
  theme: Theme;
  selectedYear?: number | null;
  onSelectYear?: (year: number) => void;
}

const R = 4; // rounded data-end radius

/** Rect with only the top corners rounded (square at the baseline). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function makeShape(key: string, stackKeys: string[] | null, color: string) {
  return (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!height || height <= 0) return <g />;
    // In a stack, only the topmost non-zero segment gets the rounded end.
    const isTop = !stackKeys || stackKeys.filter((k) => payload[k] > 0).at(-1) === key;
    // 2px surface gap between stacked segments: trim the segment's top edge.
    const gap = stackKeys && !isTop ? 2 : 0;
    const h = Math.max(height - gap, 0);
    const yy = y + gap;
    const d = isTop ? topRounded(x, yy, width, h, R) : `M${x},${yy} h${width} v${h} h${-width} Z`;
    return <path d={d} fill={color} stroke="none" />;
  };
}

function ChartTooltip({ active, payload, label, series }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  const shown = (series as Series[]).filter((s) => row[s.key] > 0).reverse();
  const total = yearTotal(row, (series as Series[]).map((s) => s.key));
  return (
    <div className="tooltip">
      <div className="tooltip-title">{label}</div>
      {shown.length === 0 && <div className="tooltip-row muted">None</div>}
      {shown.map((s) => (
        <div className="tooltip-row" key={s.key}>
          <span className="swatch" style={{ background: s.color }} />
          <span>{s.label}</span>
          <span className="num">{row[s.key]}</span>
        </div>
      ))}
      {shown.length > 1 && (
        <div className="tooltip-row total">
          <span />
          <span>Total</span>
          <span className="num">{total}</span>
        </div>
      )}
    </div>
  );
}

export function YearChart({ rows, series, stacked, theme, selectedYear, onSelectYear }: Props) {
  const stackKeys = stacked ? series.map((s) => s.key) : null;
  return (
    <div className="chart" role="img" aria-label="Bar chart of counts per year; the reviews are listed below.">
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} barCategoryGap="20%"
          style={onSelectYear ? { cursor: "pointer" } : undefined}
          onClick={(state: any) => {
            const y = Number(state?.activeLabel);
            if (onSelectYear && Number.isFinite(y)) onSelectYear(y);
          }}>
          {selectedYear != null && (
            <ReferenceArea x1={selectedYear} x2={selectedYear} fill={theme.grid} fillOpacity={0.6} ifOverflow="visible" />
          )}
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
            tick={{ fill: theme.muted, fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: theme.muted, fontSize: 12, style: { fontVariantNumeric: "tabular-nums" } }}
          />
          <Tooltip
            cursor={{ fill: theme.grid, opacity: 0.5 }}
            content={<ChartTooltip series={series} />}
            isAnimationActive={false}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "a" : undefined}
              maxBarSize={24}
              fill={s.color}
              shape={makeShape(s.key, stackKeys, s.color)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
