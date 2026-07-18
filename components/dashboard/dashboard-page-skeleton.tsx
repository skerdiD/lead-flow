import { cn } from "@/lib/utils";

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-muted via-muted/70 to-muted",
        className,
      )}
    />
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-7">
      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-5 w-24" />
        <Pulse className="mt-4 h-9 w-[28rem] max-w-full" />
        <Pulse className="mt-3 h-4 w-full max-w-2xl" />
        <Pulse className="mt-2 h-4 w-4/5 max-w-xl" />
        <div className="mt-5 flex gap-2">
          <Pulse className="h-7 w-28 rounded-full" />
          <Pulse className="h-7 w-32 rounded-full" />
          <Pulse className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border bg-background p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <Pulse className="h-3.5 w-24" />
                <Pulse className="h-9 w-20" />
              </div>
              <Pulse className="h-11 w-11 rounded-2xl" />
            </div>
            <Pulse className="mt-5 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-3xl border bg-background p-5 shadow-sm">
            <Pulse className="h-5 w-40" />
            <Pulse className="mt-2 h-4 w-72" />
            <Pulse className="mt-5 h-[240px] w-full rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-5 w-36" />
        <Pulse className="mt-2 h-4 w-72" />

        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <div className="space-y-2">
                <Pulse className="h-4 w-44" />
                <Pulse className="h-4 w-28" />
              </div>
              <Pulse className="h-7 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadsTableSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" aria-label="Loading leads" aria-live="polite">
      <div className="rounded-3xl border bg-background p-5 shadow-sm">
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
        <div className="hidden space-y-0 md:block">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_0.8fr_1fr_1fr_3rem] gap-4 border-b px-4 py-4 last:border-b-0 xl:grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_3rem]"
            >
              {Array.from({ length: 5 }).map((__, cellIndex) => (
                <Pulse key={cellIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
        <div className="divide-y md:hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Pulse className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Pulse className="h-4 w-2/3" />
                  <Pulse className="h-3 w-1/2" />
                </div>
                <Pulse className="h-8 w-8" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Pulse className="h-7 w-full" />
                <Pulse className="h-7 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
