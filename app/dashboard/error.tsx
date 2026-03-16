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
      <div className="w-full max-w-lg rounded-3xl border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The dashboard could not be loaded right now. Please try again.
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