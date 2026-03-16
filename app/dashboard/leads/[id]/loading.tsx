import { cn } from "@/lib/utils";

function Pulse({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export default function LeadDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-8 w-72 max-w-full" />
        <Pulse className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border bg-background p-4 shadow-sm"
          >
            <Pulse className="h-4 w-24" />
            <Pulse className="mt-4 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-background p-6 shadow-sm">
        <Pulse className="h-5 w-24" />
        <Pulse className="mt-2 h-4 w-64" />
        <Pulse className="mt-6 h-24 w-full" />
      </div>
    </div>
  );
}