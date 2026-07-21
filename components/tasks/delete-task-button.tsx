"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTaskAction } from "@/app/dashboard/tasks/actions";
import { DestructiveConfirmationDialog } from "@/components/crm/destructive-confirmation-dialog";
import { Button } from "@/components/ui/button";

export function DeleteTaskButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  return <DestructiveConfirmationDialog
    trigger={<Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete task ${taskTitle}`}><Trash2 className="h-4 w-4" /></Button>}
    title={`Delete task “${taskTitle}”?`}
    description="This action cannot be undone. The related lead, deal, contact, and account will not be changed."
    confirmLabel="Delete task"
    pendingLabel="Deleting…"
    onConfirm={() => deleteTaskAction(taskId)}
    onSuccess={() => router.refresh()}
  />;
}
