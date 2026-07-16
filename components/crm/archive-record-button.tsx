"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { archiveAccountAction, archiveContactAction } from "@/app/dashboard/crm-actions";
import { Button } from "@/components/ui/button";

export function ArchiveRecordButton({ id, kind }: { id: string; kind: "account" | "contact" }) {
  const [pending, startTransition] = useTransition(); const router = useRouter();
  return <Button variant="outline" size="sm" disabled={pending} onClick={() => { if (!window.confirm(`Archive this ${kind}? Linked CRM history will remain available.`)) return; startTransition(async () => { const result = kind === "account" ? await archiveAccountAction(id) : await archiveContactAction(id); if (!result.success) { toast.error(result.message); return; } toast.success(result.message); router.push(`/dashboard/${kind}s`); router.refresh(); }); }}><Archive className="mr-2 h-4 w-4" />{pending ? "Archiving…" : "Archive"}</Button>;
}
