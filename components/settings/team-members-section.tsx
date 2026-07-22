"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, Trash2, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWorkspaceAction,
  inviteWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  transferWorkspaceOwnershipAction,
  updateWorkspaceMemberRoleAction,
} from "@/app/dashboard/settings/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceTeamMember } from "@/lib/workspace-team";
import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";

type TeamMembersSectionProps = {
  workspaceName: string;
  canInvite: boolean;
  canTransferOwnership: boolean;
  canDeleteWorkspace: boolean;
  members: WorkspaceTeamMember[];
  filters: { search: string; role: string };
};

const roleBadgeClassNames = {
  owner: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/10",
  admin: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
  member: "border-border bg-muted/50 text-muted-foreground hover:bg-muted/50",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function RoleBadge({ role }: { role: WorkspaceTeamMember["role"] }) {
  return (
    <Badge variant="outline" className={roleBadgeClassNames[role]}>
      {role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member"}
    </Badge>
  );
}

export function TeamMembersSection({
  workspaceName,
  canInvite,
  canTransferOwnership,
  canDeleteWorkspace,
  members,
  filters,
}: TeamMembersSectionProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceTeamMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<WorkspaceTeamMember | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchController = useDebouncedUrlSearch({ initialSearch: filters.search });

  const run = (operation: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await operation();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onSuccess?.();
    });
  };

  const submitInvitation = () => {
    setInviteLink(null);
    setInviteLinkCopied(false);
    startTransition(async () => {
      const result = await inviteWorkspaceMemberAction({ email, role: inviteRole });
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setEmail("");
      setInviteLink(result.inviteUrl ?? null);
    });
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Copy the invite link manually.");
    }
  };

  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
          <UsersRound className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Team</h2>
            <p className="text-sm leading-6 text-muted-foreground">Manage who can access this workspace and what they can manage.</p>
          </div>

          {canInvite ? (
            <form
              className="mt-6 grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_150px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                submitInvitation();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="team-invite-email">Invite teammate</Label>
                <Input
                  id="team-invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "admin" | "member") }>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="self-end" type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Invite
              </Button>
            </form>
          ) : null}

          {inviteLink ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="status">
              <p className="font-medium">Email delivery is unavailable</p>
              <p className="mt-1 leading-6">Share this one-time invitation link securely. It expires in seven days and grants the selected workspace role.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input aria-label="Invite link" value={inviteLink} readOnly className="bg-background font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyInviteLink} className="shrink-0">
                  {inviteLinkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {inviteLinkCopied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex min-w-0 flex-col gap-2 rounded-2xl border bg-muted/20 p-3 sm:flex-row sm:items-center" data-testid="team-filter-toolbar">
            <SearchInput value={searchController.search} onChange={searchController.setSearch} onCommit={searchController.commitSearch} onClear={searchController.clearSearch} isPending={searchController.isPending} inputRef={searchController.inputRef} placeholder="Search team members" ariaLabel="Search team members" className="min-w-0 flex-1" testId="team-search-input" />
            <label className="w-full sm:w-auto"><span className="sr-only">Team role</span><select key={filters.role} defaultValue={filters.role} onChange={(event) => searchController.replace({ memberRole: event.target.value || null })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-[10rem]" aria-label="Team role"><option value="">All roles</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option></select></label>
            {searchController.search || filters.role ? <ClearFiltersButton onClear={() => searchController.clear({ search: null, memberRole: null })} disabled={searchController.isPending} /> : null}
          </div>

          <div className="mt-5 divide-y rounded-2xl border">
            {members.length ? members.map((member) => (
              <div key={member.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{member.name}</p>
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{member.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Joined {dateFormatter.format(new Date(member.createdAt))}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {member.canChangeRole ? (
                    <Select
                      value={member.role}
                      onValueChange={(role) => {
                        if (role === member.role) return;
                        const isDemotion = member.role === "admin" && role === "member";
                        if (isDemotion && !window.confirm("Demote this admin to Member? They will lose team-management access.")) return;
                        run(() => updateWorkspaceMemberRoleAction({ memberId: member.id, role: role as "admin" | "member" }));
                      }}
                    >
                      <SelectTrigger className="w-[132px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  {canTransferOwnership && member.canReceiveOwnership ? (
                    <Button type="button" variant="outline" onClick={() => setTransferTarget(member)}>
                      Transfer ownership
                    </Button>
                  ) : null}
                  {member.canRemove ? (
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setRemoveTarget(member)} aria-label={`Remove ${member.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            )) : <div className="p-8 text-center"><p className="font-medium">No team members match your search.</p><p className="mt-2 text-sm text-muted-foreground">Try another search or clear the filters.</p></div>}
          </div>

          {canDeleteWorkspace ? (
            <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete workspace</p>
                  <p className="mt-1 text-sm text-muted-foreground">Permanently delete this workspace and its CRM data.</p>
                </div>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>Delete workspace</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>{removeTarget?.name ?? "This person"} will lose access to the workspace.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={(event) => { event.preventDefault(); if (removeTarget) run(() => removeWorkspaceMemberAction(removeTarget.id), () => setRemoveTarget(null)); }}>Remove member</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(transferTarget)} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>{transferTarget?.name ?? "This member"} will become the new owner. You will become an admin, and only the new owner can delete the workspace or transfer ownership again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={(event) => { event.preventDefault(); if (transferTarget) run(() => transferWorkspaceOwnershipAction({ memberId: transferTarget.id }), () => setTransferTarget(null)); }}>Transfer ownership</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the workspace, its members, and all CRM data. Enter <strong>{workspaceName}</strong> to continue.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={workspaceName} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending || deleteConfirmation !== workspaceName} onClick={(event) => { event.preventDefault(); run(() => deleteWorkspaceAction({ confirmationName: deleteConfirmation }), () => setDeleteOpen(false)); }}>Delete workspace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
