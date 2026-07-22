import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardTone = "neutral" | "positive" | "info" | "warning";

type StatCardProps = {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  className?: string;
  tone?: StatCardTone;
  badge?: string;
  helper?: string;
  compact?: boolean;
};

const toneStyles: Record<
  StatCardTone,
  {
    iconWrap: string;
    icon: string;
    badge: string;
    glow: string;
  }
> = {
  neutral: {
    iconWrap: "border-border/70 bg-background/90",
    icon: "text-muted-foreground",
    badge: "border-border/70 bg-background text-muted-foreground",
    glow: "from-foreground/[0.03] via-transparent to-transparent",
  },
  positive: {
    iconWrap: "border-emerald-200/80 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/50",
    icon: "text-emerald-700 dark:text-emerald-300",
    badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300",
    glow: "from-emerald-300/20 via-transparent to-transparent",
  },
  info: {
    iconWrap: "border-sky-200/80 bg-sky-50 dark:border-sky-900/70 dark:bg-sky-950/50",
    icon: "text-sky-700 dark:text-sky-300",
    badge: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-300",
    glow: "from-sky-300/20 via-transparent to-transparent",
  },
  warning: {
    iconWrap: "border-amber-200/80 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/50",
    icon: "text-amber-700 dark:text-amber-300",
    badge: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300",
    glow: "from-amber-300/20 via-transparent to-transparent",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  tone = "neutral",
  badge,
  helper,
  compact = false,
}: StatCardProps) {
  const style = toneStyles[tone];

  return (
    <article
      className={cn(
        "group relative overflow-hidden border bg-background shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        compact ? "rounded-2xl p-4" : "rounded-3xl p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
          style.glow,
        )}
      />

      <div className={cn("relative flex items-start justify-between", compact ? "gap-3" : "gap-4")}>
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p
            className={cn(
              "font-display font-medium tracking-tight text-foreground tabular-nums",
              compact ? "text-3xl leading-none" : "text-3xl",
            )}
          >
            {value}
          </p>
          {helper ? (
            <p
              className={cn(
                "font-medium text-muted-foreground",
                compact ? "pt-0.5 text-sm leading-5" : "text-xs",
              )}
            >
              {helper}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-center border",
            compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl",
            style.iconWrap,
          )}
        >
          <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", style.icon)} />
        </div>
      </div>

      {description || badge ? (
        <div className={cn("relative flex items-center justify-between gap-3", compact ? "mt-3" : "mt-5")}>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        {badge ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              style.badge,
            )}
          >
            {badge}
          </span>
        ) : null}
        </div>
      ) : null}
    </article>
  );
}
