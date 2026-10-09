"use client";

import type { ReactNode } from "react";
import { FileText, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RentalTab } from "../_lib/types";

export function RentalTabs({
  activeTab,
  onChange,
  tourCount,
  modemCount,
}: {
  activeTab: RentalTab;
  onChange: (tab: RentalTab) => void;
  tourCount: number;
  modemCount: number;
}) {
  const tabs: { id: RentalTab; label: string; count: number; icon: ReactNode }[] = [
    { id: "tours", label: "Tour Logs", count: tourCount, icon: <FileText size={15} aria-hidden /> },
    { id: "inventory", label: "Modem Inventory", count: modemCount, icon: <Wifi size={15} aria-hidden /> },
  ];

  return (
    <div role="tablist" aria-label="Rental views" className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`rentals-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`rentals-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
              active ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            {tab.icon}
            {tab.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                active ? "bg-accent-bg text-accent" : "bg-surface-hover text-fg-muted"
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
