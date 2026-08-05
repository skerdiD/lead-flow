"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { updateLeadOwnerAction } from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OwnerOption = {
  userId: string;
  name: string;
};

export function LeadOwnerControl({
  leadId,
  currentOwnerUserId,
  ownerOptions,
  disabled = false,
}: {
  leadId: string;
  currentOwnerUserId: string | null;
  ownerOptions: OwnerOption[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialOwner = currentOwnerUserId ?? "unassigned";
  const [owner, setOwner] = useState(initialOwner);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateLeadOwnerAction(
        leadId,
        owner === "unassigned" ? null : owner,
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <UserRoundCog className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="lead-owner">Assigned owner</Label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Select value={owner} onValueChange={setOwner} disabled={disabled || isPending}>
          <SelectTrigger id="lead-owner" aria-label="Assigned owner">
            <SelectValue placeholder="Choose an owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {ownerOptions.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={disabled || isPending || owner === initialOwner}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Change owner
        </Button>
      </div>
    </div>
  );
}
