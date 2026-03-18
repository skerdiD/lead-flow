import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardTone = "neutral" | "positive" | "info" | "warning";

type StatCardProps = {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  className?: string;
  tone?: StatCardTone;
  badge?: string;
  helper?: string;
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
    iconWrap: "border-emerald-200/80 bg-emerald-50",
    icon: "text-emerald-700",
    badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    glow: "from-emerald-300/20 via-transparent to-transparent",
  },
  info: {
    iconWrap: "border-sky-200/80 bg-sky-50",
    icon: "text-sky-700",
    badge: "border-sky-200/80 bg-sky-50 text-sky-700",
    glow: "from-sky-300/20 via-transparent to-transparent",
  },
  warning: {
    iconWrap: "border-amber-200/80 bg-amber-50",
    icon: "text-amber-700",
    badge: "border-amber-200/80 bg-amber-50 text-amber-700",
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
}: StatCardProps) {
  const style = toneStyles[tone];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-background p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
          style.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {helper ? (
            <p className="text-xs font-medium text-muted-foreground">{helper}</p>
          ) : null}
        </div>

        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", style.iconWrap)}>
          <Icon className={cn("h-5 w-5", style.icon)} />
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
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
    </article>
  );
}
