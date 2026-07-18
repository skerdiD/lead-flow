"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkDeleteLeadsAction,
  bulkUpdateLeadStatusAction,
  deleteLeadAction,
  restoreLeadAction,
} from "@/app/dashboard/leads/actions";
import { ExportLeadsMenu } from "@/components/leads/export-leads-menu";
import { LeadFollowUpBadge } from "@/components/leads/lead-follow-up-badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  LEAD_STATUSES,
  type FollowUpPriority,
  type FollowUpStatus,
  type LeadStatus,
} from "@/lib/constants/leads";
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
  owner: { name: string; imageUrl: string | null } | null;
  nextFollowUpDate: string | null;
  followUpNote: string | null;
  followUpPriority: FollowUpPriority;
  followUpStatus: FollowUpStatus;
  isArchived: boolean;
  archivedAt: string | null;
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
  archiveView?: boolean;
  readOnly?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: LeadsTableSortDirection;
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  }

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

  if (page <= 3) return [1, 2, 3, 4, "ellipsis", pageCount] as const;

  if (page >= pageCount - 2) {
    return [
      1,
      "ellipsis",
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ] as const;
  }

  return [
    1,
    "ellipsis",
    page - 1,
    page,
    page + 1,
    "ellipsis",
    pageCount,
  ] as const;
}

