"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SourcePerformanceDatum = {
  source: string;
  total: number;
  qualified: number;
  won: number;
  winRate: number;
};

type LeadSourcePerformanceChartProps = {
  data: SourcePerformanceDatum[];
};

function shortenLabel(label: string) {
  return label.length > 14 ? `${label.slice(0, 12)}...` : label;
}

export function LeadSourcePerformanceChart({
  data,
}: LeadSourcePerformanceChartProps) {
  const strongestSource = data.reduce<SourcePerformanceDatum | null>(
    (best, current) => {
      if (!best) {
        return current;
      }

      if (current.won > best.won) {
        return current;
      }

      return best;
    },
    null,
  );

  return (
    <article className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Source Performance
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Compare volume, qualified opportunities, and wins by source.
          </p>
        </div>

        <div className="rounded-xl border bg-background/90 px-3 py-1.5 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Strongest Source
          </p>
          <p
            className="max-w-36 truncate text-sm font-semibold text-foreground"
            title={strongestSource?.source ?? "N/A"}
          >
            {strongestSource?.source ?? "N/A"}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-1)]" />
          Total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-3)]" />
          Qualified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-5)]" />
          Won
        </span>
      </div>

      <div className="relative mt-2 h-[262px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 18, left: 2, bottom: 8 }}
            barCategoryGap={14}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="var(--border)"
            />
            <XAxis
              type="number"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="source"
              width={92}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={shortenLabel}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
              }}
              labelFormatter={(value) => `Source: ${value}`}
            />
            <Bar
              dataKey="total"
              name="Total"
              fill="var(--color-chart-1)"
              radius={[6, 6, 6, 6]}
              maxBarSize={12}
            />
            <Bar
              dataKey="qualified"
              name="Qualified"
              fill="var(--color-chart-3)"
              radius={[6, 6, 6, 6]}
              maxBarSize={12}
            />
            <Bar
              dataKey="won"
              name="Won"
              fill="var(--color-chart-5)"
              radius={[6, 6, 6, 6]}
              maxBarSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
