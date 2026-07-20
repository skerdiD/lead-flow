"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateLeadFollowUpAction } from "@/app/dashboard/leads/actions";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
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
  readOnly?: boolean;
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
  readOnly = false,
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
      className="rounded-3xl border bg-background p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Next follow-up
          </h2>
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lead-follow-up-date">Date</Label>
          <Input
            id="lead-follow-up-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={isPending || readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as FollowUpPriority)}
            disabled={isPending || readOnly}
          >
            <SelectTrigger aria-label="Follow-up priority">
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
            disabled={isPending || readOnly}
          >
            <SelectTrigger aria-label="Follow-up status">
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
          disabled={isPending || readOnly}
        >
          Today
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setDate(addDaysToInputValue(1))}
          disabled={isPending || readOnly}
        >
          Tomorrow
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setDate(addDaysToInputValue(7))}
          disabled={isPending || readOnly}
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
          className="min-h-20 resize-y"
          placeholder="What should happen next, who needs a reply, and what context matters?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isPending || readOnly}
          maxLength={1000}
        />
      </div>

      {readOnly ? (
        <DemoReadOnlyHint
          className="mt-4"
          message="Demo follow-up dates and overdue reminders are fixed so visitors can review realistic next-step states."
        />
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {note.trim().length}/1000 characters
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isPending || readOnly || (!hasFollowUp && priority === "medium" && status === "pending")}
          >
            Clear
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending || readOnly || !hasChanges}>
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
