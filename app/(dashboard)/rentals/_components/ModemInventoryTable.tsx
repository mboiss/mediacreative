"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Copy, Edit2, Eye, MapPin, Plus, Radio, Trash2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableWrap } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateRange, getAssignedTourForModem } from "../_lib/helpers";
import type { ModemItem, ModemSortField, SortOrder, TourRentalLog } from "../_lib/types";

type ModemInventoryTableProps = {
  loading: boolean;
  modems: ModemItem[];
  tourLogs: TourRentalLog[];
  isFiltered: boolean;
  sortField: ModemSortField;
  sortOrder: SortOrder;
  onSort: (field: ModemSortField) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onViewTour: (tour: TourRentalLog) => void;
  onToggleStatus: (id: string) => void;
  onEdit: (modem: ModemItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

function SortableTh({
  field,
  label,
  sortField,
  sortOrder,
  onSort,
}: {
  field: ModemSortField;
  label: string;
  sortField: ModemSortField;
  sortOrder: SortOrder;
  onSort: (field: ModemSortField) => void;
}) {
  const active = sortField === field;
  return (
    <th aria-sort={active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        title={`Sort by ${label}`}
        className="inline-flex cursor-pointer items-center gap-1.5 uppercase tracking-wide hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        {label}
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp size={13} className="text-accent" aria-hidden />
          ) : (
            <ArrowDown size={13} className="text-accent" aria-hidden />
          )
        ) : (
          <ArrowUpDown size={13} className="opacity-40" aria-hidden />
        )}
      </button>
    </th>
  );
}

export function ModemInventoryTable({
  loading,
  modems,
  tourLogs,
  isFiltered,
  sortField,
  sortOrder,
  onSort,
  copiedId,
  onCopy,
  onViewTour,
  onToggleStatus,
  onEdit,
  onDelete,
  onAdd,
}: ModemInventoryTableProps) {
  if (loading) return <LoadingState label="Loading modems..." />;

  if (modems.length === 0) {
    return (
      <EmptyState
        icon={<Wifi size={28} />}
        title={isFiltered ? "No modem units match filter" : "No modem units listed"}
        description={isFiltered ? "Try clearing your search term or filter status." : "Add your first Orbit Mifi unit."}
        action={
          !isFiltered ? (
            <button className="btn btn-primary" onClick={onAdd}>
              <Plus size={14} /> Add Device
            </button>
          ) : undefined
        }
      />
    );
  }

  const sortProps = { sortField, sortOrder, onSort };

  return (
    <TableWrap>
      <table className="data-table min-w-[960px]">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <SortableTh field="device_name" label="Device Name" {...sortProps} />
            <SortableTh field="number" label="SIM Number" {...sortProps} />
            <SortableTh field="ssid" label="Modem / SSID" {...sortProps} />
            <th>Password</th>
            <SortableTh field="status" label="Status" {...sortProps} />
            <th>Assigned Tour & Drop-off</th>
            <th className="text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {modems.map((item, idx) => {
            const assignedTour = getAssignedTourForModem(item, tourLogs);
            const isRented = item.status === "Rented" || !!assignedTour;

            return (
              <tr key={item.id} className={cn(isRented && "bg-accent-bg/40")}>
                <td className="text-xs font-semibold text-fg-subtle">{idx + 1}</td>
                <td>
                  <div className="font-semibold text-fg">{item.device_name}</div>
                </td>
                <td>
                  <div className="whitespace-nowrap font-mono">{item.number}</div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-accent">
                    <Wifi size={13} aria-hidden />
                    {item.ssid}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <code className="rounded-md border border-line bg-inset px-2 py-0.5 font-mono text-xs text-fg">{item.password}</code>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon size-8!"
                      onClick={() => onCopy(item.password, item.id)}
                      aria-label={`Copy password for ${item.ssid}`}
                      title="Copy password"
                    >
                      {copiedId === item.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    </button>
                  </div>
                </td>

                {/* STATUS BADGE WITH TOUR DETAILS LINK */}
                <td>
                  {assignedTour ? (
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        onClick={() => onViewTour(assignedTour)}
                        className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                        title="View tour details"
                      >
                        <StatusBadge status="Rented" icon={<Radio size={11} aria-hidden />} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewTour(assignedTour)}
                        className="cursor-pointer text-xs font-semibold text-accent underline underline-offset-2"
                      >
                        {assignedTour.tourcode}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleStatus(item.id)}
                      className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                      title="Click to toggle status"
                      aria-label={`Status ${item.status}. Click to change status of ${item.ssid}`}
                    >
                      <StatusBadge status={item.status} />
                    </button>
                  )}
                </td>

                {/* ASSIGNED TOUR DETAILS COLUMN */}
                <td>
                  {assignedTour ? (
                    <button
                      type="button"
                      onClick={() => onViewTour(assignedTour)}
                      className="flex cursor-pointer flex-col gap-0.5 text-left"
                      title="View tour details"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-accent">
                        <MapPin size={12} aria-hidden />
                        {assignedTour.location}
                      </span>
                      <span className="text-xs text-fg-muted">
                        TL: <strong className="text-fg">{assignedTour.tl}</strong> •{" "}
                        {formatDateRange(assignedTour.start_date, assignedTour.end_date)}
                      </span>
                    </button>
                  ) : (
                    <div className="text-xs text-fg-subtle">{item.remark || "— Unassigned"}</div>
                  )}
                </td>

                <td>
                  <div className="flex justify-end gap-1.5">
                    {assignedTour && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon text-accent!"
                        onClick={() => onViewTour(assignedTour)}
                        aria-label={`View tour ${assignedTour.tourcode}`}
                        title="View tour details"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.ssid}`}
                      title="Edit device"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete ${item.ssid}`}
                      title="Delete device"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
