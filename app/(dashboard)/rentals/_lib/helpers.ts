import type { ModemItem, TourRentalLog } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Timestamp for a stored tour date ("2026-07-31", "31-Jul-2026", "31-Jul-26"…). Falls back to now. */
export function parseTourDate(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return Date.now();
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).getTime();
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10) || 1;
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTH_INDEX[mStr] !== undefined ? MONTH_INDEX[mStr] : (parseInt(parts[1], 10) - 1 || 0);
    let year = parseInt(parts[2], 10) || 2026;
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }
  const d = new Date(dateStr).getTime();
  return isNaN(d) || d === 0 ? Date.now() : d;
}

function toDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

/**
 * Formats any stored tour date as "31-Jul-2026". Tour dates were saved in more than one format over time
 * ("2026-07-31" and "31-Jul-2026"); this is used everywhere in the UI so they look the same.
 * Unknown formats are returned unchanged.
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const s = dateStr.trim();
  // 2026-07-31 (date-input value / ISO) — build a local date so the day never shifts with the timezone.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return toDisplay(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  // 31-Jul-2026 / 1-jul-26
  const dmy = /^(\d{1,2})-([A-Za-z]{3,})-(\d{2,4})$/.exec(s);
  if (dmy && MONTH_INDEX[dmy[2].toLowerCase().slice(0, 3)] !== undefined) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return toDisplay(new Date(year, MONTH_INDEX[dmy[2].toLowerCase().slice(0, 3)], Number(dmy[1])));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return dateStr;
  return toDisplay(d);
}

/** "31-Jul-2026 – 14-Aug-2026" */
export function formatDateRange(start: string, end: string): string {
  return `${formatDateDisplay(start)} – ${formatDateDisplay(end)}`;
}

/** Date converter for <input type="date" /> (YYYY-MM-DD). */
export function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const timestamp = parseTourDate(dateStr);
  if (timestamp > 0) {
    const d = new Date(timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().split("T")[0];
}

/* ---------- MC-code helpers ("Media Creative 12" ⇄ "MC12") ---------- */

/** Short code used in tour.modems, e.g. "Media Creative 12" → "MC12". */
export function toMcCode(ssid: string): string {
  return ssid.replace("Media Creative ", "MC");
}

/** Splits a tour's comma-separated modem list into trimmed codes (empty entries kept, as before). */
export function splitModemCodes(modems: string): string[] {
  return modems.split(",").map((s) => s.trim());
}

/** The modem a tour code refers to (by MC code or full SSID). */
export function findModemByCode(modems: ModemItem[], code: string): ModemItem | undefined {
  return modems.find((m) => toMcCode(m.ssid) === code || m.ssid === code);
}

/** The open (not Finish/Cancel) tour a modem is assigned to, by modem list or by remark. */
export function getAssignedTourForModem(modem: ModemItem, tourLogs: TourRentalLog[]): TourRentalLog | undefined {
  const mcCode = toMcCode(modem.ssid);
  return tourLogs.find((t) => {
    if (t.status === "Finish" || t.status === "Cancel") return false;
    const assignedList = splitModemCodes(t.modems);
    if (assignedList.includes(mcCode) || assignedList.includes(modem.ssid)) return true;
    if (modem.remark && modem.remark.includes(t.tourcode)) return true;
    return false;
  });
}

/**
 * A modem's status follows the tours it is assigned to: assigned to a Running/Upcoming tour = Rented,
 * otherwise Available (Maintenance is always left alone). Returns the corrected list and the rows that differ.
 */
export function reconcileModemStatuses(modems: ModemItem[], tours: TourRentalLog[]) {
  const activeTours = tours.filter((t) => t.status === "Running" || t.status === "Upcoming");
  const updates: Array<{ id: string; status: ModemItem["status"]; remark: string | null }> = [];

  const reconciled = modems.map((m) => {
    if (m.status === "Maintenance") return m;
    const mcCode = toMcCode(m.ssid);
    const activeTour = activeTours.find((t) => {
      const assignedList = splitModemCodes(t.modems);
      return assignedList.includes(mcCode) || assignedList.includes(m.ssid);
    });

    const expectedStatus: ModemItem["status"] = activeTour ? "Rented" : "Available";
    const expectedRemark = activeTour ? `${activeTour.tourcode} (TL: ${activeTour.tl})` : null;

    const isRemarkFromFinishedTour = !activeTour && m.remark && !m.remark.toLowerCase().includes("no bat") && !m.remark.toLowerCase().includes("kartu mati") && !m.remark.toLowerCase().includes("my telkomsel");

    if (m.status !== expectedStatus || (isRemarkFromFinishedTour && m.remark !== null)) {
      const newRemark = expectedRemark !== null ? expectedRemark : (isRemarkFromFinishedTour ? null : m.remark ?? null);
      updates.push({ id: m.id, status: expectedStatus, remark: newRemark });
      return { ...m, status: expectedStatus, remark: newRemark || undefined };
    }
    return m;
  });

  return { reconciled, updates };
}

/* ---------- Filtering / sorting ---------- */

const MODEM_STATUS_ORDER: Record<string, number> = { Available: 1, Rented: 2, Maintenance: 3 };

export function filterAndSortModems(
  modems: ModemItem[],
  search: string,
  statusFilter: string,
  sortField: "ssid" | "device_name" | "number" | "status",
  sortOrder: "asc" | "desc"
): ModemItem[] {
  const q = search.toLowerCase();
  return modems
    .filter((item) => {
      const matchSearch =
        item.device_name.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        item.ssid.toLowerCase().includes(q) ||
        item.password.toLowerCase().includes(q) ||
        (item.remark ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "ssid") {
        cmp = a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortField === "device_name") {
        cmp = a.device_name.localeCompare(b.device_name, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortField === "number") {
        cmp = a.number.localeCompare(b.number);
      } else if (sortField === "status") {
        cmp = (MODEM_STATUS_ORDER[a.status] || 99) - (MODEM_STATUS_ORDER[b.status] || 99);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
}

export function filterAndSortTours(
  tourLogs: TourRentalLog[],
  search: string,
  tourStatusFilter: string,
  invoiceStatusFilter: string,
  dateSortOrder: "newest" | "oldest"
): TourRentalLog[] {
  const q = search.toLowerCase();
  return tourLogs
    .filter((t) => {
      const matchSearch =
        t.tourcode.toLowerCase().includes(q) ||
        t.tl.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.modems.toLowerCase().includes(q) ||
        (t.remark ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q);

      const matchTourStatus = tourStatusFilter === "All" || t.status === tourStatusFilter;
      const matchInvoiceStatus = invoiceStatusFilter === "All" || t.invoice_status === invoiceStatusFilter;

      return matchSearch && matchTourStatus && matchInvoiceStatus;
    })
    .sort((a, b) => {
      const timeA = parseTourDate(a.start_date);
      const timeB = parseTourDate(b.start_date);
      return dateSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
}
