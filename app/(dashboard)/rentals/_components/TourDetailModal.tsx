"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Check, CheckCircle2, Clock, Copy, Edit2, FileText, Info, MapPin, RotateCcw, User, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextArea } from "@/components/ui/field";
import { findModemByCode, formatDateRange } from "../_lib/helpers";
import type { InvoiceStatus, ModemItem, TourRentalLog, TourStatus } from "../_lib/types";
import { InvoiceStatusSelect, TourStatusSelect } from "./StatusSelect";

type TourDetailModalProps = {
  tour: TourRentalLog;
  modems: ModemItem[];
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onClose: () => void;
  onStatusChange: (tourcode: string, status: TourStatus) => void;
  onInvoiceStatusChange: (tourcode: string, status: InvoiceStatus) => void;
  /** Saves the notes (same PUT as before); resolves true when saved. */
  onNotesChange: (tourcode: string, notes: string) => Promise<boolean>;
  onToggleFinish: (tourcode: string) => void;
  onEdit: (tour: TourRentalLog) => void;
};

const NOTES_SAVE_DELAY_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Notes are saved after a short pause in typing (and on blur / close) instead of on every keystroke.
 * The textarea keeps its own draft so a reload after saving never overwrites what is being typed.
 */
function useNotesAutosave(tourcode: string, initial: string, save: (tourcode: string, notes: string) => Promise<boolean>) {
  const [draft, setDraft] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const draftRef = useRef(initial);
  const savedRef = useRef(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const value = draftRef.current;
    if (value === savedRef.current) return;
    const previous = savedRef.current;
    savedRef.current = value;
    setSaveState("saving");
    const ok = await saveRef.current(tourcode, value);
    if (!ok) savedRef.current = previous;
    setSaveState(ok ? (draftRef.current === value ? "saved" : "idle") : "error");
  }, [tourcode]);

  const onChange = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraft(value);
      setSaveState("idle");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), NOTES_SAVE_DELAY_MS);
    },
    [flush]
  );

  // Save anything still pending when the modal closes.
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  return { draft, saveState, onChange, onBlur: flush };
}

function DetailTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-inset px-3 py-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{children}</div>
    </div>
  );
}

