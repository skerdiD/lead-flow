"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateSearchParams } from "@/lib/list-query-state";

export function ListPagination({
  page,
  pageCount,
  totalCount,
  pageSize,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const go = (nextPage: number) => {
    const params = updateSearchParams(
      searchParams,
      { page: Math.max(1, Math.min(pageCount, nextPage)) },
      { resetPage: false },
    );
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination">
      <p className="text-sm text-muted-foreground">Showing {start}-{end} of {totalCount}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => go(page - 1)} disabled={page <= 1 || pending}>
          <ChevronLeft className="mr-1 h-4 w-4" />Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => go(page + 1)} disabled={page >= pageCount || pending}>
          Next<ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
