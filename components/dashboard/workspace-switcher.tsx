"use client";

import { useTransition } from "react";
import { Building2 } from "lucide-react";
import { switchWorkspaceAction } from "@/app/dashboard/workspace-actions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export function WorkspaceSwitcher({
  currentWorkspaceId,
  currentWorkspaceName,
  workspaces,
  demo,
}: {
  currentWorkspaceId: string;
  currentWorkspaceName: string;
  workspaces: Array<{ id: string; name: string }>;
  demo?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={currentWorkspaceId}
      disabled={pending}
      onValueChange={(workspaceId) => {
        if (workspaceId === currentWorkspaceId) return;
        startTransition(async () => switchWorkspaceAction(workspaceId));
      }}
    >
      <SelectTrigger className="w-11 justify-center px-0 sm:w-[15rem] sm:justify-start sm:px-3 [&>svg:last-child]:hidden sm:[&>svg:last-child]:block" aria-label="Switch workspace">
        <Building2 className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden min-w-0 flex-1 truncate text-left font-medium sm:block">{currentWorkspaceName}</span>
        {demo ? <Badge variant="outline" className="hidden shrink-0 bg-muted/40 lg:inline-flex">Demo</Badge> : null}
      </SelectTrigger>
      <SelectContent align="end" className="max-w-[calc(100vw-2rem)] sm:min-w-[15rem]">
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
