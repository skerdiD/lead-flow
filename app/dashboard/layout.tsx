import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}