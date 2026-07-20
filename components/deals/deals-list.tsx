"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { moveDealAction } from "@/app/dashboard/crm-actions";
import type { PipelineDeal } from "@/app/dashboard/deals/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50] as const;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Owner({ owner }: { owner: PipelineDeal["owner"] }) {
  if (!owner) return <span className="text-sm text-muted-foreground">Unassigned</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        {owner.imageUrl ? <AvatarImage src={owner.imageUrl} alt="" /> : null}
        <AvatarFallback className="font-semibold">{initials(owner.name) || "?"}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm" title={owner.name}>
        {owner.name}
      </span>
    </span>
  );
}

function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge variant={stage === "lost" ? "outline" : "secondary"}>{DEAL_STAGE_LABELS[stage]}</Badge>;
}

export function DealsList({
  initialDeals,
  totalCount,
  page,
  pageCount,
  pageSize,
  readOnly,
  referenceTime,
}: {
  initialDeals: PipelineDeal[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  readOnly: boolean;
  referenceTime: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState(initialDeals);
  const [pendingLost, setPendingLost] = useState<PipelineDeal | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [moving, startTransition] = useTransition();

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams);
      mutate(params);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  function requestMove(deal: PipelineDeal, stage: DealStage, reason?: string) {
    if (moving || stage === deal.stage) return;
    if (stage === "lost" && !reason) {
      setPendingLost(deal);
      setLostReason("");
      return;
    }

    const before = deals;
    setDeals((current) =>
      current.map((entry) => (entry.id === deal.id ? { ...entry, stage } : entry)),
    );

    startTransition(async () => {
      const result = await moveDealAction({
        dealId: deal.id,
        stage,
        updatedAt: deal.updatedAt,
        lostReason: reason,
      });
      if (!result.success) {
        setDeals(before);
        toast.error(result.message);
        return;
      }

      setDeals((current) =>
        current.map((entry) =>
          entry.id === deal.id
            ? { ...entry, updatedAt: result.updatedAt, lostReason: reason ?? null }
            : entry,
        ),
      );
      toast.success(result.message);
    });
  }

  function Actions({ deal }: { deal: PipelineDeal }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Actions for ${deal.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/deals/${deal.id}`}>
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>
          {!readOnly ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={moving}>Move to stage</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuLabel>Choose stage</DropdownMenuLabel>
                  {DEAL_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      disabled={stage === deal.stage || moving}
                      onSelect={() => requestMove(deal, stage)}
                    >
                      {DEAL_STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm" data-testid="deals-list">
      <div className="hidden md:block" data-testid="deals-desktop-table">
        <Table containerClassName="overflow-hidden" className="table-fixed">
          <colgroup>
            <col />
            <col className="w-[7.5rem]" />
            <col className="w-[8.5rem]" />
            <col className="w-[9rem]" />
            <col className="hidden w-[10.5rem] xl:table-column" />
            <col className="w-14" />
          </colgroup>
          <TableHeader className="bg-muted/70">
            <TableRow className="hover:bg-muted/70">
              {[
                ["Deal", ""],
                ["Stage", ""],
                ["Value", ""],
                ["Close date", ""],
                ["Owner", "hidden xl:table-cell"],
              ].map(([label, className]) => (
                <TableHead key={label} className={cn("h-11 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
                  {label}
                </TableHead>
              ))}
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => {
              const relationship = deal.accountName ?? deal.contactName ?? deal.leadName ?? "No linked account";
              const overdue = Boolean(deal.expectedCloseAt && !["won", "lost"].includes(deal.stage) && new Date(deal.expectedCloseAt).getTime() < referenceTime);
              return (
                <TableRow key={deal.id} className="hover:bg-muted/30 focus-within:bg-muted/30" data-testid={`deal-list-row-${deal.id}`}>
                  <TableCell className="min-w-0 px-3 py-3">
                    <Link href={`/dashboard/deals/${deal.id}`} className="block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="block truncate text-sm font-semibold" title={deal.name}>{deal.name}</span>
                      <span className="block truncate text-xs text-muted-foreground" title={relationship}>{relationship}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-3"><StageBadge stage={deal.stage} /></TableCell>
                  <TableCell className="px-3 py-3 font-medium">{formatCurrencyFromCents(deal.valueCents, deal.currency)}</TableCell>
                  <TableCell className={cn("px-3 py-3 text-sm", overdue ? "font-semibold text-destructive" : "text-muted-foreground")}>
                    {deal.expectedCloseAt ? DATE_FORMATTER.format(new Date(deal.expectedCloseAt)) : "Not set"}
                    {overdue ? <span className="block text-xs">Overdue</span> : null}
                  </TableCell>
                  <TableCell className="hidden px-3 py-3 xl:table-cell"><Owner owner={deal.owner} /></TableCell>
                  <TableCell className="px-3 py-3 text-right"><Actions deal={deal} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden" data-testid="mobile-deals-list">
        {deals.map((deal) => {
          const relationship = deal.accountName ?? deal.contactName ?? deal.leadName ?? "No linked account";
          return (
            <article key={deal.id} className="p-4" data-testid={`deal-list-card-${deal.id}`}>
              <div className="flex items-start gap-3">
                <Link href={`/dashboard/deals/${deal.id}`} className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="block truncate text-sm font-semibold">{deal.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{relationship}</span>
                </Link>
                <Actions deal={deal} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StageBadge stage={deal.stage} />
                <span className="text-sm font-semibold">{formatCurrencyFromCents(deal.valueCents, deal.currency)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {deal.expectedCloseAt ? DATE_FORMATTER.format(new Date(deal.expectedCloseAt)) : "No close date"}
                </span>
              </div>
              <div className="mt-3 border-t pt-3"><Owner owner={deal.owner} /></div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Showing {rangeStart}-{rangeEnd} of {totalCount}</p>
        <div className="flex items-center justify-between gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => updateParams((params) => { params.set("pageSize", value); params.delete("page"); })}
            disabled={moving}
          >
            <SelectTrigger className="w-[84px]" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>{PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="outline" aria-label="Previous page" disabled={page <= 1 || moving} onClick={() => updateParams((params) => params.set("page", String(page - 1)))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-2 text-sm text-muted-foreground">{page} / {pageCount}</span>
            <Button type="button" size="sm" variant="outline" aria-label="Next page" disabled={page >= pageCount || moving} onClick={() => updateParams((params) => params.set("page", String(page + 1)))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(pendingLost)} onOpenChange={(open) => { if (!open && !moving) setPendingLost(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Mark deal as lost</DialogTitle>
            <DialogDescription>Capture why {pendingLost?.name ?? "this deal"} was lost before closing it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); if (!pendingLost || !lostReason.trim()) return; const deal = pendingLost; const reason = lostReason.trim(); setPendingLost(null); setLostReason(""); requestMove(deal, "lost", reason); }}>
            <Label htmlFor="list-lost-reason">Lost reason *</Label>
            <Input id="list-lost-reason" className="mt-2" value={lostReason} onChange={(event) => setLostReason(event.target.value)} autoFocus maxLength={255} />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setPendingLost(null); setLostReason(""); }} disabled={moving}>Cancel</Button>
              <Button type="submit" disabled={!lostReason.trim() || moving}>Confirm lost</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
