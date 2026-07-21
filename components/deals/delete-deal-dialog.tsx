"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDealAction } from "@/app/dashboard/crm-actions";
import { DestructiveConfirmationDialog } from "@/components/crm/destructive-confirmation-dialog";
import { Button } from "@/components/ui/button";

export function DeleteDealDialog({ dealId, dealName }: { dealId: string; dealName: string }) {
  const router = useRouter();
  return <DestructiveConfirmationDialog trigger={<Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
    title={`Delete “${dealName}”?`} description="This permanently deletes this deal. Its account, contact, lead, tasks, activity, and audit history will be preserved."
    confirmLabel="Delete deal" pendingLabel="Deleting…" onConfirm={() => deleteDealAction(dealId)} onSuccess={() => router.push("/dashboard/deals")} />;
}
