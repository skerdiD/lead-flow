import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-lg rounded-3xl border bg-background p-8 text-center shadow-sm"><p className="text-sm font-medium text-muted-foreground">404</p><h1 className="mt-2 text-2xl font-semibold">Page not found</h1><p className="mt-2 text-sm text-muted-foreground">The page may have moved or you may not have access to it.</p><Button asChild className="mt-6"><Link href="/dashboard">Return to dashboard</Link></Button></div></main>;
}
