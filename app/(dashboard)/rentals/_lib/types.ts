export type ModemStatus = "Available" | "Rented" | "Maintenance";
export type TourStatus = "Running" | "Upcoming" | "Finish" | "Cancel";
export type InvoiceStatus = "Paid" | "Unpaid" | "Pending";

export type ModemItem = {
  id: string;
  device_name: string;
  number: string;
  ssid: string;
  password: string;
  status: ModemStatus;
  remark?: string;
};

export type TourRentalLog = {
  tourcode: string;
  start_date: string;
  end_date: string;
  days: number;
  qty: number;
  location: string;
  tl: string;
  status: TourStatus;
  modems: string;
  invoice_status: InvoiceStatus;
  remark?: string;
  notes?: string;
  device_pax?: Record<string, string>; // e.g. { "MC1": "Miss Julia Aimée", "MC2": "Miss Kimberley" }
};

export type ModemSortField = "ssid" | "device_name" | "number" | "status";
export type SortOrder = "asc" | "desc";
export type DateSortOrder = "newest" | "oldest";
export type RentalTab = "inventory" | "tours";

export type ModemFormState = {
  device_name: string;
  number: string;
  ssid: string;
  password: string;
  status: ModemStatus;
  remark: string;
};

export type TourFormState = {
  tourcode: string;
  start_date: string;
  end_date: string;
  location: string;
  tl: string;
  status: TourStatus;
  invoice_status: InvoiceStatus;
  selectedModemSsids: string[];
  devicePaxMap: Record<string, string>; // PER-MODEM PAX NAME MAP e.g. { "MC1": "Miss Julia" }
  remark: string;
  notes: string;
};

export const TOUR_STATUSES: TourStatus[] = ["Running", "Upcoming", "Finish", "Cancel"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["Paid", "Pending", "Unpaid"];
export const MODEM_STATUSES: ModemStatus[] = ["Available", "Rented", "Maintenance"];
