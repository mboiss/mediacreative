"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Copy, Edit2, Eye, Plus, Radio, RefreshCw, Trash2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableWrap } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { MobileList, ListCard } from "@/components/ui/list-card";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateRange, getAssignedTourForModem } from "../_lib/helpers";
import type { ModemItem, ModemSortField, ModemStatus, SortOrder, TourRentalLog } from "../_lib/types";

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

/** Mirrors the cycle in the page's toggleDeviceStatus: Available → Rented → Maintenance → Available. */
function nextModemStatus(status: ModemStatus): ModemStatus {
  return status === "Available" ? "Rented" : status === "Rented" ? "Maintenance" : "Available";
}

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

function CopyPasswordButton({
  item,
  copiedId,
  onCopy,
}: {
  item: ModemItem;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const copied = copiedId === item.id;
  return (
    <button
      type="button"
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-subtle hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      onClick={() => onCopy(item.password, item.id)}
      aria-label={`Copy password for ${item.ssid}`}
      title={copied ? "Copied" : "Copy password"}
    >
      {copied ? <Check size={14} className="text-success" aria-hidden /> : <Copy size={14} aria-hidden />}
    </button>
  );
}

/** Status badge: opens the assigned tour when rented out, otherwise cycles the status on click (as before). */
function ModemStatusButton({
  item,
  assignedTour,
  onViewTour,
  onToggleStatus,
}: {
  item: ModemItem;
  assignedTour: TourRentalLog | undefined;
  onViewTour: (tour: TourRentalLog) => void;
  onToggleStatus: (id: string) => void;
}) {
  if (assignedTour) {
    return (
      <button
        type="button"
        onClick={() => onViewTour(assignedTour)}
        className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-accent"
        title="View tour details"
        aria-label={`Rented for tour ${assignedTour.tourcode}. View tour details`}
      >
        <StatusBadge status="Rented" icon={<Radio size={11} aria-hidden />} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onToggleStatus(item.id)}
      className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-accent"
      title="Click to toggle status"
      aria-label={`Status ${item.status}. Click to change status of ${item.ssid}`}
    >
      <StatusBadge status={item.status} />
    </button>
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
            <button type="button" className="btn btn-ghost" onClick={onAdd}>
              <Plus size={14} aria-hidden /> Add Device
            </button>
          ) : undefined
        }
      />
    );
  }

  const sortProps = { sortField, sortOrder, onSort };

  const rows = modems.map((item) => ({ item, assignedTour: getAssignedTourForModem(item, tourLogs) }));

  const actionsFor = (item: ModemItem, assignedTour: TourRentalLog | undefined): RowAction[] => [
    { label: "View tour", icon: <Eye />, onSelect: () => assignedTour && onViewTour(assignedTour), hidden: !assignedTour },
    { label: "Edit", icon: <Edit2 />, onSelect: () => onEdit(item) },
    {
      label: `Set ${nextModemStatus(item.status)}`,
      icon: <RefreshCw />,
      onSelect: () => onToggleStatus(item.id),
      // While a tour holds the modem its status follows the tour (same rule as the status badge).
      hidden: !!assignedTour,
    },
    { label: "Delete", icon: <Trash2 />, onSelect: () => onDelete(item.id), danger: true },
  ];

  return (
    <>
      <TableWrap className="hidden md:block">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <SortableTh field="ssid" label="Modem / SSID" {...sortProps} />
              <SortableTh field="number" label="SIM Number" {...sortProps} />
              <th>Password</th>
              <SortableTh field="status" label="Status" {...sortProps} />
              <th>Assigned Tour</th>
              <th className="text-right!">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, assignedTour }, idx) => {
              const isRented = item.status === "Rented" || !!assignedTour;
              return (
                <tr key={item.id} className={cn(isRented && "bg-accent-bg/40")}>
                  <td className="text-xs font-semibold tabular-nums text-fg-subtle">{idx + 1}</td>
                  <td>
                    <div className="whitespace-nowrap font-medium text-fg">{item.ssid}</div>
                    <div className="text-xs text-fg-subtle">{item.device_name}</div>
                  </td>
                  <td>
                    <div className="whitespace-nowrap font-mono tabular-nums">{item.number}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <code className="rounded-md border border-line bg-inset px-2 py-0.5 font-mono text-xs text-fg">{item.password}</code>
                      <CopyPasswordButton item={item} copiedId={copiedId} onCopy={onCopy} />
                    </div>
                  </td>
                  <td>
                    <ModemStatusButton item={item} assignedTour={assignedTour} onViewTour={onViewTour} onToggleStatus={onToggleStatus} />
                  </td>
                  <td>
                    {assignedTour ? (
                      <button
                        type="button"
                        onClick={() => onViewTour(assignedTour)}
                        className="flex max-w-64 cursor-pointer flex-col gap-0.5 text-left focus-visible:outline-2 focus-visible:outline-accent"
                        title="View tour details"
                      >
                        <span className="font-mono font-semibold text-fg hover:text-accent">{assignedTour.tourcode}</span>
                        <span className="truncate text-xs text-fg-muted">
                          {assignedTour.tl} · {assignedTour.location}
                        </span>
                        <span className="text-xs tabular-nums text-fg-subtle">
                          {formatDateRange(assignedTour.start_date, assignedTour.end_date)}
                        </span>
                      </button>
                    ) : (
                      <div className="line-clamp-2 max-w-64 text-xs text-fg-subtle" title={item.remark || undefined}>
                        {item.remark || "— Unassigned"}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <RowActions actions={actionsFor(item, assignedTour)} label={`Actions for ${item.ssid}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      <MobileList>
        {rows.map(({ item, assignedTour }) => (
          <ListCard
            key={item.id}
            title={item.ssid}
            subtitle={`${item.device_name} · ${item.number}`}
            meta={
              <>
                <ModemStatusButton item={item} assignedTour={assignedTour} onViewTour={onViewTour} onToggleStatus={onToggleStatus} />
                {assignedTour ? (
                  <button
                    type="button"
                    onClick={() => onViewTour(assignedTour)}
                    className="cursor-pointer font-mono font-semibold text-fg focus-visible:outline-2 focus-visible:outline-accent"
                    title="View tour details"
                  >
                    {assignedTour.tourcode}
                  </button>
                ) : (
                  item.remark && <span className="truncate">{item.remark}</span>
                )}
                <span className="inline-flex items-center gap-0.5">
                  <code className="rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-xs text-fg">{item.password}</code>
                  <CopyPasswordButton item={item} copiedId={copiedId} onCopy={onCopy} />
                </span>
              </>
            }
            actions={<RowActions actions={actionsFor(item, assignedTour)} label={`Actions for ${item.ssid}`} />}
          />
        ))}
      </MobileList>
    </>
  );
}
