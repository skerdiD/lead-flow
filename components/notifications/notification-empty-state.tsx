import { BellRing } from "lucide-react";

export function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center px-5 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BellRing className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">You&apos;re all caught up</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        New updates will appear here.
      </p>
    </div>
  );
}
