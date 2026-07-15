export function formatUnreadNotificationCount(unreadCount: number) {
  if (unreadCount <= 0) return null;
  return unreadCount > 99 ? "99+" : String(unreadCount);
}

export function getNotificationBellLabel(unreadCount: number) {
  if (unreadCount <= 0) return "Notifications";

  return `${unreadCount > 99 ? "More than 99" : unreadCount} unread notification${
    unreadCount === 1 ? "" : "s"
  }`;
}

export function formatNotificationRelativeTime(date: Date, now = Date.now()) {
  const differenceInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (differenceInSeconds < 60) return "Just now";

  const differenceInMinutes = Math.floor(differenceInSeconds / 60);
  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} minute${differenceInMinutes === 1 ? "" : "s"} ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);
  if (differenceInHours < 24) {
    return `${differenceInHours} hour${differenceInHours === 1 ? "" : "s"} ago`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);
  if (differenceInDays === 1) return "Yesterday";

  return `${differenceInDays} days ago`;
}
