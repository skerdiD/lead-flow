"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { deleteLeadAction, restoreLeadAction } from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteLeadDialogProps = {
  leadId: string;
  leadName: string;
  variant?: "icon" | "button";
};

export function ArchiveLeadDialog({
  leadId,
  leadName,
  variant = "icon",
}: DeleteLeadDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    startTransition(async () => {
      const result = await deleteLeadAction(leadId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);

      if (pathname === `/dashboard/leads/${leadId}`) {
        router.push("/dashboard/leads");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" className="text-muted-foreground hover:text-foreground">
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Archive lead"
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            <span className="font-medium text-foreground">{leadName}</span> will be removed from active views. Its notes and history will stay saved.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleArchive();
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
  );
}

export function RestoreLeadButton({
  leadId,
  variant = "icon",
}: {
  leadId: string;
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreLeadAction(leadId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  if (variant === "button") {
    return (
      <Button type="button" variant="outline" onClick={handleRestore} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="mr-2 h-4 w-4" />
        )}
        Restore
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={handleRestore}
      disabled={isPending}
      aria-label="Restore lead"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
    </Button>
  );
}

export { ArchiveLeadDialog as DeleteLeadDialog };
