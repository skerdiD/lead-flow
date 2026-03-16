import Link from "next/link";
import { ArrowLeft, FileSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
          <FileSearch className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Lead not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This lead does not exist, or you do not have access to view it.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/dashboard/leads">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to leads
            </Link>
          </Button>

          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}