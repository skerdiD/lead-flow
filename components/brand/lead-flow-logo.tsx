import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type LeadFlowLogoProps = ComponentPropsWithoutRef<"span"> & {
  showWordmark?: boolean;
  subtitle?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  subtitleClassName?: string;
};

function LeadFlowMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={cn("size-6", className)}
      fill="none"
    >
      <path
        d="M11 10v20h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M20 15h9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="m26 10 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <circle cx="11" cy="10" r="3.5" fill="currentColor" />
      <circle cx="11" cy="30" r="3.5" fill="currentColor" />
      <circle cx="31" cy="15" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function LeadFlowLogo({
  showWordmark = true,
  subtitle,
  className,
  markClassName,
  wordmarkClassName,
  subtitleClassName,
  ...props
}: LeadFlowLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} {...props}>
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-[0_12px_30px_-16px_rgba(14,165,233,0.75)]",
          markClassName,
        )}
      >
        <LeadFlowMark />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100",
              wordmarkClassName,
            )}
          >
            LeadFlow
          </span>
          {subtitle ? (
            <span
              className={cn(
                "block truncate text-xs text-muted-foreground",
                subtitleClassName,
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
