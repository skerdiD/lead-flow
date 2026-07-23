"use server";

import { revalidatePath } from "next/cache";
import {
  getNotificationDropdownData,
  markAllNotificationsAsReadForCurrentUser,
  markNotificationAsReadForCurrentUser,
} from "@/lib/notifications";

function revalidateNotificationShell() {
  revalidatePath("/dashboard", "layout");
}

export async function getNotificationDropdownDataAction() {
  try {
    return { success: true as const, data: await getNotificationDropdownData() };
  } catch {
    return {
      success: false as const,
      message: "We couldn't load notifications right now. Please try again.",
    };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const result = await markNotificationAsReadForCurrentUser(notificationId);

    if (result.success) {
      revalidateNotificationShell();
    }

    return result;
  } catch {
    return {
      success: false as const,
      message: "We couldn't update this notification right now. Please try again.",
    };
  }
}

export async function markAllNotificationsAsReadAction() {
  try {
    const result = await markAllNotificationsAsReadForCurrentUser();

    if (result.success) {
      revalidateNotificationShell();
    }

    return result;
  } catch {
    return {
      success: false as const,
      message: "We couldn't update your notifications right now. Please try again.",
    };
  }
}
