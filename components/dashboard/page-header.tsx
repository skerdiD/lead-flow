import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border bg-background p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          ) : null}

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
      </div>
    </section>
  );
}