"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  completeTaskAction,
  reopenTaskAction,
} from "@/app/dashboard/tasks/actions";
import { Button } from "@/components/ui/button";

type TaskStatusToggleProps = {
  taskId: string;
  completed: boolean;
  compact?: boolean;
};

export function TaskStatusToggle({
  taskId,
  completed,
  compact = false,
}: TaskStatusToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useState(completed);

  const handleClick = () => {
    startTransition(async () => {
      setOptimisticCompleted(!completed);

      const result = completed
        ? await reopenTaskAction(taskId)
        : await completeTaskAction(taskId);

      if (!result.success) {
        setOptimisticCompleted(completed);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const isCompleted = isPending ? optimisticCompleted : completed;

  return (
    <Button
      type="button"
      variant={isCompleted ? "ghost" : "outline"}
      size={compact ? "xs" : "sm"}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : isCompleted ? (
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isCompleted ? "Reopen" : "Mark complete"}
    </Button>
  );
}
