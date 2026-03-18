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

type SourceOption = {
  label: string;
  count: number;
};

type LeadFiltersProps = {
  initialSearch?: string;
  initialStatus?: string;
  initialSource?: string;
  sourceOptions?: SourceOption[];
};

export function LeadFilters({
  initialSearch = "",
  initialStatus = "",
  initialSource = "",
  sourceOptions = [],
}: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState(initialSource);

  const pushFilters = useCallback(
    (nextSearch: string, nextStatus: string, nextSource: string) => {
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

      if (nextSource.trim()) {
        params.set("source", nextSource);
      } else {
        params.delete("source");
      }

      params.delete("page");

      const queryString = params.toString();

      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushFilters(search, status, source);
  };

  const handleClear = () => {
    setSearch("");
    setStatus("");
    setSource("");

    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.delete("status");
    params.delete("source");
    params.delete("page");

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative w-full sm:min-w-[280px] sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, company, email, or source..."
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
              pushFilters(search, nextStatus, source);
            }}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {LEAD_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[220px]">
          <Select
            value={source || "all"}
            onValueChange={(value) => {
              const nextSource = value === "all" ? "" : value;
              setSource(nextSource);
              pushFilters(search, status, nextSource);
            }}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((item) => (
                <SelectItem key={item.label} value={item.label}>
                  {item.label} ({item.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Applying..." : "Apply"}
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
