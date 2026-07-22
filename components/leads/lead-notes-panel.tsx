"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createLeadNoteAction,
  deleteLeadNoteAction,
  updateLeadNoteAction,
} from "@/app/dashboard/leads/actions";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type LeadNoteItem = {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type LeadNotesPanelProps = {
  leadId: string;
  notes: LeadNoteItem[];
  currentUserId: string;
  readOnly?: boolean;
  canManageAllNotes?: boolean;
  canDeleteNotes?: boolean;
};

const MAX_NOTE_LENGTH = 2000;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAuthorLabel(noteUserId: string, currentUserId: string) {
  return noteUserId === currentUserId ? "You" : "Workspace member";
}

function getAuthorInitials(label: string) {
  return label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LeadNotesPanel({
  leadId,
  notes,
  currentUserId,
  readOnly = false,
  canManageAllNotes = false,
  canDeleteNotes = false,
}: LeadNotesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [notes],
  );

  const handleCreateNote = () => {
    startTransition(async () => {
      const result = await createLeadNoteAction(leadId, draft);

      if (!result.success) {
        toast.error(result.fieldErrors?.content?.[0] ?? result.message);
        return;
      }

      toast.success(result.message);
      setDraft("");
      router.refresh();
    });
  };

  const handleUpdateNote = (noteId: string) => {
    startTransition(async () => {
      const result = await updateLeadNoteAction(leadId, noteId, editingDraft);

      if (!result.success) {
        toast.error(result.fieldErrors?.content?.[0] ?? result.message);
        return;
      }

      toast.success(result.message);
      setEditingNoteId(null);
      setEditingDraft("");
      router.refresh();
    });
  };

  const handleDeleteNote = (noteId: string) => {
    const confirmed = window.confirm("Delete this note? You cannot undo this action.");

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteLeadNoteAction(leadId, noteId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section id="lead-notes" className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Lead notes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record follow-ups, context, and decisions.
          </p>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </p>
      </div>

      <div id="lead-note-editor" className="mt-5">
        {readOnly ? (
          <DemoReadOnlyHint message="Notes are read-only in this demo so everyone sees the same sample data." />
        ) : (
          <div className="rounded-2xl border bg-muted/20 p-4">
            <Textarea
              id="lead-notes-input"
              placeholder="What changed, what was discussed, or what happens next?"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-24 resize-y"
              maxLength={MAX_NOTE_LENGTH}
              disabled={isPending}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {draft.trim().length}/{MAX_NOTE_LENGTH}
              </p>

              <Button type="button" onClick={handleCreateNote} disabled={isPending || draft.trim().length === 0}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add note
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {sortedNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No notes yet. Add one to record the next step.
          </div>
        ) : (
          sortedNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const canEditNote = canManageAllNotes || note.userId === currentUserId;
            const wasUpdated = note.updatedAt.getTime() !== note.createdAt.getTime();
            const authorLabel = getAuthorLabel(note.userId, currentUserId);

            return (
              <article key={note.id} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>{getAuthorInitials(authorLabel)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{authorLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDateTime(note.createdAt)}
                        {wasUpdated ? ` - Updated ${formatDateTime(note.updatedAt)}` : null}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditingDraft("");
                        }}
                        disabled={isPending}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={isPending || editingDraft.trim().length === 0}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  ) : !readOnly && canEditNote ? (
                    <div className="flex items-center gap-1">
                      {canDeleteNotes ? <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditingDraft(note.content);
                        }}
                        disabled={isPending}
                        aria-label="Edit note"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button> : null}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isPending}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <Textarea
                    value={editingDraft}
                    onChange={(event) => setEditingDraft(event.target.value)}
                    className="mt-3 min-h-24 resize-y"
                    maxLength={MAX_NOTE_LENGTH}
                    disabled={isPending}
                  />
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{note.content}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
