"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Eye,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { moveDealAction } from "@/app/dashboard/crm-actions";
import type {
  DealStageTotal,
  PipelineDeal,
} from "@/app/dashboard/deals/queries";
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
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { cn } from "@/lib/utils";

type Board = Record<DealStage, PipelineDeal[]>;
type Totals = Record<DealStage, DealStageTotal>;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isOverdue(value: string | null, stage: DealStage, referenceTime: number) {
  return Boolean(
    value &&
      !["won", "lost"].includes(stage) &&
      new Date(value).getTime() < referenceTime,
  );
}

function formatCloseDate(value: string | null) {
  if (!value) return "No close date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No close date" : DATE_FORMATTER.format(date);
}

function StageValue({ total }: { total: DealStageTotal }) {
  if (total.values.length === 0) {
    return <span>{formatCurrencyFromCents(0, "USD")}</span>;
  }

  return (
    <span className="truncate" title={total.values.map((value) => formatCurrencyFromCents(value.valueCents, value.currency)).join(" · ")}>
      {total.values
        .slice(0, 2)
        .map((value) => formatCurrencyFromCents(value.valueCents, value.currency))
        .join(" · ")}
      {total.values.length > 2 ? ` +${total.values.length - 2}` : ""}
    </span>
  );
}

function Owner({ owner }: { owner: PipelineDeal["owner"] }) {
  if (!owner) {
    return <span className="text-xs text-muted-foreground">Unassigned</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        {owner.imageUrl ? <AvatarImage src={owner.imageUrl} alt="" /> : null}
        <AvatarFallback className="font-semibold">
          {getInitials(owner.name) || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs text-muted-foreground" title={owner.name}>
        {owner.name}
      </span>
    </span>
  );
}

function DealActions({
  deal,
  readOnly,
  moving,
  move,
}: {
  deal: PipelineDeal;
  readOnly: boolean;
  moving: boolean;
  move: (deal: PipelineDeal, stage: DealStage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Actions for ${deal.name}`}
          data-testid={`deal-actions-${deal.id}`}
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
              <DropdownMenuSubTrigger disabled={moving}>
                Move to stage
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuLabel>Choose stage</DropdownMenuLabel>
                {DEAL_STAGES.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    disabled={stage === deal.stage || moving}
                    onSelect={() => move(deal, stage)}
                  >
                    {DEAL_STAGE_LABELS[stage]}
                    {stage === deal.stage ? (
                      <span className="ml-auto text-xs text-muted-foreground">Current</span>
                    ) : (
                      <ChevronRight className="ml-auto" />
                    )}
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

function DealCard({
  deal,
  readOnly,
  moving,
  draggable = false,
  referenceTime,
  move,
}: {
  deal: PipelineDeal;
  readOnly: boolean;
  moving: boolean;
  draggable?: boolean;
  referenceTime: number;
  move: (deal: PipelineDeal, stage: DealStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggable ? deal.id : `static-${deal.id}`,
    disabled: readOnly || !draggable || moving,
  });
  const overdue = isOverdue(deal.expectedCloseAt, deal.stage, referenceTime);
  const relationship =
    deal.accountName ?? deal.contactName ?? deal.leadName ?? "No linked account";

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-2xl border bg-background p-3 shadow-sm transition-shadow focus-within:ring-1 focus-within:ring-ring",
        isDragging && "z-20 opacity-60 shadow-xl",
      )}
      data-testid={`deal-card-${deal.id}`}
      data-owner-name={deal.owner?.name ?? "Unassigned"}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        {draggable && !readOnly ? (
          <button
            type="button"
            aria-label={`Drag ${deal.name}`}
            className="mt-0.5 inline-flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="line-clamp-2 rounded-sm text-sm font-semibold leading-5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={deal.name}
          >
            {deal.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={relationship}>
            {relationship}
          </p>
        </div>
        <DealActions
          deal={deal}
          readOnly={readOnly}
          moving={moving}
          move={move}
        />
      </div>

      <div className={cn("mt-3", draggable && !readOnly && "ml-7")}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {formatCurrencyFromCents(deal.valueCents, deal.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{deal.probability}% probability</p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "font-semibold text-destructive" : "text-muted-foreground",
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatCloseDate(deal.expectedCloseAt)}
            </p>
            {overdue ? (
              <p className="mt-0.5 text-[0.6875rem] font-medium text-destructive">Overdue</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 border-t pt-2.5">
          <Owner owner={deal.owner} />
        </div>
      </div>
    </article>
  );
}

function PipelineColumn({
  stage,
  deals,
  total,
  readOnly,
  moving,
  referenceTime,
  move,
}: {
  stage: DealStage;
  deals: PipelineDeal[];
  total: DealStageTotal;
  readOnly: boolean;
  moving: boolean;
  referenceTime: number;
  move: (deal: PipelineDeal, stage: DealStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl border bg-muted/20 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
      aria-labelledby={`deal-stage-${stage}`}
      data-testid={`deal-column-${stage}`}
    >
      <header className="sticky top-0 z-10 shrink-0 border-b bg-background/95 px-3.5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 id={`deal-stage-${stage}`} className="truncate text-sm font-semibold">
            {DEAL_STAGE_LABELS[stage]}
          </h2>
          <Badge variant="secondary" className="h-5 min-w-6 justify-center px-1.5 text-xs">
            {total.count}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
          <StageValue total={total} />
        </p>
      </header>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-2.5 [scrollbar-gutter:stable]">
        {deals.length > 0 ? (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              readOnly={readOnly}
              moving={moving}
              draggable
              referenceTime={referenceTime}
              move={move}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed bg-background/60 p-4 text-center text-xs text-muted-foreground">
            No deals in this stage
          </p>
        )}
      </div>
    </section>
  );
}

function updateTotalsForMove(
  totals: Totals,
  deal: PipelineDeal,
  targetStage: DealStage,
) {
  const next = Object.fromEntries(
    DEAL_STAGES.map((stage) => [
      stage,
      {
        count: totals[stage].count,
        values: totals[stage].values.map((value) => ({ ...value })),
      },
    ]),
  ) as Totals;

  const changeValue = (stage: DealStage, delta: number) => {
    const existing = next[stage].values.find(
      (value) => value.currency === deal.currency,
    );
    if (existing) existing.valueCents += delta;
    else next[stage].values.push({ currency: deal.currency, valueCents: delta });
    next[stage].values = next[stage].values.filter(
      (value) => value.valueCents !== 0,
    );
  };

  next[deal.stage].count = Math.max(0, next[deal.stage].count - 1);
  next[targetStage].count += 1;
  changeValue(deal.stage, -deal.valueCents);
  changeValue(targetStage, deal.valueCents);
  return next;
}

export function DealsPipeline({
  initialBoard,
  initialTotals,
  readOnly,
  isTruncated = false,
  referenceTime,
}: {
  initialBoard: Board;
  initialTotals: Totals;
  readOnly: boolean;
  isTruncated?: boolean;
  referenceTime: number;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [totals, setTotals] = useState(initialTotals);
  const [mobileStage, setMobileStage] = useState<DealStage>(() => {
    return DEAL_STAGES.find((stage) => initialTotals[stage].count > 0) ?? "new";
  });
  const [pendingLost, setPendingLost] = useState<PipelineDeal | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [moving, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const allDeals = useMemo(() => Object.values(board).flat(), [board]);

  function requestMove(deal: PipelineDeal, stage: DealStage, reason?: string) {
    if (moving || stage === deal.stage) return;
    if (stage === "lost" && !reason) {
      setPendingLost(deal);
      setLostReason("");
      return;
    }

    const beforeBoard = board;
    const beforeTotals = totals;
    const nextBoard = Object.fromEntries(
      DEAL_STAGES.map((name) => [
        name,
        board[name].filter((entry) => entry.id !== deal.id),
      ]),
    ) as Board;
    const moved = { ...deal, stage };
    nextBoard[stage] = [...nextBoard[stage], moved];
    setBoard(nextBoard);
    setTotals(updateTotalsForMove(totals, deal, stage));
    setAnnouncement(
      `${deal.name} moved to ${DEAL_STAGE_LABELS[stage]}. Saving change.`,
    );

    startTransition(async () => {
      const result = await moveDealAction({
        dealId: deal.id,
        stage,
        updatedAt: deal.updatedAt,
        lostReason: reason,
      });

      if (!result.success) {
        setBoard(beforeBoard);
        setTotals(beforeTotals);
        setAnnouncement(`${deal.name} was returned to ${DEAL_STAGE_LABELS[deal.stage]}.`);
        toast.error(result.message);
        return;
      }

      setBoard((current) => ({
        ...current,
        [stage]: current[stage].map((entry) =>
          entry.id === deal.id
            ? {
                ...entry,
                updatedAt: result.updatedAt,
                lostReason: stage === "lost" ? reason ?? null : null,
              }
            : entry,
        ),
      }));
      setAnnouncement(`${deal.name} is now in ${DEAL_STAGE_LABELS[stage]}.`);
      toast.success(result.message);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="deals-pipeline">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {isTruncated ? (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          Showing the first 300 matching deals. Refine the filters or switch to List for paginated review.
        </p>
      ) : null}

      <div className="hidden min-h-[26rem] flex-1 md:block">
        <DndContext
          sensors={sensors}
          autoScroll
          onDragEnd={({ active, over }) => {
            const deal = allDeals.find((entry) => entry.id === active.id);
            const stage = String(over?.id ?? "") as DealStage;
            if (deal && DEAL_STAGES.includes(stage)) requestMove(deal, stage);
          }}
        >
          <div
            className="h-full min-h-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2"
            role="region"
            aria-label="Deal pipeline stages"
            tabIndex={0}
            data-testid="pipeline-scroll-viewport"
          >
            <div className="flex h-full min-w-max gap-3 pr-5">
              {DEAL_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  deals={board[stage]}
                  total={totals[stage]}
                  readOnly={readOnly}
                  moving={moving}
                  referenceTime={referenceTime}
                  move={requestMove}
                />
              ))}
            </div>
          </div>
        </DndContext>
      </div>

      <div className="min-w-0 space-y-3 md:hidden" data-testid="mobile-deals-pipeline">
        <div className="rounded-2xl border bg-background p-3 shadow-sm">
          <Label htmlFor="mobile-deal-stage">Pipeline stage</Label>
          <Select value={mobileStage} onValueChange={(value) => setMobileStage(value as DealStage)}>
            <SelectTrigger id="mobile-deal-stage" className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {DEAL_STAGE_LABELS[stage]} · {totals[stage].count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {totals[mobileStage].count} deal{totals[mobileStage].count === 1 ? "" : "s"}
            </span>
            <span className="min-w-0 truncate font-medium">
              <StageValue total={totals[mobileStage]} />
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {board[mobileStage].length > 0 ? (
            board[mobileStage].map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                readOnly={readOnly}
                moving={moving}
                referenceTime={referenceTime}
                move={requestMove}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
              No deals in {DEAL_STAGE_LABELS[mobileStage]}.
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(pendingLost)}
        onOpenChange={(open) => {
          if (!open && !moving) {
            setPendingLost(null);
            setLostReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Mark deal as lost
            </DialogTitle>
            <DialogDescription>
              Capture why {pendingLost?.name ?? "this deal"} was lost before closing it.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!pendingLost || !lostReason.trim()) return;
              const deal = pendingLost;
              const reason = lostReason.trim();
              setPendingLost(null);
              setLostReason("");
              requestMove(deal, "lost", reason);
            }}
          >
            <Label htmlFor="lostReason">Lost reason *</Label>
            <Input
              id="lostReason"
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              className="mt-2"
              autoFocus
              maxLength={255}
            />
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingLost(null);
                  setLostReason("");
                }}
                disabled={moving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!lostReason.trim() || moving}>
                Confirm lost
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
