// Shared display formatting. Numbers use Indonesian conventions (1.234.567 / 683,6 jt);
// dates are shown in English to match the UI ("7 Oct 2026").

const rupiahFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "Rp 683.645.908" */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `Rp ${rupiahFormatter.format(amount)}`;
}

/** "Rp 683,6 jt" — for KPI tiles and chart axes where space is tight. */
export function formatRupiahCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `Rp ${compactFormatter.format(amount)}`;
}

/** Parses "2026-07-31", ISO timestamps and other Date-parsable strings as a local calendar date. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "7 Oct 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dateFormatter.format(d) : typeof value === "string" && value ? value : "—";
}

/** "7 Oct" — when the year is obvious from context. */
export function formatShortDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? shortDateFormatter.format(d) : "—";
}

/** Whole days from today to the given date (negative = in the past). */
export function daysFromToday(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
