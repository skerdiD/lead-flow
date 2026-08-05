"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const leadDetailTabs = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes" },
  { id: "deal", label: "Deal" },
] as const;

type LeadDetailTabId = (typeof leadDetailTabs)[number]["id"];

function isLeadDetailTab(value: string): value is LeadDetailTabId {
  return leadDetailTabs.some((tab) => tab.id === value);
}

type LeadDetailTabsProps = Record<LeadDetailTabId, ReactNode>;

export function LeadDetailTabs(props: LeadDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<LeadDetailTabId>("overview");

  useEffect(() => {
    const syncFromHash = () => {
      const requestedTab = window.location.hash.slice(1);
      if (isLeadDetailTab(requestedTab)) setActiveTab(requestedTab);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const selectTab = (tab: LeadDetailTabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  return (
    <section className="min-w-0" data-testid="lead-detail-tabs">
      <div className="max-w-full overflow-x-auto border-b" aria-label="Lead sections">
        <div
          role="tablist"
          aria-label="Lead details"
          className="flex min-w-max gap-1"
        >
          {leadDetailTabs.map((tab) => (
            <button
              key={tab.id}
              id={`lead-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`lead-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={cn(
                "relative min-h-11 px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                activeTab === tab.id &&
                  "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
              )}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const currentIndex = leadDetailTabs.findIndex((item) => item.id === activeTab);
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex =
                  (currentIndex + direction + leadDetailTabs.length) % leadDetailTabs.length;
                const nextTab = leadDetailTabs[nextIndex];
                if (!nextTab) return;
                selectTab(nextTab.id);
                document.getElementById(`lead-tab-${nextTab.id}`)?.focus();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`lead-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`lead-tab-${activeTab}`}
        tabIndex={0}
        className="pt-6 focus-visible:outline-none"
      >
        {props[activeTab]}
      </div>
    </section>
  );
}
