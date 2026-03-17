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

type LeadPipelineDatum = {
  status: string;
  leads: number;
  share: number;
};

type LeadPipelineChartProps = {
  data: LeadPipelineDatum[];
};

const SHORT_STATUS_LABELS: Record<string, string> = {
  New: "New",
  Contacted: "Contacted",
  Interested: "Interested",
  "Proposal Sent": "Proposal",
  Closed: "Closed",
  Lost: "Lost",
};

const STATUS_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--primary)",
];

export function LeadPipelineChart({ data }: LeadPipelineChartProps) {
  const totalLeads = data.reduce((sum, item) => sum + item.leads, 0);
  const closedLeads =
    data.find((item) => item.status === "Closed")?.leads ?? 0;
  const closeRate =
    totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

  return (
    <article className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
      <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Pipeline Distribution
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Stage-by-stage view of where your leads currently sit.
          </p>
        </div>

        <div className="rounded-xl border bg-background/90 px-3 py-1.5 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Closed Rate
          </p>
          <p className="text-lg font-semibold text-foreground">{closeRate}%</p>
        </div>
      </div>

      <div className="relative mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="status"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              interval={0}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(value: string) => SHORT_STATUS_LABELS[value] ?? value}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={34}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
              }}
              labelFormatter={(value) => `Stage: ${value}`}
            />
            <Bar dataKey="leads" radius={[9, 9, 0, 0]} maxBarSize={46}>
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.status}-${index}`}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
