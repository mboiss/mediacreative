"use client";

import { ArrowDown, ArrowUp, CheckCircle2, Clock, Edit2, Eye, FileText, MapPin, Plus, RotateCcw, Share2, Trash2 } from "lucide-react";
import { TableWrap } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { MobileList, ListCard } from "@/components/ui/list-card";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
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

function modemCountLabel(qty: number): string {
  return qty > 0 ? `${qty} modem${qty > 1 ? "s" : ""}` : "No modems";
}

/** Tour code that opens the detail modal, plus a small indicator when the tour has notes. */
function TourCodeButton({ tour, onView }: { tour: TourRentalLog; onView: (tour: TourRentalLog) => void }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onView(tour)}
        className="cursor-pointer rounded-sm font-mono font-semibold text-fg hover:text-accent hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
        title="Open tour details"
      >
        {tour.tourcode}
      </button>
      {tour.notes && (
        <span role="img" aria-label="Has notes" title="Tour has notes" className="inline-flex shrink-0 text-warning">
          <FileText size={13} aria-hidden />
        </span>
      )}
    </span>
  );
}

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
          <button type="button" className="btn btn-ghost" onClick={onNewTour}>
            <Plus size={14} aria-hidden /> New Tour
          </button>
        }
      />
    );
  }

  const actionsFor = (t: TourRentalLog, includeToggle: boolean): RowAction[] => [
    { label: "View details", icon: <Eye />, onSelect: () => onView(t) },
    { label: "Send via WhatsApp", icon: <Share2 />, onSelect: () => onWhatsApp(t) },
    { label: "Edit", icon: <Edit2 />, onSelect: () => onEdit(t) },
    {
      label: t.status === "Finish" ? "Re-open tour" : "Mark finished",
      icon: t.status === "Finish" ? <RotateCcw /> : <CheckCircle2 />,
      onSelect: () => onToggleFinish(t.tourcode),
      hidden: !includeToggle,
    },
    { label: "Delete", icon: <Trash2 />, onSelect: () => onDelete(t.tourcode), danger: true },
  ];

  return (
    <>
      <TableWrap className="hidden md:block">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th>Tour</th>
              <th aria-sort={dateSortOrder === "newest" ? "descending" : "ascending"}>
                <button
                  type="button"
                  onClick={onToggleDateSort}
                  title="Sort by date"
                  className="inline-flex cursor-pointer items-center gap-1.5 uppercase tracking-wide text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Dates
                  {dateSortOrder === "newest" ? <ArrowDown size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />}
                </button>
              </th>
              <th>Tour Leader / Hotel</th>
              <th>Status</th>
              <th>Invoice</th>
              <th>Pax / Guest Remark</th>
              <th className="text-right!">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tours.map((t) => {
              const hasModems = !!t.modems && t.modems.trim().length > 0;
              return (
                <tr key={t.tourcode}>
                  <td className="align-top">
                    <TourCodeButton tour={t} onView={onView} />
                    <div className="max-w-44 truncate text-xs text-fg-subtle" title={hasModems ? t.modems : undefined}>
                      {modemCountLabel(t.qty)}
                      {hasModems && <span className="font-mono"> · {t.modems}</span>}
                    </div>
                  </td>
                  <td className="align-top">
                    <div className="whitespace-nowrap font-medium tabular-nums text-fg">{formatDateRange(t.start_date, t.end_date)}</div>
                    <div className="mt-1">
                      <StatusBadge tone="neutral" icon={<Clock size={10} aria-hidden />}>
                        {t.days} days
                      </StatusBadge>
                    </div>
                  </td>
                  <td className="align-top">
                    <div className="max-w-48 truncate font-medium text-fg" title={t.tl}>
                      {t.tl}
                    </div>
                    <div className="flex max-w-48 items-center gap-1 text-xs text-fg-subtle" title={t.location}>
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      <span className="truncate">{t.location}</span>
                    </div>
                  </td>
                  <td className="align-top">
                    <TourStatusSelect tourcode={t.tourcode} value={t.status} onChange={(s) => onStatusChange(t.tourcode, s)} />
                  </td>
                  <td className="align-top">
                    <InvoiceStatusSelect
                      tourcode={t.tourcode}
                      value={t.invoice_status}
                      onChange={(s) => onInvoiceStatusChange(t.tourcode, s)}
                    />
                  </td>
                  <td className="align-top">
                    <div className="line-clamp-2 max-w-56 text-xs" title={t.remark || undefined}>
                      {t.remark || "—"}
                    </div>
                  </td>
                  <td className="align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onToggleFinish(t.tourcode)}
                        title={t.status === "Finish" ? "Re-open tour" : "Mark tour finished"}
                        aria-label={t.status === "Finish" ? `Re-open tour ${t.tourcode}` : `Mark tour ${t.tourcode} finished`}
                      >
                        {t.status === "Finish" ? (
                          <RotateCcw size={13} aria-hidden />
                        ) : (
                          <CheckCircle2 size={13} className="text-success" aria-hidden />
                        )}
                        {t.status === "Finish" ? "Re-open" : "Finish"}
                      </button>
                      <RowActions actions={actionsFor(t, false)} label={`Actions for tour ${t.tourcode}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      <MobileList>
        {tours.map((t) => (
          <ListCard
            key={t.tourcode}
            title={<TourCodeButton tour={t} onView={onView} />}
            subtitle={`${t.tl} · ${t.location}`}
            value={<span className="text-xs font-medium">{formatDateRange(t.start_date, t.end_date)}</span>}
            meta={
              <>
                <TourStatusSelect tourcode={t.tourcode} value={t.status} onChange={(s) => onStatusChange(t.tourcode, s)} />
                <InvoiceStatusSelect
                  tourcode={t.tourcode}
                  value={t.invoice_status}
                  onChange={(s) => onInvoiceStatusChange(t.tourcode, s)}
                />
                <span>
                  {modemCountLabel(t.qty)} · {t.days} days
                </span>
              </>
            }
            actions={<RowActions actions={actionsFor(t, true)} label={`Actions for tour ${t.tourcode}`} />}
          />
        ))}
      </MobileList>
    </>
  );
}
