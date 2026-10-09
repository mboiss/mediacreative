import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TREND_MONTHS = 6;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;
const TOUR_START_WINDOW_DAYS = 7;
const TOUR_END_WINDOW_DAYS = 3;
const UNPAID_LIMIT = 5;

type ClientRef = { full_name: string | null; company: string | null };

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string | null;
  invoice_date: string | null;
  due_date: string | null;
  clients: ClientRef | ClientRef[] | null;
  invoice_items: { total: number | null }[] | null;
};

type TourRow = {
  tourcode: string | null;
  tl: string | null;
  start_date: string | null;
  end_date: string | null;
  qty: number | null;
  modems: string | null;
  status: string | null;
};

type ModemRow = {
  ssid: string | null;
  status: string | null;
  remark: string | null;
};

const MONTH_INDEX: Record<string, number> = Object.fromEntries(MONTH_LABELS.map((m, i) => [m.toLowerCase(), i]));

function validDate(y: number, mo: number, d: number): Date | null {
  const date = new Date(y, mo, d);
  return Number.isNaN(date.getTime()) || date.getMonth() !== mo ? null : date;
}

/**
 * Tour/invoice dates are stored as text in mixed formats ("31-Jul-2026", "2026-07-31",
 * "31/07/2026", ISO timestamps). Returns a local-midnight Date, or null when unparseable.
 */
function parseLooseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = /^(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/,]*(\d{2,4})$/.exec(s);
  if (m) {
    const month = MONTH_INDEX[m[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return validDate(year, month, Number(m[1]));
  }

  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return validDate(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" for a local date. */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function clientName(c: InvoiceRow["clients"]): string | null {
  const client = Array.isArray(c) ? c[0] : c;
  if (!client) return null;
  return client.company || client.full_name || null;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [clientsResult, invoicesResult, modemsResult, toursResult] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      // invoices.total is not maintained; the real amount is the sum of its line items.
      supabase
        .from("invoices")
        .select("id, invoice_number, status, invoice_date, due_date, clients ( full_name, company ), invoice_items ( total )"),
      supabase.from("modems").select("ssid, status, remark"),
      supabase
        .from("tour_rental_logs")
        .select("tourcode, tl, start_date, end_date, qty, modems, status")
        .in("status", ["Upcoming", "Running"]),
    ]);
    if (clientsResult.error) throw clientsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (modemsResult.error) throw modemsResult.error;
    if (toursResult.error) throw toursResult.error;

    const invoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
    const amountOf = (inv: InvoiceRow) =>
      (inv.invoice_items ?? []).reduce((sum, item) => sum + Number(item.total ?? 0), 0);

    let totalRevenue = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthKey = monthKey(today);
    const lastMonthKey = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const monthOverMonth = {
      revenue: { thisMonth: 0, lastMonth: 0 },
      invoices: { thisMonth: 0, lastMonth: 0 },
    };

    // Last N calendar months, oldest first.
    const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1);
      return {
        key: monthKey(d),
        month: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        revenue: 0,
        invoices: 0,
      };
    });

    const unpaid: {
      id: string;
      invoice_number: string | null;
      client: string | null;
      amount: number;
      due_date: string | null;
      overdue: boolean;
      dueTime: number;
    }[] = [];

    for (const inv of invoices) {
      const amount = amountOf(inv);
      const isPaid = inv.status === "Paid";
      if (isPaid) {
        totalRevenue += amount;
      } else if (inv.status !== "Cancelled") {
        pendingAmount += amount;
        pendingCount += 1;
        const due = parseLooseDate(inv.due_date);
        unpaid.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          client: clientName(inv.clients),
          amount,
          due_date: due ? toYmd(due) : inv.due_date,
          overdue: inv.status === "Overdue" || (!!due && due.getTime() < today.getTime()),
          dueTime: due ? due.getTime() : Number.POSITIVE_INFINITY,
        });
      }

      const issued = parseLooseDate(inv.invoice_date);
      if (!issued) continue;
      const key = monthKey(issued);

      const bucket = trend.find((t) => t.key === key);
      if (bucket) {
        bucket.invoices += 1;
        if (isPaid) bucket.revenue += amount;
      }
      if (key === thisMonthKey) {
        monthOverMonth.invoices.thisMonth += 1;
        if (isPaid) monthOverMonth.revenue.thisMonth += amount;
      } else if (key === lastMonthKey) {
        monthOverMonth.invoices.lastMonth += 1;
        if (isPaid) monthOverMonth.revenue.lastMonth += amount;
      }
    }

    unpaid.sort((a, b) => a.dueTime - b.dueTime);

    const modemStatus: Record<string, number> = {};
    const maintenanceModems: { ssid: string | null; remark: string | null }[] = [];
    for (const m of (modemsResult.data ?? []) as ModemRow[]) {
      const status = m.status || "Unknown";
      modemStatus[status] = (modemStatus[status] ?? 0) + 1;
      if (status === "Maintenance") maintenanceModems.push({ ssid: m.ssid, remark: m.remark });
    }

    const startLimit = today.getTime() + TOUR_START_WINDOW_DAYS * DAY_MS;
    const endLimit = today.getTime() + TOUR_END_WINDOW_DAYS * DAY_MS;
    const toursStarting: { tourcode: string | null; tl: string | null; start: string; qty: number }[] = [];
    const toursEnding: {
      tourcode: string | null;
      tl: string | null;
      end: string;
      modems: string | null;
      overdue: boolean;
    }[] = [];

    for (const t of (toursResult.data ?? []) as TourRow[]) {
      if (t.status === "Upcoming") {
        const start = parseLooseDate(t.start_date);
        if (start && start.getTime() >= today.getTime() && start.getTime() <= startLimit) {
          toursStarting.push({ tourcode: t.tourcode, tl: t.tl, start: toYmd(start), qty: Number(t.qty ?? 0) });
        }
      } else if (t.status === "Running") {
        const end = parseLooseDate(t.end_date);
        if (end && end.getTime() <= endLimit) {
          toursEnding.push({
            tourcode: t.tourcode,
            tl: t.tl,
            end: toYmd(end),
            modems: t.modems || null,
            overdue: end.getTime() < today.getTime(),
          });
        }
      }
    }
    toursStarting.sort((a, b) => a.start.localeCompare(b.start));
    toursEnding.sort((a, b) => a.end.localeCompare(b.end));

    return jsonNoCache({
      totalClients: clientsResult.count ?? 0,
      totalInvoices: invoices.length,
      totalRevenue,
      pendingAmount,
      pendingCount,
      revenueTrend: trend.map(({ month, revenue, invoices }) => ({ month, revenue, invoices })),
      modemStatus,
      monthOverMonth,
      attention: {
        unpaidInvoices: unpaid.slice(0, UNPAID_LIMIT).map(({ dueTime: _dueTime, ...rest }) => rest),
        unpaidTotal: unpaid.length,
        toursStarting,
        toursEnding,
        maintenanceModems,
      },
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return jsonNoCache({ error: errorMessage(err, "Failed to load dashboard data") }, 500);
  }
}
