"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error: _error,
  reset,
}: DashboardErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-8 text-center shadow-sm">
        <div className="pointer-events-none absolute -right-14 -top-10 h-36 w-36 rounded-full bg-destructive/10 blur-3xl" />

        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-background/90">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Dashboard unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We could not load your dashboard right now. Retry, then return to your workspace.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
