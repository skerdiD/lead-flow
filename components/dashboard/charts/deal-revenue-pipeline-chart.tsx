"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PipelineStageRevenueDatum } from "@/lib/revenue";
import { formatCurrencyFromCents } from "@/lib/revenue";

type DealRevenuePipelineChartProps = {
  data: PipelineStageRevenueDatum[];
  currency: string;
};

const STAGE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--primary)",
];

export function DealRevenuePipelineChart({
  data,
  currency,
}: DealRevenuePipelineChartProps) {
  const totalValue = data.reduce((sum, item) => sum + item.valueCents, 0);
  const topStage =
    data.reduce<PipelineStageRevenueDatum | null>((best, current) => {
      if (!best || current.valueCents > best.valueCents) return current;
      return best;
    }, null) ?? null;

  return (
    <article className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Pipeline by Stage
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Deal value and forecast by sales stage.
          </p>
        </div>

        <div className="rounded-xl border bg-background/90 px-3 py-1.5 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top Stage
          </p>
          <p className="text-sm font-semibold text-foreground">
            {topStage?.label ?? "N/A"}
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:w-fit sm:grid-cols-3">
        <p className="rounded-full border bg-background/80 px-2.5 py-1">
          {formatCurrencyFromCents(totalValue, currency)} total value
        </p>
        <p className="rounded-full border bg-background/80 px-2.5 py-1">
          {topStage?.deals ?? 0} deals in top stage
        </p>
        <p className="rounded-full border bg-background/80 px-2.5 py-1">
          Weighted bars show forecast
        </p>
      </div>

      <div className="relative mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-1)]" />
          Pipeline value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
          Weighted forecast
        </span>
      </div>

      <div className="relative mt-2 h-[280px]">
        {totalValue === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed bg-background/70 px-6 text-center text-sm text-muted-foreground">
            Add deal value to see your revenue forecast.
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 640, height: 280 }}
          >
            <BarChart
              data={data}
              margin={{ top: 12, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                interval={0}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={72}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(value: number) =>
                  formatCurrencyFromCents(value, currency)
                }
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                formatter={(value, name) => [
                  formatCurrencyFromCents(Number(value ?? 0), currency),
                  name === "weightedValueCents" ? "Weighted" : "Value",
                ]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                }}
              />
              <Bar dataKey="valueCents" radius={[8, 8, 0, 0]} maxBarSize={34}>
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.stage}-${index}`}
                    fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="weightedValueCents"
                fill="var(--primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}
