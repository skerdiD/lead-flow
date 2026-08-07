"use client";

import { SlidersHorizontal } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ResponsiveFilterPanel({
  activeCount,
  children,
  className,
}: {
  activeCount: number;
  children: React.ReactNode;
  className?: string;
}) {
  const desktop = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 640px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );

  if (desktop) {
    return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
  }

  return (
      <div>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11 w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters
              </span>
              {activeCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground" aria-label={`${activeCount} active filters`}>
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl p-0">
            <SheetHeader className="sticky top-0 z-10 border-b bg-background px-4 py-4 text-left">
              <SheetTitle>Filter results</SheetTitle>
              <SheetDescription>Refine the current list. Changes apply immediately.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 p-4 [&_button]:min-h-11 [&_select]:min-h-11">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      </div>
  );
}
