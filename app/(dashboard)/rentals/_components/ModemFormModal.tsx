"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import type { ModemFormState, ModemStatus } from "../_lib/types";

type ModemFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  form: ModemFormState;
  setForm: Dispatch<SetStateAction<ModemFormState>>;
  onSubmit: (e: FormEvent) => void;
};

export function ModemFormModal({ isOpen, onClose, isEditing, form, setForm, onSubmit }: ModemFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Modem" : "Add Modem"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Device Name" htmlFor="modem-device" required>
            <TextInput
              id="modem-device"
              placeholder="e.g. Orbitmifi_6DF6"
              value={form.device_name}
              onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              required
            />
          </Field>
          <Field label="SIM Number" htmlFor="modem-number" required>
            <TextInput
              id="modem-number"
              placeholder="e.g. 081329926886"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              required
            />
          </Field>
          <Field label="Modem / SSID Name" htmlFor="modem-ssid" required>
            <TextInput
              id="modem-ssid"
              placeholder="e.g. Media Creative 1"
              value={form.ssid}
              onChange={(e) => setForm({ ...form, ssid: e.target.value })}
              required
            />
          </Field>
          <Field label="WiFi Password" htmlFor="modem-password" required>
            <TextInput
              id="modem-password"
              placeholder="e.g. MC1#2026"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="Status" htmlFor="modem-status">
            <SelectInput
              id="modem-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ModemStatus })}
            >
              <option value="Available">Available</option>
              <option value="Rented">Rented</option>
              <option value="Maintenance">Maintenance</option>
            </SelectInput>
          </Field>
          <Field label="Remark / Notes" htmlFor="modem-remark">
            <TextInput
              id="modem-remark"
              placeholder="Optional notes..."
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </Field>
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? <Save size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
            {isEditing ? "Save Changes" : "Add Modem"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
