"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { CreateAction } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalCreateMenu({ actions }: { actions: readonly CreateAction[] }) {
  const router = useRouter();

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-10 w-10 rounded-xl px-0 sm:w-auto sm:px-3"
          aria-label="Create a CRM record"
        >
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1.5">Create</DropdownMenuLabel>
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <DropdownMenuItem key={action.href} asChild className="p-0">
              <Link
                href={action.href}
                onMouseEnter={() => router.prefetch(action.href)}
                onFocus={() => router.prefetch(action.href)}
                className="flex w-full items-start gap-3 rounded-md px-2 py-2.5"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
