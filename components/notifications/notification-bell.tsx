"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CircleDot,
  ClipboardCheck,
  Handshake,
  Loader2,
  UserRoundCheck,
} from "lucide-react";
import {
  getNotificationDropdownDataAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/app/dashboard/notifications/actions";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationListItem } from "@/lib/notifications-types";
import {
  formatNotificationRelativeTime,
  formatUnreadNotificationCount,
  getNotificationBellLabel,
} from "@/lib/notifications-utils";
import { cn } from "@/lib/utils";

function NotificationTypeIcon({ type }: Pick<NotificationListItem, "type">) {
  const className = "h-4 w-4";

  switch (type) {
    case "task_due":
    case "task_overdue":
      return <CalendarClock className={className} aria-hidden="true" />;
    case "task_assigned":
      return <ClipboardCheck className={className} aria-hidden="true" />;
    case "lead_assigned":
      return <UserRoundCheck className={className} aria-hidden="true" />;
    case "deal_stage_changed":
      return <Handshake className={className} aria-hidden="true" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayTime, setDisplayTime] = useState(() => Date.now());
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const badge = formatUnreadNotificationCount(unreadCount);

  const loadNotifications = useCallback(async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    const result = await getNotificationDropdownDataAction();

    if (result.success) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
      setDisplayTime(result.data.referenceTime);
    } else {
      setError(result.message);
    }

    setHasLoaded(true);
    setIsLoading(false);
  }, [hasLoaded, isLoading]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadNotifications]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDisplayTime(Date.now());
      void loadNotifications();
    }
    setOpen(nextOpen);
  }

  function markNotificationReadLocally(notificationId: string, nextUnreadCount: number) {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId && !notification.readAt
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    );
    setUnreadCount(nextUnreadCount);
  }

  function handleNotificationSelect(notification: NotificationListItem) {
    if (isPending) return;

    setError(null);

    if (notification.readAt) {
      setOpen(false);
      if (notification.actionUrl) router.push(notification.actionUrl);
      return;
    }

    startTransition(async () => {
      const result = await markNotificationAsReadAction(notification.id);

      if (!result.success) {
        setError(result.message);
        return;
      }

      markNotificationReadLocally(notification.id, result.unreadCount);
      setOpen(false);

      if (notification.actionUrl) router.push(notification.actionUrl);
    });
  }

  function handleMarkAllAsRead() {
    if (isPending || unreadCount === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await markAllNotificationsAsReadAction();

      if (!result.success) {
        setError(result.message);
        return;
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? new Date(),
        })),
      );
      setUnreadCount(result.unreadCount);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-xl bg-background"
          aria-label={getNotificationBellLabel(unreadCount)}
          data-testid="notification-bell"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {badge ? (
            <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground ring-2 ring-background">
              {badge}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md text-xs font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            onClick={handleMarkAllAsRead}
            disabled={isPending || isLoading || unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {error ? (
          <p role="alert" className="mx-3 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {isPending || (isLoading && !hasLoaded) ? (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Updating notifications…
          </div>
        ) : null}

        {!isLoading && notifications.length === 0 ? (
          <NotificationEmptyState />
        ) : (
          <div className="max-h-[min(31rem,calc(100dvh-7rem))] overflow-y-auto p-1.5">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleNotificationSelect(notification);
                  }}
                  disabled={isPending}
                  className={cn(
                    "mb-1 min-h-20 cursor-pointer items-start gap-3 rounded-xl px-3 py-3 last:mb-0",
                    isUnread && "bg-muted/65",
                  )}
                  aria-label={`${notification.title}. ${notification.message}. ${isUnread ? "Unread." : "Read."}`}
                >
                  <span className="mt-0.5 rounded-lg border bg-background p-1.5 text-muted-foreground">
                    <NotificationTypeIcon type={notification.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 break-words text-sm text-foreground",
                          isUnread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {notification.title}
                      </span>
                      {isUnread ? (
                        <CircleDot
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-primary text-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {formatNotificationRelativeTime(notification.createdAt, displayTime)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
