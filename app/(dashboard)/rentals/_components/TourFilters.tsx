"use client";

import { Search, X } from "lucide-react";
import { FilterBar } from "@/components/ui/data-table";
import { SearchInput, SelectInput } from "@/components/ui/field";
import type { DateSortOrder } from "../_lib/types";

type TourFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  tourStatusFilter: string;
  onTourStatusFilterChange: (value: string) => void;
  invoiceStatusFilter: string;
  onInvoiceStatusFilterChange: (value: string) => void;
  dateSortOrder: DateSortOrder;
  onDateSortOrderChange: (value: DateSortOrder) => void;
  onClear: () => void;
};

export function TourFilters({
  search,
  onSearchChange,
  tourStatusFilter,
  onTourStatusFilterChange,
  invoiceStatusFilter,
  onInvoiceStatusFilterChange,
  dateSortOrder,
  onDateSortOrderChange,
  onClear,
}: TourFiltersProps) {
  const isFiltered = tourStatusFilter !== "All" || invoiceStatusFilter !== "All" || !!search || dateSortOrder !== "newest";

  return (
    <FilterBar>
      <SearchInput
        icon={<Search size={14} />}
        className="basis-full sm:basis-64"
        placeholder="Search tour code, TL, hotel, modems…"
        aria-label="Search tours"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <SelectInput
        className="w-full sm:w-auto!"
        aria-label="Filter by tour status"
        value={tourStatusFilter}
        onChange={(e) => onTourStatusFilterChange(e.target.value)}
      >
        <option value="All">All tour statuses</option>
        <option value="Running">Running</option>
        <option value="Upcoming">Upcoming</option>
        <option value="Finish">Finish</option>
        <option value="Cancel">Cancel</option>
      </SelectInput>
      <SelectInput
        className="w-full sm:w-auto!"
        aria-label="Filter by invoice status"
        value={invoiceStatusFilter}
        onChange={(e) => onInvoiceStatusFilterChange(e.target.value)}
      >
        <option value="All">All invoice statuses</option>
        <option value="Paid">Paid</option>
        <option value="Pending">Pending</option>
        <option value="Unpaid">Unpaid</option>
      </SelectInput>
      <SelectInput
        className="w-full sm:w-auto!"
        aria-label="Sort by start date"
        value={dateSortOrder}
        onChange={(e) => onDateSortOrderChange(e.target.value as DateSortOrder)}
      >
        <option value="newest">Newest date first</option>
        <option value="oldest">Oldest date first</option>
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
