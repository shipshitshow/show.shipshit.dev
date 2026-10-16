'use client';

import { format, parseISO } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartLine {
  dataKey: string;
  color: string;
  label: string;
}

interface TimeSeriesChartProps<T extends { day: string }> {
  data: T[];
  dataKey: string;
  color?: string;
  formatValue?: (v: number) => string;
  formatTick?: (v: number) => string;
  lines?: ChartLine[];
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value: number; stroke: string; name: string }>;
  label?: string;
  formatValue?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm shadow-xl">
      <div className="text-text-secondary mb-1">
        {label ? format(parseISO(label), 'MMM d') : ''}
      </div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.stroke }}
          />
          <span className="text-text-primary font-semibold">
            {formatValue
              ? formatValue(entry.value)
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeSeriesChart({
  data,
  dataKey,
  color = 'var(--color-accent-red)',
  formatValue,
  formatTick,
  lines,
}: TimeSeriesChartProps<{ day: string }>) {
  const renderLines = lines && lines.length > 0;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart
        data={data}
        margin={{ bottom: 0, left: -16, right: 4, top: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-surface-border)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tickFormatter={(v: string) => format(parseISO(v), 'MMM d')}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatTick ?? ((v: number) => v.toLocaleString())}
          width={52}
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatValue} />}
          cursor={{ stroke: 'var(--color-surface-border)', strokeWidth: 1 }}
        />
        {renderLines ? (
          lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ fill: line.color, r: 4, strokeWidth: 0 }}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ fill: color, r: 4, strokeWidth: 0 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
