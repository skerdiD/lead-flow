"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkDeleteLeadsAction,
  bulkUpdateLeadStatusAction,
} from "@/app/dashboard/leads/actions";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LEADS_TABLE_PAGE_SIZES,
  type LeadsTableSortDirection,
  type LeadsTableSortField,
} from "@/lib/constants/leads-table";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import { cn } from "@/lib/utils";

type LeadRow = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  sourceLabel: string;
  createdAt: string;
};

type LeadsTableProps = {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  sortBy: LeadsTableSortField;
  sortDir: LeadsTableSortDirection;
};

type SortableColumn = {
  field: LeadsTableSortField;
  label: string;
  className?: string;
};

const sortableColumns: SortableColumn[] = [
  { field: "fullName", label: "Name", className: "px-6" },
  { field: "company", label: "Company" },
  { field: "status", label: "Stage" },
  { field: "source", label: "Source" },
  { field: "createdAt", label: "Created" },
];

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CellFallback({ value }: { value: string | null }) {
  return value ? (
    <span className="text-foreground">{value}</span>
  ) : (
    <span className="text-muted-foreground">-</span>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: LeadsTableSortDirection;
}) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-foreground" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  );
}

function buildPageItems(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, "ellipsis", pageCount] as const;
  }

  if (page >= pageCount - 2) {
    return [1, "ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount] as const;
  }

  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", pageCount] as const;
}

export function LeadsTable({
  leads,
  totalCount,
  page,
  pageCount,
  pageSize,
  sortBy,
  sortDir,
}: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const leadIdsOnPage = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const selectedLeadIds = useMemo(
    () => leadIdsOnPage.filter((leadId) => selectedIds.has(leadId)),
    [leadIdsOnPage, selectedIds],
  );
  const selectedCount = selectedLeadIds.length;

  const isAllSelected =
    leadIdsOnPage.length > 0 && leadIdsOnPage.every((leadId) => selectedIds.has(leadId));
  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isPartiallySelected;
  }, [isPartiallySelected]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams);
      mutate(params);

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const handleSort = (field: LeadsTableSortField) => {
    const nextDirection: LeadsTableSortDirection =
      sortBy === field
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : field === "createdAt"
          ? "desc"
          : "asc";

    updateParams((params) => {
      params.set("sortBy", field);
      params.set("sortDir", nextDirection);
      params.delete("page");
    });
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(pageCount, nextPage));
    updateParams((params) => {
      params.set("page", String(safePage));
    });
  };

  const handlePageSizeChange = (value: string) => {
    updateParams((params) => {
      params.set("pageSize", value);
      params.delete("page");
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      setBulkStatus("");
      return;
    }

    setSelectedIds(new Set(leadIdsOnPage));
  };

  const toggleRow = (leadId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(leadId);
      } else {
        next.delete(leadId);
      }

      return next;
    });
  };

  const handleBulkStatusApply = () => {
    if (!bulkStatus || bulkStatus === "none" || selectedCount === 0) return;

    startTransition(async () => {
      const result = await bulkUpdateLeadStatusAction(selectedLeadIds, bulkStatus);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedIds(new Set());
      setBulkStatus("");
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0) return;

    startTransition(async () => {
      const result = await bulkDeleteLeadsAction(selectedLeadIds);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDeleteOpen(false);
      setSelectedIds(new Set());
      setBulkStatus("");
      router.refresh();
    });
  };

  const pageItems = buildPageItems(page, pageCount);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <>
      <div className="space-y-3">
        {selectedCount > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">
              {selectedCount} lead{selectedCount === 1 ? "" : "s"} selected
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[170px]">
                <Select value={bulkStatus || "none"} onValueChange={setBulkStatus} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Set stage</SelectItem>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleBulkStatusApply}
                disabled={!bulkStatus || bulkStatus === "none" || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Apply stage"
                )}
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/35 hover:bg-muted/35">
                  <TableHead className="w-10 px-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                      className="h-4 w-4 rounded border border-input accent-primary"
                      aria-label="Select all leads on page"
                    />
                  </TableHead>

                  {sortableColumns.map((column) => (
                    <TableHead
                      key={column.field}
                      className={cn(
                        "h-12 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        column.className,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column.field)}
                        className="inline-flex items-center gap-1.5 rounded-md py-0.5 transition-colors hover:text-foreground"
                      >
                        <span>{column.label}</span>
                        <SortIcon active={sortBy === column.field} direction={sortDir} />
                      </button>
                    </TableHead>
                  ))}

                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</TableHead>
                  <TableHead className="w-[180px] px-6 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="group border-b border-border/60 hover:bg-muted/10">
                    <TableCell className="px-3 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={(event) => toggleRow(lead.id, event.target.checked)}
                        className="h-4 w-4 rounded border border-input accent-primary"
                        aria-label={`Select ${lead.fullName}`}
                      />
                    </TableCell>

                    <TableCell className="px-6 py-4 align-middle">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-xs font-semibold text-foreground">
                          {getInitials(lead.fullName)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{lead.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lead.company?.trim() || "No company"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-middle">
                      <div className="min-w-[140px]">
                        <CellFallback value={lead.company} />
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-middle">
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>

                    <TableCell className="py-4 align-middle">
                      <div className="min-w-[150px]">
                        <span className="inline-flex rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-medium text-foreground">
                          {lead.sourceLabel}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-middle text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>

                    <TableCell className="py-4 align-middle">
                      <div className="min-w-[200px]">
                        <CellFallback value={lead.email} />
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-middle">
                      <div className="min-w-[140px]">
                        <CellFallback value={lead.phone} />
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild size="sm" variant="outline" className="h-8 px-2.5">
                          <Link href={`/dashboard/leads/${lead.id}`} aria-label="View lead">
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>

                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/dashboard/leads/${lead.id}/edit`} aria-label="Edit lead">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>

                        <DeleteLeadDialog leadId={lead.id} leadName={lead.fullName} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}-{rangeEnd} of {totalCount}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows</span>
              <div className="w-[84px]">
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEADS_TABLE_PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || isPending}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>

              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant={item === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(item)}
                    disabled={isPending}
                    className="min-w-8"
                  >
                    {item}
                  </Button>
                ),
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount || isPending}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected leads?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This will permanently remove {selectedCount} selected lead{selectedCount === 1 ? "" : "s"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleBulkDelete();
              }}
              disabled={isPending || selectedCount === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete leads"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
