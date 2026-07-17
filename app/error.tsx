"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server boundary reports the actual error; avoid sending client details here.
    console.error("Root application error", { digest: error.digest });
  }, [error.digest]);

  return <main className="flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-lg rounded-3xl border bg-background p-8 text-center shadow-sm"><AlertTriangle className="mx-auto h-7 w-7 text-muted-foreground" /><h1 className="mt-5 text-2xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Please retry. If this keeps happening, share the support reference from the failed request.</p><div className="mt-6 flex justify-center gap-3"><Button onClick={reset}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button><Button asChild variant="outline"><Link href="/">Go home</Link></Button></div></div></main>;
}
