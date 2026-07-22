"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLeadAction } from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";

type DeleteLeadButtonProps = {
  leadId: string;
};

export function DeleteLeadButton({ leadId }: DeleteLeadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    const confirmed = window.confirm(
      "Archive this lead? Its notes and history will stay saved.",
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteLeadAction(leadId);
        toast.success("Lead archived.");
        router.refresh();
      } catch {
        toast.error("We couldn't archive this lead. Try again.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={handleArchive}
      disabled={isPending}
      aria-label="Archive lead"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
    </Button>
  );
}