export function TourDetailModal({
  tour,
  modems,
  copiedId,
  onCopy,
  onClose,
  onStatusChange,
  onInvoiceStatusChange,
  onNotesChange,
  onToggleFinish,
  onEdit,
}: TourDetailModalProps) {
  const notes = useNotesAutosave(tour.tourcode, tour.notes || "", onNotesChange);

  return (
    <Modal isOpen={!!tour} onClose={onClose} title={`Tour Details — ${tour.tourcode}`} maxWidth={640}>
      <div className="flex flex-col gap-4">
        {/* TOP SUMMARY STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-inset px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Tour Leader</div>
            <div className="flex items-center gap-1.5 text-lg font-bold text-fg">
              <User size={16} className="shrink-0 text-accent" aria-hidden />
              {tour.tl}
            </div>
          </div>
          <TourStatusSelect tourcode={tour.tourcode} value={tour.status} onChange={(s) => onStatusChange(tour.tourcode, s)} />
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailTile label="Drop-off Location / Hotel">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-accent" aria-hidden />
              {tour.location}
            </span>
          </DetailTile>

          <DetailTile label="Rental Dates & Duration">
            <span className="flex flex-wrap items-center gap-1.5">
              <Calendar size={14} className="shrink-0 text-accent" aria-hidden />
              <span>{formatDateRange(tour.start_date, tour.end_date)}</span>
              <StatusBadge tone="neutral" icon={<Clock size={11} aria-hidden />}>
                {tour.days} days
              </StatusBadge>
            </span>
          </DetailTile>

          <DetailTile label="Invoice Payment Status">
            <InvoiceStatusSelect
              tourcode={tour.tourcode}
              value={tour.invoice_status}
              onChange={(s) => onInvoiceStatusChange(tour.tourcode, s)}
            />
          </DetailTile>

          <DetailTile label="Pax / Guest Names Summary">
            <span className="font-medium">{tour.remark || "— No pax remarks recorded"}</span>
          </DetailTile>
        </div>

        {/* FIELD NOTES */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tour-detail-notes" className="flex items-center gap-1.5 text-sm font-semibold text-fg">
              <FileText size={15} className="text-fg-subtle" aria-hidden />
              Notes
            </label>
            <span className="text-xs text-fg-subtle" aria-live="polite">
              {notes.saveState === "saving" && "Saving…"}
              {notes.saveState === "saved" && (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check size={12} aria-hidden /> Saved
                </span>
              )}
              {notes.saveState === "error" && <span className="text-danger">Not saved</span>}
            </span>
          </div>
          <TextArea
            id="tour-detail-notes"
            rows={2}
            className={cn("min-h-16", notes.draft && "border-warning-border!")}
            placeholder="Field notes for this tour (e.g. extra charger needed, modem hand-over instructions, location info)…"
            value={notes.draft}
            onChange={(e) => notes.onChange(e.target.value)}
            onBlur={() => void notes.onBlur()}
          />
          <p className="text-xs text-fg-subtle">Notes save automatically and show a note indicator in the tour list.</p>
        </div>

        {/* ASSIGNED MODEM UNITS */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-fg">
            <Wifi size={15} className="text-accent" aria-hidden />
            Assigned Modem Units ({tour.qty} Units)
          </div>

          {tour.modems && tour.modems.trim().length > 0 ? (
            <ul className="flex flex-col gap-2">
              {tour.modems.split(",").map((rawLabel) => {
                const label = rawLabel.trim();
                if (!label) return null;
                const matchingModem = findModemByCode(modems, label);
                const paxName = tour.device_pax ? tour.device_pax[label] : undefined;
                const modemFullName = matchingModem ? `${matchingModem.device_name} (${matchingModem.ssid})` : label;
                const deviceOnlyName = matchingModem ? matchingModem.device_name : label;
                const nameCopyKey = `name-${label}`;
                const nameCopied = copiedId === nameCopyKey;

                return (
                  <li
                    key={label}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-inset px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="shrink-0 rounded-md border border-accent-border bg-accent-bg px-2 py-0.5 font-mono text-sm font-bold text-accent">
                        {label}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-fg">{modemFullName}</span>
                          {matchingModem && (
                            <button
                              type="button"
                              onClick={() => onCopy(deviceOnlyName, nameCopyKey)}
                              className={cn(
                                "inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold",
                                nameCopied
                                  ? "border-success-border bg-success-bg text-success"
                                  : "border-accent-border bg-accent-bg text-accent"
                              )}
                              title={`Copy ${deviceOnlyName} to clipboard for MyOrbit app`}
                            >
                              {nameCopied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                              {nameCopied ? `Copied ${deviceOnlyName}!` : `Copy ${deviceOnlyName}`}
                            </button>
                          )}
                        </div>
                        {paxName ? (
                          <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-accent">
                            <User size={12} aria-hidden /> Guest Pax: {paxName}
                          </div>
                        ) : matchingModem ? (
                          <div className="font-mono text-xs text-fg-muted">SIM: {matchingModem.number}</div>
                        ) : null}
                      </div>
                    </div>

                    {matchingModem && (
                      <div className="flex items-center gap-1.5">
                        <code className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-fg">
                          {matchingModem.password}
                        </code>
                        <button
                          type="button"
                          onClick={() => onCopy(matchingModem.password, matchingModem.id)}
                          className={cn(
                            "inline-flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-surface-hover",
                            copiedId === matchingModem.id ? "text-success" : "text-fg-subtle"
                          )}
                          aria-label={`Copy WiFi password for ${label}`}
                          title="Copy WiFi password"
                        >
                          {copiedId === matchingModem.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-inset px-3.5 py-3 text-sm text-fg-muted">
              <Info size={16} className="shrink-0 text-fg-subtle" aria-hidden />
              <span>No modems assigned to this tour yet. You can assign modems at any time via &quot;Edit Tour&quot;.</span>
            </div>
          )}
        </div>

        <div className="h-px bg-line" />

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onToggleFinish(tour.tourcode)}>
              {tour.status === "Finish" ? (
                <RotateCcw size={14} aria-hidden />
              ) : (
                <CheckCircle2 size={14} className="text-success" aria-hidden />
              )}
              {tour.status === "Finish" ? "Re-open Tour" : "Mark Finished (Free Modems)"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onEdit(tour)}>
              <Edit2 size={14} aria-hidden />
              Edit Tour
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
