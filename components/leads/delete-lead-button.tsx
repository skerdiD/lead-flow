"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLeadAction } from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";

type DeleteLeadButtonProps = {
  leadId: string;
};

export function DeleteLeadButton({ leadId }: DeleteLeadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?",
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteLeadAction(leadId);
        toast.success("Lead deleted successfully.");
        router.refresh();
      } catch {
        toast.error("Something went wrong while deleting the lead.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete lead"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}