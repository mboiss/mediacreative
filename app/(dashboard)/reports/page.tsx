"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

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

function formatCurrency(amount: number) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function formatShortDate(dateStr?: string) {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year2Digits = parts[0].slice(2);
    const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year2Digits}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  const month = months[d.getMonth()];
  const year2Digits = String(d.getFullYear()).slice(2);
  return `${day} ${month} ${year2Digits}`;
}

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Financial Analytics & Real Reports
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Real-time revenue reports, multi-filter client insights, and historical database analytics.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={loadData} style={{ border: "1px solid var(--border)", gap: 6 }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
          <button className="btn btn-primary" onClick={exportCSV} style={{ gap: 6 }}>
            <Download size={14} />
            Export Filtered CSV
          </button>
        </div>
      </div>

      {/* MULTI-FILTER BAR */}
      <div
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
            <Filter size={16} /> Filter Reports & Invoices
          </div>
          {(selectedYear !== "ALL" || selectedMonth !== "ALL" || selectedClient !== "ALL" || selectedStatus !== "ALL" || search !== "") && (
            <button
              onClick={resetFilters}
              style={{
                fontSize: "0.75rem",
                color: "#f87171",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {/* SEARCH INPUT */}
          <div>
            <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Search Keywords</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="form-input"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                placeholder="Invoice #, Client, Product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* YEAR FILTER */}
          <div>
            <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Select Year</label>
            <select
              className="form-input form-select"
              style={{ fontSize: "0.82rem" }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="ALL">All Years (2023 - 2026)</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          {/* MONTH FILTER */}
          <div>
            <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Select Month</label>
            <select
              className="form-input form-select"
              style={{ fontSize: "0.82rem" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="ALL">All Months</option>
              {MONTH_NAMES.map((m, idx) => {
                const pad = String(idx + 1).padStart(2, "0");
                return (
                  <option key={pad} value={pad}>
                    {pad} - {m}
                  </option>
                );
              })}
            </select>
          </div>

          {/* CLIENT FILTER */}
          <div>
            <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Filter by Client</label>
            <select
              className="form-input form-select"
              style={{ fontSize: "0.82rem" }}
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="ALL">All Clients ({availableClients.length})</option>
              {availableClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER */}
          <div>
            <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Payment Status</label>
            <select
              className="form-input form-select"
              style={{ fontSize: "0.82rem" }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Pending">Pending / Unpaid</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI CARDS (LIVE COMPUTED FROM DATABASE) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "18px 20px",
            borderLeft: "4px solid var(--accent-emerald)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Filtered Revenue
            </span>
            <TrendingUp size={16} style={{ color: "var(--accent-emerald)" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
            From {metrics.count} matching invoice records
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "18px 20px",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
              Paid Revenue ({metrics.paidCount})
            </span>
            <CheckCircle2 size={16} style={{ color: "#34d399" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399" }}>
            {formatCurrency(metrics.paidRevenue)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
            Successfully collected payments
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "18px 20px",
            borderLeft: "4px solid var(--accent-amber)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
              Pending / Unpaid ({metrics.pendingCount})
            </span>
            <Clock size={16} style={{ color: "var(--accent-amber)" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-amber)" }}>
            {formatCurrency(metrics.pendingRevenue)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
            Outstanding invoices
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "18px 20px",
            borderLeft: "4px solid #7c3aed",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
              Est. PPN Tax (11%)
            </span>
            <DollarSign size={16} style={{ color: "#a78bfa" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a78bfa" }}>
            {formatCurrency(metrics.taxEstimate)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
            Calculated value-added tax
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* REVENUE BAR CHART */}
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Monthly Revenue Trend {selectedYear !== "ALL" ? `(${selectedYear})` : "(All Time)"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                Live monthly breakdown based on active filters
              </p>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
              {metrics.count} Total Invoices
            </span>
          </div>

          {/* BAR CHART GRAPH */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 210, paddingTop: 20, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
            {monthlyChartData.map((stat) => {
              const heightPct = stat.revenue > 0 ? Math.max(8, Math.round((stat.revenue / maxChartRevenue) * 100)) : 2;

              return (
                <div key={stat.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {stat.revenue > 0 ? `${(stat.revenue / 1000000).toFixed(1)}M` : "0"}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background: stat.revenue > 0 ? "linear-gradient(180deg, var(--accent-cyan), #7c3aed)" : "rgba(255,255,255,0.05)",
                      borderRadius: "6px 6px 0 0",
                      transition: "all 300ms ease",
                      boxShadow: stat.revenue > 0 ? "0 0 10px var(--accent-cyan-dim)" : "none",
                    }}
                    title={`${stat.month}: ${formatCurrency(stat.revenue)} (${stat.invoices} invoices)`}
                  />
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: stat.revenue > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {stat.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP CLIENTS RANKING */}
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Top Client Ranking
            </h3>
            <Users size={16} style={{ color: "var(--accent-cyan)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 230, overflowY: "auto" }}>
            {topClientsRanking.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: 20, textAlign: "center" }}>
                No client data available
              </div>
            ) : (
              topClientsRanking.map((cl, idx) => (
                <div
                  key={cl.name}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      #{idx + 1} {cl.name}
                    </span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#34d399" }}>
                      {formatCurrency(cl.revenue)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    <span>{cl.count} invoices</span>
                    <span>{cl.sharePct}% share</span>
                  </div>

                  {/* SHARE BAR */}
                  <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${cl.sharePct}%`, height: "100%", background: "var(--accent-cyan)" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FILTERED INVOICE DATA TABLE */}
      <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Filtered Invoices List ({filteredInvoices.length})
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
              Showing invoice records matching your active filters
            </p>
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Subtotal: {formatCurrency(metrics.totalRevenue)}
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--text-secondary)" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            Loading real reports data...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
            No invoice records match your current filter selection.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice Number</th>
                  <th>Client Name</th>
                  <th>Product / Service Description</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const amount = getInvoiceTotal(inv);
                  const clientName = inv.clients?.company || inv.clients?.full_name || "—";
                  const prodDesc = (inv.invoice_items || []).map((i) => i.description).join(", ") || "Item";

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {formatShortDate(inv.invoice_date)}
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {clientName}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {prodDesc}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatCurrency(amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: inv.status === "Paid" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: inv.status === "Paid" ? "#34d399" : "#fbbf24",
                            border: `1px solid ${inv.status === "Paid" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem", gap: 4 }}>
                          <ExternalLink size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}