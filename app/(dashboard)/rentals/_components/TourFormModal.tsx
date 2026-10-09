"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import Link from "next/link";
import { Check, Edit2, FileText, Plus, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import type { TourLeader } from "@/lib/tour-leaders";
import { getAssignedTourForModem, toMcCode } from "../_lib/helpers";
import type { InvoiceStatus, ModemItem, TourFormState, TourRentalLog, TourStatus } from "../_lib/types";

type TourFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingTourCode: string | null;
  tourForm: TourFormState;
  setTourForm: Dispatch<SetStateAction<TourFormState>>;
  modems: ModemItem[];
  tourLogs: TourRentalLog[];
  tourLeaders: TourLeader[];
  onToggleModem: (mcCode: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export function TourFormModal({
  isOpen,
  onClose,
  editingTourCode,
  tourForm,
  setTourForm,
  modems,
  tourLogs,
  tourLeaders,
  onToggleModem,
  onSubmit,
}: TourFormModalProps) {
  const sortedModems = [...modems].sort((a, b) =>
    a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" })
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTourCode ? `Edit Tour — ${editingTourCode}` : "New Tour / Modem Rental Order"}
      maxWidth={680}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tour Code" htmlFor="tour-code" required>
            <TextInput
              id="tour-code"
              placeholder="e.g. KIB260805"
              value={tourForm.tourcode}
              onChange={(e) => setTourForm({ ...tourForm, tourcode: e.target.value })}
              required
            />
          </Field>

          <Field
            label="Tour Leader (TL)"
            htmlFor="tour-tl"
            required
            hint={
              <Link href="/settings" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                <Settings size={12} aria-hidden /> Manage TL list
              </Link>
            }
          >
            <SelectInput
              id="tour-tl"
              value={tourForm.tl}
              onChange={(e) => setTourForm({ ...tourForm, tl: e.target.value })}
              required
            >
              <option value="">— Select Tour Leader —</option>
              {tourLeaders.map((tl) => (
                <option key={tl.id} value={tl.name}>
                  {tl.name} {tl.phone ? `(${tl.phone})` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Start Date" htmlFor="tour-start" required>
            <TextInput
              id="tour-start"
              type="date"
              value={tourForm.start_date}
              onChange={(e) => setTourForm({ ...tourForm, start_date: e.target.value })}
              required
            />
          </Field>

          <Field label="End Date" htmlFor="tour-end" required>
            <TextInput
              id="tour-end"
              type="date"
              value={tourForm.end_date}
              onChange={(e) => setTourForm({ ...tourForm, end_date: e.target.value })}
              required
            />
          </Field>

          <Field label="Drop-off Location / Hotel" htmlFor="tour-location" required className="sm:col-span-2">
            <TextInput
              id="tour-location"
              placeholder="e.g. Sri Phala Resort & Spa Sanur"
              value={tourForm.location}
              onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })}
              required
            />
          </Field>

          {/* ASSIGNED MODEMS MULTI-SELECT PILLS FROM INVENTORY */}
          <fieldset className="min-w-0 sm:col-span-2">
            <legend className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Assigned Modems ({tourForm.selectedModemSsids.length} selected)
              </span>
              <span className="text-xs font-medium text-fg-subtle">Click to select / unselect</span>
            </legend>

            <div className="grid max-h-56 grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-1.5 overflow-y-auto rounded-xl border border-line bg-inset p-2">
              {sortedModems.map((m) => {
                const mcCode = toMcCode(m.ssid);
                const isSelected = tourForm.selectedModemSsids.includes(mcCode);
                const assignedTour = getAssignedTourForModem(m, tourLogs);
                const isAssignedToThisTour = editingTourCode && assignedTour?.tourcode === editingTourCode;
                const isAvailable = (m.status === "Available" && !assignedTour) || !!isAssignedToThisTour;
                const blocked = !isAvailable && !isSelected;

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={blocked}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (blocked) return;
                      onToggleModem(mcCode);
                    }}
                    title={
                      !isAvailable
                        ? `Assigned / Unavailable (${assignedTour ? assignedTour.tourcode : m.remark || m.status})`
                        : `Available - Click to select ${mcCode}`
                    }
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 text-xs transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                      isSelected
                        ? "cursor-pointer border-accent bg-accent-bg font-bold text-accent"
                        : isAvailable
                          ? "cursor-pointer border-line bg-surface font-medium text-fg hover:border-line-accent hover:bg-surface-hover"
                          : "cursor-not-allowed border-danger-border bg-danger-bg/40 text-fg-subtle opacity-60"
                    )}
                  >
                    <span className="flex items-center gap-1 font-bold">
                      {isSelected ? (
                        <Check size={11} aria-hidden />
                      ) : !isAvailable ? (
                        <X size={11} className="text-danger" aria-hidden />
                      ) : null}
                      {mcCode}
                    </span>
                    <span className={cn("max-w-full truncate", blocked ? "text-danger" : "opacity-80")}>
                      {blocked ? (assignedTour ? assignedTour.tourcode : m.status) : m.device_name.replace("Orbitmifi_", "")}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* DYNAMIC PER-MODEM PAX NAME INPUT FIELDS */}
          {tourForm.selectedModemSsids.length > 0 && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-accent-bg/40 p-3.5 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-accent">
                <User size={14} aria-hidden /> Pax / guest name per modem
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {tourForm.selectedModemSsids.map((mcCode) => (
                  <Field key={mcCode} label={<>Pax for <strong className="text-fg">{mcCode}</strong></>} htmlFor={`pax-${mcCode}`}>
                    <TextInput
                      id={`pax-${mcCode}`}
                      placeholder={`e.g. Guest name for ${mcCode}...`}
                      value={tourForm.devicePaxMap[mcCode] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTourForm((prev) => ({
                          ...prev,
                          devicePaxMap: { ...prev.devicePaxMap, [mcCode]: val },
                        }));
                      }}
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}

          <Field label="Tour Status" htmlFor="tour-status">
            <SelectInput
              id="tour-status"
              value={tourForm.status}
              onChange={(e) => setTourForm({ ...tourForm, status: e.target.value as TourStatus })}
            >
              <option value="Running">Running (Active)</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Finish">Finish</option>
            </SelectInput>
          </Field>

          <Field label="Invoice Status" htmlFor="tour-invoice">
            <SelectInput
              id="tour-invoice"
              value={tourForm.invoice_status}
              onChange={(e) => setTourForm({ ...tourForm, invoice_status: e.target.value as InvoiceStatus })}
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Unpaid">Unpaid</option>
            </SelectInput>
          </Field>

          <Field
            label={
              <span className="inline-flex items-center gap-1.5 text-warning">
                <FileText size={13} aria-hidden /> Notes
              </span>
            }
            htmlFor="tour-notes"
            className="sm:col-span-2"
          >
            <TextArea
              id="tour-notes"
              rows={2}
              className="min-h-16"
              placeholder="Ketik catatan khusus / field note jika ada hal yang perlu dicatat..."
              value={tourForm.notes}
              onChange={(e) => setTourForm({ ...tourForm, notes: e.target.value })}
            />
          </Field>
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editingTourCode ? <Edit2 size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
            {editingTourCode ? "Save Changes" : "Create Tour"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
