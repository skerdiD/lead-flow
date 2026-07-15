import type { NotificationType } from "@/lib/constants/notifications";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationDropdownData = {
  notifications: NotificationListItem[];
  unreadCount: number;
  referenceTime: number;
};
