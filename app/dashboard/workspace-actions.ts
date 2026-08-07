"use server";

import { revalidatePath } from "next/cache";
import { setActiveWorkspace } from "@/lib/workspaces";

export async function switchWorkspaceAction(workspaceId: string) {
  await setActiveWorkspace(workspaceId);
  revalidatePath("/dashboard", "layout");
}
