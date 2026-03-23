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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LeadNoteItem = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

type LeadNotesPanelProps = {
  leadId: string;
  notes: LeadNoteItem[];
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

export function LeadNotesPanel({ leadId, notes }: LeadNotesPanelProps) {
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
    const confirmed = window.confirm("Delete this note? This action cannot be undone.");

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
    <section id="lead-notes" className="rounded-3xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Lead notes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep a timeline of follow-ups, context, and decisions.
          </p>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
        <Textarea
          id="lead-notes-input"
          placeholder="Add a note about this lead..."
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

      <div className="mt-5 space-y-3">
        {sortedNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No notes yet. Add your first note to start a clean activity trail.
          </div>
        ) : (
          sortedNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const wasUpdated = note.updatedAt.getTime() !== note.createdAt.getTime();

            return (
              <article key={note.id} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Added {formatDateTime(note.createdAt)}
                    {wasUpdated ? ` - Updated ${formatDateTime(note.updatedAt)}` : null}
                  </p>

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
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
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
                      </Button>
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
                  )}
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
