"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateLeadFollowUpAction } from "@/app/dashboard/leads/actions";
import { LeadFollowUpBadge } from "@/components/leads/lead-follow-up-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABELS,
  type FollowUpPriority,
  type FollowUpStatus,
} from "@/lib/constants/leads";

type LeadFollowUpPanelProps = {
  leadId: string;
  followUp: {
    date: Date | null;
    note: string | null;
    priority: FollowUpPriority;
    status: FollowUpStatus;
  };
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function LeadFollowUpPanel({
  leadId,
  followUp,
}: LeadFollowUpPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialDate = useMemo(() => toDateInputValue(followUp.date), [followUp.date]);
  const initialNote = followUp.note ?? "";
  const [date, setDate] = useState(initialDate);
  const [note, setNote] = useState(initialNote);
  const [priority, setPriority] = useState<FollowUpPriority>(followUp.priority);
  const [status, setStatus] = useState<FollowUpStatus>(followUp.status);

  const hasChanges =
    date !== initialDate ||
    note !== initialNote ||
    priority !== followUp.priority ||
    status !== followUp.status;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateLeadFollowUpAction(leadId, {
        nextFollowUpDate: date,
        followUpNote: note,
        followUpPriority: priority,
        followUpStatus: status,
      });

      if (!result.success) {
        toast.error(
          result.fieldErrors?.nextFollowUpDate?.[0] ??
            result.fieldErrors?.followUpNote?.[0] ??
            result.message,
        );
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const handleClear = () => {
    setDate("");
    setNote("");
    setPriority("medium");
    setStatus("pending");
  };

  const hasFollowUp = Boolean(date) || Boolean(note.trim());

  return (
    <section
      id="lead-follow-up"
      className="rounded-3xl border bg-background p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Next follow-up
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the next touchpoint visible so the lead never goes cold.
          </p>
        </div>

        <LeadFollowUpBadge
          date={followUp.date}
          note={followUp.note}
          priority={followUp.priority}
          status={followUp.status}
          compact
        />
      </div>

      <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
        {hasFollowUp ? (
          <p className="text-sm leading-6 text-foreground">
            {note.trim()
              ? note.trim()
              : "A follow-up is scheduled, but there is no context note yet."}
          </p>
        ) : (
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border bg-background">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-foreground">No follow-up scheduled yet</p>
              <p className="mt-1 leading-6">
                Add a date and a short note so the next action is obvious to anyone opening this lead.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_180px_180px]">
        <div className="space-y-2">
          <Label htmlFor="lead-follow-up-date">Date</Label>
          <Input
            id="lead-follow-up-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as FollowUpPriority)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOLLOW_UP_PRIORITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {FOLLOW_UP_PRIORITY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as FollowUpStatus)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOLLOW_UP_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {FOLLOW_UP_STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setDate(addDaysToInputValue(0))}
          disabled={isPending}
        >
          Today
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setDate(addDaysToInputValue(1))}
          disabled={isPending}
        >
          Tomorrow
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setDate(addDaysToInputValue(7))}
          disabled={isPending}
        >
          Next week
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Quick presets
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="lead-follow-up-note">Follow-up note</Label>
        <Textarea
          id="lead-follow-up-note"
          className="min-h-28 resize-y"
          placeholder="What should happen next, who needs a reply, and what context matters?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isPending}
          maxLength={1000}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {note.trim().length}/1000 characters
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isPending || (!hasFollowUp && priority === "medium" && status === "pending")}
          >
            Clear
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending || !hasChanges}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save follow-up
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
