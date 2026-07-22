"use client";

import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { archiveAccountAction, archiveContactAction } from "@/app/dashboard/crm-actions";
import { DestructiveConfirmationDialog } from "@/components/crm/destructive-confirmation-dialog";
import { Button } from "@/components/ui/button";

export function ArchiveRecordButton({ id, kind }: { id: string; kind: "account" | "contact" }) {
  const router = useRouter();
  return <DestructiveConfirmationDialog
    trigger={<Button variant="outline" size="sm"><Archive className="mr-2 h-4 w-4" />Archive</Button>}
    title={`Archive this ${kind}?`}
    description={<>This {kind} will be removed from active views. Linked records and history will stay available.</>}
    confirmLabel={`Archive ${kind}`}
    pendingLabel="Archiving…"
    onConfirm={() => kind === "account" ? archiveAccountAction(id) : archiveContactAction(id)}
    onSuccess={() => { router.push(`/dashboard/${kind}s`); router.refresh(); }}
  />;
}
