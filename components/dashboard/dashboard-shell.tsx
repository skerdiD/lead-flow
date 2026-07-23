"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  getCreateActionsForUser,
  type NavigationContext,
} from "@/components/dashboard/dashboard-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "leadflow:dashboard-sidebar-collapsed";
const SIDEBAR_COLLAPSED_CHANGE_EVENT = "leadflow:sidebar-collapsed-change";
let sidebarCollapsedFallback = false;

function getServerSidebarCollapsedSnapshot() {
  return false;
}

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return getServerSidebarCollapsedSnapshot();
  }

  try {
    const storedValue = window.localStorage.getItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
    );

    if (storedValue === "true" || storedValue === "false") {
      sidebarCollapsedFallback = storedValue === "true";
    }
  } catch {
    // Keep using the in-memory preference if browser storage is blocked.
  }

  return sidebarCollapsedFallback;
}

function subscribeToSidebarCollapsedPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onStoreChange);
  };
}

function setSidebarCollapsedPreference(collapsed: boolean) {
  sidebarCollapsedFallback = collapsed;

  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
  } catch {
    // The in-memory fallback still lets the sidebar toggle for this session.
  }

  window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
}

type DashboardShellProps = {
  children: React.ReactNode;
  currentWorkspaceName: string;
  navigationContext: NavigationContext;
  roleLabel: string;
  isDemoWorkspace?: boolean;
  searchSlot?: React.ReactNode;
};

export function DashboardShell({
  children,
  currentWorkspaceName,
  navigationContext,
  roleLabel,
  isDemoWorkspace = false,
  searchSlot,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsedPreference,
    getSidebarCollapsedSnapshot,
    getServerSidebarCollapsedSnapshot,
  );

  function toggleSidebarCollapsed() {
    setSidebarCollapsedPreference(!sidebarCollapsed);
  }

  const createActions = getCreateActionsForUser(navigationContext);

  // The dashboard has a fixed app shell, so the document scroll position is
  // unrelated to the content users see. Next resets document scroll for links,
  // but keeps this nested scroll region when the shared layout is preserved.
  // Reset both synchronously before paint so a short route never opens at the
  // previous page's scroll offset.
  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  // Keep scrolling inside the dashboard content region. This prevents a
  // restored document position, browser back/forward navigation, or a full
  // refresh from moving the fixed dashboard chrome out of view.
  useLayoutEffect(() => {
    const { documentElement, body } = document;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 h-dvh overflow-hidden bg-gradient-to-b from-muted/35 via-muted/20 to-background">
      <div className="flex h-full min-h-0">
        <DashboardSidebar
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          navigationContext={navigationContext}
          roleLabel={roleLabel}
        />

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <DashboardTopbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            currentWorkspaceName={currentWorkspaceName}
            isDemoWorkspace={isDemoWorkspace}
            createActions={createActions}
            searchSlot={searchSlot}
          />

          <main
            ref={mainRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 sm:py-7 lg:px-7 [scrollbar-gutter:stable]"
            data-testid="dashboard-scroll-region"
          >
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
