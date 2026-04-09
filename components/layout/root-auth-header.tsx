"use client";

import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function RootAuthHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="flex w-full items-center justify-end gap-2 p-4">
      <Show when="signed-out">
        <SignInButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
        <SignUpButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}
