import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoReadOnlyHintProps = {
  className?: string;
  message?: string;
};

const defaultMessage =
  "Demo workspace is view-only. Browse the sample pipeline, tasks, notes, and activity without changing the shared data.";

export function DemoReadOnlyHint({
  className,
  message = defaultMessage,
}: DemoReadOnlyHintProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900",
        className,
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white/70">
        <LockKeyhole className="h-4 w-4" />
      </div>
      <p className="leading-6">{message}</p>
    </div>
  );
}
