"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeadFiltersProps = {
  initialSearch?: string;
  initialStatus?: string;
};

export function LeadFilters({
  initialSearch = "",
  initialStatus = "",
}: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  const pushFilters = useCallback((nextSearch: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams);

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    } else {
      params.delete("search");
    }

    if (nextStatus.trim()) {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, router, searchParams]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushFilters(search, status);
  };

  const handleClear = () => {
    setSearch("");
    setStatus("");

    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, company, or email..."
            className="pl-9"
            disabled={isPending}
          />
        </div>

        <div className="w-full sm:w-[220px]">
          <Select
            value={status || "all"}
            onValueChange={(value) => {
              const nextStatus = value === "all" ? "" : (value as LeadStatus);
              setStatus(nextStatus);
              pushFilters(search, nextStatus);
            }}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Searching..." : "Search"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isPending}
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </form>
  );
}
