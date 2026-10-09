"use client";

import { BadgeSelect } from "@/components/ui/badge-select";
import { INVOICE_STATUSES, TOUR_STATUSES, type InvoiceStatus, type TourStatus } from "../_lib/types";

export function TourStatusSelect({
  tourcode,
  value,
  onChange,
  className,
}: {
  tourcode: string;
  value: TourStatus;
  onChange: (value: TourStatus) => void;
  className?: string;
}) {
  return (
    <BadgeSelect
      value={value}
      options={TOUR_STATUSES}
      onChange={onChange}
      label={`Tour status for ${tourcode}`}
      title="Change tour status (Finish automatically frees modems)"
      className={className}
    />
  );
}

export function InvoiceStatusSelect({
  tourcode,
  value,
  onChange,
  className,
}: {
  tourcode: string;
  value: InvoiceStatus;
  onChange: (value: InvoiceStatus) => void;
  className?: string;
}) {
  return (
    <BadgeSelect
      value={value}
      options={INVOICE_STATUSES}
      onChange={onChange}
      label={`Invoice status for ${tourcode}`}
      title="Change invoice payment status"
      className={className}
    />
  );
}
