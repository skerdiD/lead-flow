"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | null | undefined) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials?.toUpperCase() || "U";
}

export function AccountMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Your account";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    // This menu only presents navigation/actions and must not lock document
    // scrolling. A modal scroll lock shifts the dashboard's fixed app shell.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <Avatar className="size-9 ring-1 ring-border">
            <AvatarImage src={user?.imageUrl} alt="" />
            <AvatarFallback className="font-semibold">
              {getInitials(user?.fullName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2">
        <DropdownMenuLabel className="min-w-0 px-2 py-1.5">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {email && email !== displayName ? (
            <span className="mt-0.5 block truncate font-normal text-muted-foreground">
              {email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="p-0">
          <Link
            href="/dashboard/settings#profile"
            className="flex w-full items-center gap-2 px-2 py-2"
          >
            <Settings className="size-4" aria-hidden="true" />
            Profile and settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 px-2 py-2"
          onSelect={() => void signOut({ redirectUrl: "/" })}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
