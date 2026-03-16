export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">
            Welcome back
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            LeadFlow helps you keep your pipeline clean and moving.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Manage leads, update statuses, and stay on top of every opportunity
            from one focused workspace.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Total Leads
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            0
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            New This Week
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            0
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Active Pipeline
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            0
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Closed Deals
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            0
          </p>
        </div>
      </section>
    </div>
  );
}