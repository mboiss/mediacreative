"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/ui/data-table";
import { SearchInput, SelectInput } from "@/components/ui/field";
import type { ModemSortField, SortOrder } from "../_lib/types";

const STATUS_CHIPS = ["All", "Available", "Rented", "Maintenance"];

type ModemFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortField: ModemSortField;
  sortOrder: SortOrder;
  onSortChange: (field: ModemSortField, order: SortOrder) => void;
  onClear: () => void;
};

export function ModemFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortField,
  sortOrder,
  onSortChange,
  onClear,
}: ModemFiltersProps) {
  const isFiltered = statusFilter !== "All" || !!search || sortField !== "ssid" || sortOrder !== "asc";

  return (
    <FilterBar>
      <SearchInput
        icon={<Search size={14} />}
        className="basis-full sm:basis-64"
        placeholder="Search device, number, SSID or password…"
        aria-label="Search modems"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div role="group" aria-label="Filter by modem status" className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusFilterChange(st)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "border-line-accent bg-accent-bg text-accent"
                  : "border-line text-fg-muted hover:bg-surface-hover hover:text-fg"
              )}
            >
              {st}
            </button>
          );
        })}
      </div>
      <SelectInput
        className="w-full sm:w-auto!"
        aria-label="Sort modems"
        value={`${sortField}-${sortOrder}`}
        onChange={(e) => {
          const [field, order] = e.target.value.split("-") as [ModemSortField, SortOrder];
          onSortChange(field, order);
        }}
      >
        <option value="ssid-asc">Modem / SSID (MC1 → MC46)</option>
        <option value="ssid-desc">Modem / SSID (MC46 → MC1)</option>
        <option value="device_name-asc">Device name (A → Z)</option>
        <option value="device_name-desc">Device name (Z → A)</option>
        <option value="status-asc">Status (Available → Rented → Maint.)</option>
        <option value="status-desc">Status (Maint. → Rented → Available)</option>
        <option value="number-asc">SIM number (low → high)</option>
        <option value="number-desc">SIM number (high → low)</option>
      </SelectInput>
      {isFiltered && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <X size={14} aria-hidden />
          Clear filters
        </button>
      )}
    </FilterBar>
  );
}
