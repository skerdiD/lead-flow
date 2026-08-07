import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/25 shadow-sm",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute rounded-full bg-primary/8 blur-3xl",
          compact ? "-right-10 -top-10 h-32 w-32" : "-right-16 -top-16 h-44 w-44",
        )}
      />
      <div
        className={cn(
          "flex flex-col lg:flex-row lg:items-end lg:justify-between",
          compact ? "gap-3" : "gap-4",
        )}
      >
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}

          <h1
            className={cn(
              "leadflow-page-title text-foreground",
              eyebrow ? "mt-3" : "mt-0",
              compact ? "text-2xl sm:text-3xl" : "sm:text-4xl",
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                compact ? "mt-1.5 leading-5" : "mt-3 leading-6 sm:text-base",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3 [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:min-h-9 sm:[&>*]:flex-none">
            {action}
          </div>
        ) : null}
      </div>
    </section>
  );
}
