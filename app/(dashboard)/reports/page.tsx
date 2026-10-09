"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Users,
  Clock,
  Filter,
  Search,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableWrap } from "@/components/ui/data-table";
import { Field, SearchInput, SelectInput } from "@/components/ui/field";
import { formatDate, formatRupiah, formatRupiahCompact } from "@/lib/format";
import { MobileList, ListCard } from "@/components/ui/list-card";

// Recharts takes tooltip styling as props; theme tokens keep it readable in dark and light mode.
const tooltipContentStyle = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  boxShadow: "var(--shadow-card)",
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
};
const tooltipLabelStyle = { color: "var(--text-secondary)", fontWeight: 600 };
const tooltipItemStyle = { color: "var(--text-primary)" };

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Client = {
  id: string;
  full_name: string;
  company?: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: "Paid" | "Pending" | "Draft" | "Unpaid" | string;
  total_amount?: number;
  clients?: Client;
  invoice_items?: InvoiceItem[];
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedClient, setSelectedClient] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed loading invoice data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique Years and unique Clients for filter dropdowns
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.invoice_date) {
        const y = inv.invoice_date.slice(0, 4);
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const availableClients = useMemo(() => {
    const clientMap = new Map<string, string>(); // name -> name
    invoices.forEach((inv) => {
      const name = inv.clients?.company || inv.clients?.full_name;
      if (name) clientMap.set(name.trim(), name.trim());
    });
    return Array.from(clientMap.keys()).sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  // Compute helper: total invoice amount from invoice items or total_amount
  const getInvoiceTotal = (inv: Invoice): number => {
    if (inv.total_amount && inv.total_amount > 0) return inv.total_amount;
    if (inv.invoice_items && inv.invoice_items.length > 0) {
      return inv.invoice_items.reduce((sum, item) => sum + Number(item.total || item.unit_price * item.quantity || 0), 0);
    }
    return 0;
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.invoice_date) return false;
      const [year, monthStr] = inv.invoice_date.split("-");
      const clientName = inv.clients?.company || inv.clients?.full_name || "";
      const prodDesc = (inv.invoice_items || []).map((i) => i.description).join(" ");

      // Filter Year
      if (selectedYear !== "ALL" && year !== selectedYear) return false;

      // Filter Month
      if (selectedMonth !== "ALL" && monthStr !== selectedMonth) return false;

      // Filter Client
      if (selectedClient !== "ALL" && clientName.trim() !== selectedClient.trim()) return false;

      // Filter Status
      if (selectedStatus !== "ALL" && inv.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNumber = inv.invoice_number?.toLowerCase().includes(q);
        const matchClient = clientName.toLowerCase().includes(q);
        const matchProd = prodDesc.toLowerCase().includes(q);
        if (!matchNumber && !matchClient && !matchProd) return false;
      }

      return true;
    });
  }, [invoices, selectedYear, selectedMonth, selectedClient, selectedStatus, search]);

  // Pagination for the invoices table (metrics/subtotals still use the full filtered list)
  const { pageItems, page, setPage, pageSize, setPageSize, totalPages, totalItems } = usePagination(
    filteredInvoices,
    `${selectedYear}|${selectedMonth}|${selectedClient}|${selectedStatus}|${search}`
  );

  // Aggregate Metrics for Filtered View
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;

    filteredInvoices.forEach((inv) => {
      const amount = getInvoiceTotal(inv);
      totalRevenue += amount;
      if (inv.status === "Paid") {
        paidRevenue += amount;
        paidCount++;
      } else {
        pendingRevenue += amount;
        pendingCount++;
      }
    });

    const taxEstimate = Math.round(totalRevenue * 0.11);

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      paidCount,
      pendingCount,
      taxEstimate,
      count: filteredInvoices.length,
    };
  }, [filteredInvoices]);

  // Monthly Revenue Chart Data (Dynamic for selected year or across months)
  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, { revenue: number; count: number }> = {};
    MONTH_NAMES.forEach((m) => {
      monthlyMap[m] = { revenue: 0, count: 0 };
    });

    filteredInvoices.forEach((inv) => {
      if (!inv.invoice_date) return;
      const monthIdx = parseInt(inv.invoice_date.split("-")[1], 10) - 1;
      const monthName = MONTH_NAMES[monthIdx];
      if (monthName && monthlyMap[monthName]) {
        monthlyMap[monthName].revenue += getInvoiceTotal(inv);
        monthlyMap[monthName].count += 1;
      }
    });

    return MONTH_NAMES.map((month) => ({
      month,
      revenue: monthlyMap[month].revenue,
      invoices: monthlyMap[month].count,
    }));
  }, [filteredInvoices]);

  const maxChartRevenue = useMemo(() => {
    const max = Math.max(...monthlyChartData.map((m) => m.revenue));
    return max > 0 ? max : 1;
  }, [monthlyChartData]);

  // Top Clients Ranking based on filtered view
  const topClientsRanking = useMemo(() => {
    const rankMap = new Map<string, { revenue: number; count: number }>();
    filteredInvoices.forEach((inv) => {
      const name = inv.clients?.company || inv.clients?.full_name || "Unknown Client";
      const amount = getInvoiceTotal(inv);
      const prev = rankMap.get(name) || { revenue: 0, count: 0 };
      rankMap.set(name, { revenue: prev.revenue + amount, count: prev.count + 1 });
    });

    const list = Array.from(rankMap.entries()).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      count: data.count,
      sharePct: metrics.totalRevenue > 0 ? ((data.revenue / metrics.totalRevenue) * 100).toFixed(1) : "0",
    }));

    return list.sort((a, b) => b.revenue - a.revenue).slice(0, 7);
  }, [filteredInvoices, metrics.totalRevenue]);

  // CSV Export Handler for Filtered View
  function exportCSV() {
    const headers = ["Invoice Date", "Invoice Number", "Client Name", "Products / Description", "Status", "Amount (IDR)"];
    const rows = filteredInvoices.map((inv) => {
      const clientName = inv.clients?.company || inv.clients?.full_name || "N/A";
      const prodDesc = (inv.invoice_items || []).map((i) => i.description).join("; ") || "Item";
      const amount = getInvoiceTotal(inv);
      return [
        `"${inv.invoice_date}"`,
        `"${inv.invoice_number}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        `"${prodDesc.replace(/"/g, '""')}"`,
        `"${inv.status}"`,
        amount,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_report_${selectedYear}_${selectedMonth}_${selectedClient.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function resetFilters() {
    setSelectedYear("ALL");
    setSelectedMonth("ALL");
    setSelectedClient("ALL");
    setSelectedStatus("ALL");
    setSearch("");
  }

  const hasActiveFilters =
    selectedYear !== "ALL" || selectedMonth !== "ALL" || selectedClient !== "ALL" || selectedStatus !== "ALL" || search !== "";

  /** KPI tiles show the compact amount; the exact figure is in the tooltip. */
  const kpiValue = (amount: number) => <span title={formatRupiah(amount)}>{formatRupiahCompact(amount)}</span>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financial Reports"
        description="Revenue analytics, client insights and invoice history, filtered your way."
        actions={
          <>
            <button className="btn btn-ghost" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
              Refresh
            </button>
            <button className="btn btn-primary" onClick={exportCSV}>
              <Download size={16} aria-hidden />
              Export CSV
            </button>
          </>
        }
      />

      {/* MULTI-FILTER BAR */}
      <Panel
        title="Filters"
        icon={<Filter size={16} />}
        actions={
          hasActiveFilters ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X size={14} aria-hidden /> Reset filters
            </button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Field label="Search" htmlFor="report-search" className="col-span-2 lg:col-span-1">
            <SearchInput
              id="report-search"
              icon={<Search size={16} />}
              placeholder="Invoice #, client, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>

          <Field label="Year" htmlFor="report-year" className="min-w-0">
            <SelectInput id="report-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="ALL">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Month" htmlFor="report-month" className="min-w-0">
            <SelectInput id="report-month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="ALL">All months</option>
              {MONTH_NAMES.map((m, idx) => {
                const pad = String(idx + 1).padStart(2, "0");
                return (
                  <option key={pad} value={pad}>
                    {pad} - {m}
                  </option>
                );
              })}
            </SelectInput>
          </Field>

          <Field label="Client" htmlFor="report-client" className="min-w-0">
            <SelectInput id="report-client" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="ALL">All clients ({availableClients.length})</option>
              {availableClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Status" htmlFor="report-status" className="min-w-0">
            <SelectInput id="report-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending / Unpaid</option>
              <option value="Draft">Draft</option>
            </SelectInput>
          </Field>
        </div>
      </Panel>

      {/* KPI CARDS (computed over the full filtered list) */}
      <StatGrid>
        <StatCard
          label="Total Revenue"
          value={kpiValue(metrics.totalRevenue)}
          hint={`${metrics.count} matching invoices`}
          icon={<TrendingUp size={20} />}
          tone="accent"
          loading={loading}
        />
        <StatCard
          label={`Paid (${metrics.paidCount})`}
          value={kpiValue(metrics.paidRevenue)}
          hint="Collected payments"
          icon={<CheckCircle2 size={20} />}
          tone="success"
          loading={loading}
        />
        <StatCard
          label={`Pending / Unpaid (${metrics.pendingCount})`}
          value={kpiValue(metrics.pendingRevenue)}
          hint="Outstanding invoices"
          icon={<Clock size={20} />}
          tone="warning"
          loading={loading}
        />
        <StatCard
          label="Est. PPN Tax (11%)"
          value={kpiValue(metrics.taxEstimate)}
          hint="Calculated value-added tax"
          icon={<DollarSign size={20} />}
          tone="purple"
          loading={loading}
        />
      </StatGrid>

      {/* CHART + RANKING: side by side on desktop, stacked below lg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={`Monthly Revenue ${selectedYear !== "ALL" ? `(${selectedYear})` : "(All Time)"}`}
          description="Monthly breakdown based on the active filters"
          icon={<BarChart3 size={16} />}
          actions={<StatusBadge tone="accent">{metrics.count} invoices</StatusBadge>}
        >
          <div className="h-64 w-full sm:h-72" role="img" aria-label="Bar chart of revenue per month">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval={0}
                  minTickGap={0}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M` : String(v))}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: "var(--bg-glass-hover)" }}
                  formatter={(value, _name, item) => [
                    `${formatRupiah(Number(value))} (${(item?.payload as { invoices?: number })?.invoices ?? 0} invoices)`,
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="var(--accent-cyan)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Clients" description="By revenue in the filtered view" icon={<Users size={16} />}>
          {topClientsRanking.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">No client data available</p>
          ) : (
            <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {topClientsRanking.map((cl, idx) => (
                <li key={cl.name} className="flex flex-col gap-1.5 rounded-xl border border-line bg-inset px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-sm font-semibold text-fg">
                      <span className="mr-1 text-fg-subtle">#{idx + 1}</span>
                      <span className="break-words">{cl.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatRupiah(cl.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-fg-muted">
                    <span>{cl.count} invoices</span>
                    <span>{cl.sharePct}% share</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-hover" aria-hidden>
                    {/* width is a computed percentage, so it stays inline */}
                    <div className="h-full rounded-full bg-accent" style={{ width: `${cl.sharePct}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* FILTERED INVOICE DATA TABLE */}
      <Panel
        padded={false}
        title={`Filtered Invoices (${filteredInvoices.length})`}
        description="Invoice records matching the active filters"
        icon={<FileSpreadsheet size={16} />}
        actions={
          <span className="text-sm font-semibold text-fg">
            Subtotal: <span className="tabular-nums">{formatRupiah(metrics.totalRevenue)}</span>
          </span>
        }
      >
        <div className="border-t border-line">
          {loading ? (
            <LoadingState label="Loading reports data..." />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet size={28} />}
              title="No matching invoices"
              description="No invoice records match your current filter selection."
              action={
                hasActiveFilters ? (
                  <button type="button" className="btn btn-ghost" onClick={resetFilters}>
                    <X size={16} aria-hidden /> Reset filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
            <TableWrap className="hidden md:block">
              <table className="data-table min-w-[860px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Products / Services</th>
                    <th className="text-right!">Amount</th>
                    <th className="text-center!">Status</th>
                    <th className="text-right!"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((inv) => {
                    const amount = getInvoiceTotal(inv);
                    const clientName = inv.clients?.company || inv.clients?.full_name || "—";
                    const prodDesc = (inv.invoice_items || []).map((i) => i.description).join(", ") || "Item";

                    return (
                      <tr key={inv.id}>
                        <td className="whitespace-nowrap tabular-nums">{formatDate(inv.invoice_date)}</td>
                        <td>
                          <Link href={`/invoices/${inv.id}`} className="whitespace-nowrap font-mono text-sm font-semibold text-accent hover:underline">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="font-semibold text-fg">{clientName}</td>
                        <td className="max-w-xs truncate" title={prodDesc}>
                          {prodDesc}
                        </td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums text-fg">{formatRupiah(amount)}</td>
                        <td className="text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="btn btn-ghost btn-sm"
                            aria-label={`View invoice ${inv.invoice_number}`}
                          >
                            <ExternalLink size={14} aria-hidden /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            <MobileList>
              {pageItems.map((inv) => {
                const prodDesc = (inv.invoice_items || []).map((i) => i.description).join(", ") || "Item";
                return (
                  <ListCard
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    title={<span className="font-mono">{inv.invoice_number}</span>}
                    subtitle={inv.clients?.company || inv.clients?.full_name || "—"}
                    value={formatRupiah(getInvoiceTotal(inv))}
                    meta={
                      <>
                        <StatusBadge status={inv.status} />
                        <span className="tabular-nums">{formatDate(inv.invoice_date)}</span>
                        <span className="min-w-0 truncate text-fg-subtle">{prodDesc}</span>
                      </>
                    }
                  />
                );
              })}
            </MobileList>
            </>
          )}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