function LeadAvatar({
  name,
  imageUrl,
  size = "default",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "default";
}) {
  return (
    <Avatar size={size} className={cn(size === "default" && "size-9")}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
      <AvatarFallback className="font-semibold">
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function OwnerDisplay({
  owner,
  compact = false,
}: {
  owner: LeadRow["owner"];
  compact?: boolean;
}) {
  if (!owner) {
    return <span className="text-sm text-muted-foreground">Unassigned</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <LeadAvatar name={owner.name} imageUrl={owner.imageUrl} size="sm" />
      <span
        className={cn("truncate text-sm text-foreground", compact && "text-xs")}
        title={owner.name}
      >
        {owner.name}
      </span>
    </span>
  );
}

function LeadRowActions({
  lead,
  readOnly,
  canUpdate,
  canDelete,
}: {
  lead: LeadRow;
  readOnly: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function restoreLead() {
    startTransition(async () => {
      const result = await restoreLeadAction(lead.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  function archiveLead() {
    startTransition(async () => {
      const result = await deleteLeadAction(lead.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setArchiveOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Actions for ${lead.fullName}`}
            data-testid={`lead-actions-${lead.id}`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/leads/${lead.id}`}
              data-testid={`view-lead-${lead.id}`}
            >
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>
          {!readOnly && canUpdate ? (
            <DropdownMenuItem asChild>
              <Link
                href={`/dashboard/leads/${lead.id}/edit`}
                aria-label="Edit lead"
                data-testid={`edit-lead-${lead.id}`}
              >
                <Pencil />
                Edit lead
              </Link>
            </DropdownMenuItem>
          ) : null}
          {!readOnly && canDelete ? (
            <>
              <DropdownMenuSeparator />
              {lead.isArchived ? (
                <DropdownMenuItem onSelect={restoreLead} disabled={isPending}>
                  <RotateCcw />
                  Restore lead
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setArchiveOpen(true)}
                  disabled={isPending}
                >
                  <Archive />
                  Archive lead
                </DropdownMenuItem>
              )}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This hides <span className="font-medium text-foreground">{lead.fullName}</span>{" "}
              from active views while keeping notes, activity, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                archiveLead();
              }}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive lead"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LeadsTable({
  leads,
  totalCount,
  page,
  pageCount,
  pageSize,
  sortBy,
  sortDir,
  archiveView = false,
  readOnly = false,
  canUpdate = false,
  canDelete = false,
  canExport = false,
}: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const desktopSelectAllRef = useRef<HTMLInputElement>(null);
  const mobileSelectAllRef = useRef<HTMLInputElement>(null);

  const leadIdsOnPage = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const selectedLeadIds = useMemo(
    () => leadIdsOnPage.filter((leadId) => selectedIds.has(leadId)),
    [leadIdsOnPage, selectedIds],
  );
  const selectedCount = selectedLeadIds.length;
  const isAllSelected =
    leadIdsOnPage.length > 0 &&
    leadIdsOnPage.every((leadId) => selectedIds.has(leadId));
  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  useEffect(() => {
    if (desktopSelectAllRef.current) {
      desktopSelectAllRef.current.indeterminate = isPartiallySelected;
    }
    if (mobileSelectAllRef.current) {
      mobileSelectAllRef.current.indeterminate = isPartiallySelected;
    }
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

  function handleSort(field: LeadsTableSortField) {
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
  }

  function goToPage(nextPage: number) {
    updateParams((params) => {
      params.set("page", String(Math.max(1, Math.min(pageCount, nextPage))));
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(leadIdsOnPage) : new Set());
    if (!checked) setBulkStatus("");
  }

  function toggleRow(leadId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }

  function handleBulkStatusApply() {
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
  }

  function handleBulkDelete() {
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
  }

  const pageItems = buildPageItems(page, pageCount);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const sortableHead = (
    field: LeadsTableSortField,
    label: string,
    className?: string,
  ) => (
    <TableHead
      className={cn(
        "h-11 bg-muted/70 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 rounded-md py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <SortIcon active={sortBy === field} direction={sortDir} />
      </button>
    </TableHead>
  );

  return (
    <>
      <div className="space-y-3" data-testid="leads-table-section">
        {selectedCount > 0 && !readOnly ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              {selectedCount} lead{selectedCount === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canExport ? (
                <ExportLeadsMenu
                  selectedIds={selectedLeadIds}
                  buttonLabel="Export selected"
                  testId="export-selected-leads"
                />
              ) : null}
              {!archiveView && canUpdate ? (
                <>
                  <Select
                    value={bulkStatus || "none"}
                    onValueChange={setBulkStatus}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="bulk-status-select">
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBulkStatusApply}
                    disabled={!bulkStatus || bulkStatus === "none" || isPending}
                    data-testid="bulk-apply-stage-btn"
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply stage
                  </Button>
                </>
              ) : null}
              {!archiveView && canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  disabled={isPending}
                  data-testid="bulk-delete-btn"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive selected
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className="overflow-hidden rounded-3xl border bg-background shadow-sm"
          data-testid="leads-table-wrapper"
        >
          <div className="hidden md:block" data-testid="leads-desktop-table">
            <Table containerClassName="overflow-hidden" className="table-fixed">
              <colgroup>
                {!readOnly ? <col className="w-11" /> : null}
                <col />
                <col className="w-[7.75rem]" />
                <col className="hidden w-[8.5rem] xl:table-column" />
                <col className="w-[10.75rem]" />
                <col className="hidden w-[10.5rem] xl:table-column" />
                <col className="w-14" />
              </colgroup>
              <TableHeader className="bg-muted/70">
                <TableRow className="border-b bg-muted/70 hover:bg-muted/70">
                  {!readOnly ? (
                    <TableHead className="bg-muted/70 px-3">
                      <input
                        ref={desktopSelectAllRef}
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(event) => toggleSelectAll(event.target.checked)}
                        className="h-4 w-4 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Select all leads on page"
                        data-testid="select-all-leads"
                      />
                    </TableHead>
                  ) : null}
                  {sortableHead("fullName", "Lead")}
                  {sortableHead("status", "Status")}
                  {sortableHead("source", "Source", "hidden xl:table-cell")}
                  <TableHead className="h-11 bg-muted/70 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Next follow-up
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/70 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground xl:table-cell">
                    Owner
                  </TableHead>
                  <TableHead className="h-11 bg-muted/70 px-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="group border-border/60 hover:bg-muted/30 focus-within:bg-muted/30"
                    data-testid={`lead-row-${lead.id}`}
                  >
                    {!readOnly ? (
                      <TableCell className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={(event) => toggleRow(lead.id, event.target.checked)}
                          className="h-4 w-4 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Select ${lead.fullName}`}
                          data-testid={`select-lead-${lead.id}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="min-w-0 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <LeadAvatar name={lead.fullName} />
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="block truncate rounded-sm text-sm font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title={lead.fullName}
                            data-testid={`lead-name-link-${lead.id}`}
                          >
                            {lead.fullName}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground" title={lead.company ?? undefined}>
                            {lead.company?.trim() || "No company"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="hidden px-3 py-3 xl:table-cell">
                      <span className="block truncate text-sm" title={lead.sourceLabel}>
                        {lead.sourceLabel}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LeadFollowUpBadge
                        date={lead.nextFollowUpDate}
                        note={lead.followUpNote}
                        priority={lead.followUpPriority}
                        status={lead.followUpStatus}
                        compact
                      />
                    </TableCell>
                    <TableCell className="hidden px-3 py-3 xl:table-cell">
                      <OwnerDisplay owner={lead.owner} />
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <LeadRowActions
                        lead={lead}
                        readOnly={readOnly}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y md:hidden" data-testid="leads-mobile-list">
            {!readOnly ? (
              <label className="flex items-center gap-2 bg-muted/40 px-4 py-3 text-sm font-medium">
                <input
                  ref={mobileSelectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(event) => toggleSelectAll(event.target.checked)}
                  className="h-4 w-4 rounded border border-input accent-primary"
                  data-testid="select-all-leads-mobile"
                />
                Select all on this page
              </label>
            ) : null}
            {leads.map((lead) => (
              <article
                key={lead.id}
                className="p-4 transition-colors hover:bg-muted/25 focus-within:bg-muted/25"
                data-testid={`lead-card-${lead.id}`}
              >
                <div className="flex items-start gap-3">
                  {!readOnly ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={(event) => toggleRow(lead.id, event.target.checked)}
                      className="mt-2 h-4 w-4 shrink-0 rounded border border-input accent-primary"
                      aria-label={`Select ${lead.fullName}`}
                    />
                  ) : null}
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid={`lead-card-link-${lead.id}`}
                  >
                    <LeadAvatar name={lead.fullName} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold" title={lead.fullName}>
                        {lead.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.company?.trim() || "No company"}
                      </span>
                    </span>
                  </Link>
                  <LeadRowActions
                    lead={lead}
                    readOnly={readOnly}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                </div>
                <div className={cn("mt-4 grid gap-3 text-sm", readOnly ? "grid-cols-2" : "ml-7 grid-cols-2")}>
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">Status · Source</p>
                    <div className="flex min-w-0 items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <span className="truncate text-xs" title={lead.sourceLabel}>
                        {lead.sourceLabel}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">Owner</p>
                    <OwnerDisplay owner={lead.owner} compact />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">Next follow-up</p>
                    <LeadFollowUpBadge
                      date={lead.nextFollowUpDate}
                      note={lead.followUpNote}
                      priority={lead.followUpPriority}
                      status={lead.followUpStatus}
                      compact
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {totalCount}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    updateParams((params) => {
                      params.set("pageSize", value);
                      params.delete("page");
                    })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[76px]" data-testid="rows-per-page-select">
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || isPending}
                  data-testid="pagination-prev-btn"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <div className="hidden items-center gap-1 sm:flex">
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
                        aria-current={item === page ? "page" : undefined}
                        data-testid={`pagination-page-${item}`}
                      >
                        {item}
                      </Button>
                    ),
                  )}
                </div>
                <span className="px-2 text-sm text-muted-foreground sm:hidden">
                  {page} / {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pageCount || isPending}
                  data-testid="pagination-next-btn"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive selected leads?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This hides {selectedCount} selected lead{selectedCount === 1 ? "" : "s"}{" "}
              from active views while keeping notes, activity, and history.
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
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Archive leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
