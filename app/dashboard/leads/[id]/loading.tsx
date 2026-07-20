import { cn } from "@/lib/utils";

function Pulse({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export default function LeadDetailsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <div className="rounded-3xl border bg-background p-6 shadow-sm sm:p-7">
        <Pulse className="h-6 w-32" />
        <Pulse className="mt-4 h-10 w-80 max-w-full" />
        <Pulse className="mt-3 h-5 w-full max-w-3xl" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border p-4">
              <Pulse className="h-4 w-24" />
              <Pulse className="mt-3 h-7 w-36" />
              <Pulse className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] xl:gap-6">
        <div className="order-2 min-w-0 space-y-5 xl:order-1">
          <div className="rounded-3xl border bg-background p-6 shadow-sm">
            <Pulse className="h-5 w-44" />
            <Pulse className="mt-2 h-4 w-80 max-w-full" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border p-4">
                  <Pulse className="h-4 w-24" />
                  <Pulse className="mt-3 h-5 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-background p-6 shadow-sm">
            <Pulse className="h-5 w-32" />
            <Pulse className="mt-2 h-4 w-72 max-w-full" />
            <Pulse className="mt-5 h-28 w-full" />
          </div>

          <div className="rounded-3xl border bg-background p-6 shadow-sm">
            <Pulse className="h-5 w-32" />
            <Pulse className="mt-2 h-4 w-72 max-w-full" />
            <Pulse className="mt-5 h-32 w-full" />
          </div>

        </div>

        <div className="order-1 min-w-0 space-y-5 xl:order-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border bg-background p-5 shadow-sm">
              <Pulse className="h-5 w-36" />
              <Pulse className="mt-2 h-4 w-56 max-w-full" />
              <Pulse className="mt-5 h-24 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-3xl border bg-background p-6 shadow-sm">
            <Pulse className="h-5 w-28" />
            <Pulse className="mt-2 h-4 w-64 max-w-full" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 2 }).map((__, itemIndex) => (
                <div key={itemIndex} className="rounded-2xl border p-4">
                  <Pulse className="h-4 w-40" />
                  <Pulse className="mt-3 h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
