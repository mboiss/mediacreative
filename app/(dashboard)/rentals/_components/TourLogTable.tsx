"use client";

import { ArrowDown, ArrowUp, Calendar, CheckCircle2, Clock, Edit2, ExternalLink, Eye, FileText, MapPin, Plus, Share2, Trash2, User } from "lucide-react";
import { TableWrap } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateRange } from "../_lib/helpers";
import type { DateSortOrder, InvoiceStatus, TourRentalLog, TourStatus } from "../_lib/types";
import { InvoiceStatusSelect, TourStatusSelect } from "./StatusSelect";

type TourLogTableProps = {
  loading: boolean;
  /** Total rows after filtering (the current page is `tours`). */
  totalFiltered: number;
  tours: TourRentalLog[];
  dateSortOrder: DateSortOrder;
  onToggleDateSort: () => void;
  onView: (tour: TourRentalLog) => void;
  onWhatsApp: (tour: TourRentalLog) => void;
  onEdit: (tour: TourRentalLog) => void;
  onToggleFinish: (tourcode: string) => void;
  onDelete: (tourcode: string) => void;
  onStatusChange: (tourcode: string, status: TourStatus) => void;
  onInvoiceStatusChange: (tourcode: string, status: InvoiceStatus) => void;
  onNewTour: () => void;
};

export function TourLogTable({
  loading,
  totalFiltered,
  tours,
  dateSortOrder,
  onToggleDateSort,
  onView,
  onWhatsApp,
  onEdit,
  onToggleFinish,
  onDelete,
  onStatusChange,
  onInvoiceStatusChange,
  onNewTour,
}: TourLogTableProps) {
  if (loading) return <LoadingState label="Loading tours..." />;

  if (totalFiltered === 0) {
    return (
      <EmptyState
        icon={<FileText size={28} />}
        title="No tour logs match filter"
        description="Try clearing your search keyword or create a new tour rental order."
        action={
          <button className="btn btn-primary" onClick={onNewTour}>
            <Plus size={14} /> New Tour
          </button>
        }
      />
    );
  }

  return (
    <TableWrap>
      <table className="data-table min-w-[1180px]">
        <thead>
          <tr>
            <th>Tour Code</th>
            <th aria-sort={dateSortOrder === "newest" ? "descending" : "ascending"}>
              <button
                type="button"
                onClick={onToggleDateSort}
                title="Sort by date"
                className="inline-flex cursor-pointer items-center gap-1.5 uppercase tracking-wide text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                Dates & Duration
                {dateSortOrder === "newest" ? <ArrowDown size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />}
              </button>
            </th>
            <th>Drop-off Hotel</th>
            <th>Tour Leader</th>
            <th>Assigned Modems</th>
            <th>Tour Status</th>
            <th>Invoice</th>
            <th>Pax / Guest Remark</th>
            <th className="text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tours.map((t) => (
            <tr key={t.tourcode}>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onView(t)}
                    className="inline-flex cursor-pointer items-center gap-1 font-mono font-bold text-accent underline underline-offset-2"
                    title="Open tour details"
                  >
                    {t.tourcode}
                    <ExternalLink size={11} aria-hidden />
                  </button>
                  {t.notes && (
                    <button
                      type="button"
                      onClick={() => onView(t)}
                      className="inline-flex cursor-pointer items-center justify-center rounded-md border border-warning-border bg-warning-bg p-1 text-warning"
                      aria-label={`Tour ${t.tourcode} has notes — view details`}
                      title="Tour has notes (click to view)"
                    >
                      <FileText size={12} aria-hidden />
                    </button>
                  )}
                </div>
                <div className="text-xs text-fg-subtle">
                  {t.qty > 0 ? `${t.qty} modem${t.qty > 1 ? "s" : ""}` : "No modems"}
                </div>
              </td>
              <td>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-fg">
                    <Calendar size={13} className="shrink-0 text-accent" aria-hidden />
                    <span>{formatDateRange(t.start_date, t.end_date)}</span>
                  </div>
                  <div>
                    <StatusBadge tone="warning" icon={<Clock size={10} aria-hidden />}>
                      {t.days} Days
                    </StatusBadge>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin size={13} className="shrink-0 text-accent" aria-hidden />
                  {t.location}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-accent">
                  <User size={13} aria-hidden />
                  {t.tl}
                </div>
              </td>
              <td>
                {t.modems && t.modems.trim().length > 0 ? (
                  <span className="inline-block rounded-md border border-accent-border bg-accent-bg px-2 py-0.5 font-mono text-xs font-semibold text-fg">
                    {t.modems}
                  </span>
                ) : (
                  <span className="inline-block rounded-md border border-dashed border-neutral-border bg-neutral-bg px-2 py-0.5 text-xs italic text-fg-subtle">
                    Unassigned
                  </span>
                )}
              </td>

              {/* TOUR STATUS INTERACTIVE SELECTOR */}
              <td>
                <TourStatusSelect tourcode={t.tourcode} value={t.status} onChange={(s) => onStatusChange(t.tourcode, s)} />
              </td>

              {/* INVOICE PAID / UNPAID INTERACTIVE SELECTOR */}
              <td>
                <InvoiceStatusSelect
                  tourcode={t.tourcode}
                  value={t.invoice_status}
                  onChange={(s) => onInvoiceStatusChange(t.tourcode, s)}
                />
              </td>
              <td>
                <div className="text-xs">{t.remark || "—"}</div>
              </td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-accent!"
                    onClick={() => onView(t)}
                    aria-label={`View tour ${t.tourcode}`}
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-success!"
                    onClick={() => onWhatsApp(t)}
                    aria-label={`Send tour ${t.tourcode} via WhatsApp`}
                    title="Send order info via WhatsApp"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-accent!"
                    onClick={() => onEdit(t)}
                    aria-label={`Edit tour ${t.tourcode}`}
                    title="Edit tour"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className={t.status === "Finish" ? "btn btn-ghost btn-sm" : "btn btn-success btn-sm"}
                    onClick={() => onToggleFinish(t.tourcode)}
                    title={t.status === "Finish" ? "Re-open tour" : "Mark tour finished"}
                  >
                    <CheckCircle2 size={13} aria-hidden />
                    {t.status === "Finish" ? "Re-open" : "Finish"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-icon"
                    onClick={() => onDelete(t.tourcode)}
                    aria-label={`Delete tour ${t.tourcode}`}
                    title="Delete tour"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
