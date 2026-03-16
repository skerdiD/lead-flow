import type { ReactNode } from "react";
import { requireCurrentUser } from "@/lib/auth";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  await requireCurrentUser();

  return <>{children}</>;
}