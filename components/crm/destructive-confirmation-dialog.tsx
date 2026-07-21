"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ActionResult = { success: boolean; message: string };

/** Shared accessible pattern for archive and permanent-delete confirmations. */
export function DestructiveConfirmationDialog({ trigger, title, description, confirmLabel, pendingLabel, onConfirm, onSuccess }: {
  trigger: ReactNode; title: string; description: ReactNode; confirmLabel: string; pendingLabel: string;
  onConfirm: () => Promise<ActionResult>; onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) { setError(result.message); return; }
      toast.success(result.message); setOpen(false); onSuccess?.();
    });
  }
  return <AlertDialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); if (!next) setError(null); } }}>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent className="sm:max-w-md"><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription className="leading-6">{description}</AlertDialogDescription></AlertDialogHeader>
      {error ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={(event) => { event.preventDefault(); confirm(); }}>{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{pendingLabel}</> : confirmLabel}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
