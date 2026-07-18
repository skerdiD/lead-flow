function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function DealsLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-8.25rem)] flex-col gap-4" aria-label="Loading deals" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-8 w-32" />
          <Pulse className="h-4 w-72 max-w-full" />
        </div>
        <Pulse className="h-10 w-64" />
      </div>
      <div className="flex gap-2 rounded-2xl border bg-background p-3">
        <Pulse className="h-9 flex-1" />
        <Pulse className="hidden h-9 w-36 sm:block" />
        <Pulse className="hidden h-9 w-40 sm:block" />
        <Pulse className="h-9 w-28" />
      </div>
      <div className="hidden min-h-[32rem] flex-1 gap-3 overflow-hidden md:flex">
        {Array.from({ length: 5 }).map((_, column) => (
          <div key={column} className="w-[19rem] shrink-0 rounded-2xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-5 w-7 rounded-full" />
            </div>
            <Pulse className="mt-2 h-3 w-20" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((__, card) => (
                <Pulse key={card} className="h-36 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        <Pulse className="h-28 w-full rounded-2xl" />
        <Pulse className="h-40 w-full rounded-2xl" />
        <Pulse className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
