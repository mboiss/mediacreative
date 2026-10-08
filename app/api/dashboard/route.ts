import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TREND_MONTHS = 6;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type InvoiceRow = {
  status: string | null;
  invoice_date: string | null;
  invoice_items: { total: number | null }[] | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [clientsResult, invoicesResult, modemsResult] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      // invoices.total is not maintained; the real amount is the sum of its line items.
      supabase.from("invoices").select("status, invoice_date, invoice_items ( total )"),
      supabase.from("modems").select("status"),
    ]);
    if (clientsResult.error) throw clientsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (modemsResult.error) throw modemsResult.error;

    const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
    const amountOf = (inv: InvoiceRow) =>
      (inv.invoice_items ?? []).reduce((sum, item) => sum + Number(item.total ?? 0), 0);

    let totalRevenue = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    // Last N calendar months, oldest first.
    const now = new Date();
    const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        revenue: 0,
        invoices: 0,
      };
    });

    for (const inv of invoices) {
      const amount = amountOf(inv);
      if (inv.status === "Paid") {
        totalRevenue += amount;
      } else if (inv.status !== "Cancelled") {
        pendingAmount += amount;
        pendingCount += 1;
      }

      const bucket = trend.find((t) => inv.invoice_date?.startsWith(t.key));
      if (bucket) {
        bucket.invoices += 1;
        if (inv.status === "Paid") bucket.revenue += amount;
      }
    }

    const modemStatus: Record<string, number> = {};
    for (const m of modemsResult.data ?? []) {
      const status = m.status || "Unknown";
      modemStatus[status] = (modemStatus[status] ?? 0) + 1;
    }

    return jsonNoCache({
      totalClients: clientsResult.count ?? 0,
      totalInvoices: invoices.length,
      totalRevenue,
      pendingAmount,
      pendingCount,
      revenueTrend: trend.map(({ month, revenue, invoices }) => ({ month, revenue, invoices })),
      modemStatus,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return jsonNoCache({ error: errorMessage(err, "Failed to load dashboard data") }, 500);
  }
}
