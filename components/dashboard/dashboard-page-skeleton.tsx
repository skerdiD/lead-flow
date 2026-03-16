import { cn } from "@/lib/utils";

function Pulse({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-4 w-24" />
        <Pulse className="mt-4 h-8 w-80 max-w-full" />
        <Pulse className="mt-3 h-4 w-full max-w-2xl" />
        <Pulse className="mt-2 h-4 w-3/4 max-w-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border bg-background p-5 shadow-sm"
          >
            <Pulse className="h-4 w-24" />
            <Pulse className="mt-4 h-8 w-16" />
            <Pulse className="mt-6 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-5 w-36" />
        <Pulse className="mt-2 h-4 w-72" />

        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Pulse className="h-4 w-40" />
                <Pulse className="h-4 w-28" />
              </div>
              <Pulse className="h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadsTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-4 w-32" />
        <Pulse className="mt-4 h-8 w-48" />
        <Pulse className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Pulse className="h-10 w-full max-w-xl" />
          <div className="flex gap-3">
            <Pulse className="h-10 w-[220px]" />
            <Pulse className="h-10 w-24" />
            <Pulse className="h-10 w-24" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="space-y-0">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-8 gap-4 border-b px-6 py-4 last:border-b-0"
            >
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <Pulse key={cellIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}