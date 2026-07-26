"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  FileText,
  ArrowRight,
  Calendar,
  User,
  ChevronDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";

type Client = {
  id: string;
  full_name: string;
  company?: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  total_amount?: number;
  clients?: {
    full_name: string;
    company?: string;
  };
};

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Paid", "Overdue", "Cancelled"];

function getStatusClass(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":      return "badge badge-paid";
    case "sent":      return "badge badge-sent";
    case "draft":     return "badge badge-draft";
    case "overdue":   return "badge badge-overdue";
    case "cancelled": return "badge badge-cancelled";
    default:          return "badge badge-draft";
  }
}

function formatCurrency(amount?: number) {
  if (!amount && amount !== 0) return "—";
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDate(dateStr?: string) {
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

export default function InvoicesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState({
    client_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, invoicesRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/invoices"),
      ]);
      const clientsData = await clientsRes.json();
      const invoiceData = await invoicesRes.json();
      if (Array.isArray(clientsData)) setClients(clientsData);
      if (Array.isArray(invoiceData)) setInvoices(invoiceData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) {
      alert("Please select a client.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setShowModal(false);
        setForm({
          client_id: "",
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: "",
          notes: "",
        });
        await loadData();
        // Navigate to the new invoice detail
        if (Array.isArray(data) && data[0]?.id) {
          window.location.href = `/invoices/${data[0].id}`;
        }
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to create invoice"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create invoice. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // Filtered & searched invoices
  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "Paid").length,
    sent: invoices.filter((i) => i.status === "Sent").length,
    draft: invoices.filter((i) => i.status === "Draft").length,
    revenue: invoices
      .filter((i) => i.status === "Paid")
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* PAGE HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Invoice Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Manage invoices, track payments, and control billing.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={loadData}
            className="btn btn-ghost"
            style={{ padding: "9px 14px" }}
          >
            <RefreshCw size={14} />
          </button>
          <Link href="/invoices/new">
            <button className="btn btn-primary">
              <Plus size={16} />
              New Invoice Studio
            </button>
          </Link>
        </div>
      </div>

      {/* KPI STRIP */}
      <div
        className="stagger-children"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
      >
        {[
          { label: "Total Invoices", value: stats.total, color: "var(--accent-cyan)" },
          { label: "Paid", value: stats.paid, color: "var(--accent-emerald)" },
          { label: "Sent / Pending", value: stats.sent, color: "#3b82f6" },
          {
            label: "Revenue (Paid)",
            value: formatCurrency(stats.revenue),
            color: "var(--accent-amber)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "16px 18px",
              borderLeft: `3px solid ${kpi.color}`,
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: 200 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search invoice number or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
                borderColor:
                  statusFilter === s
                    ? "var(--border-accent)"
                    : "var(--border)",
                background:
                  statusFilter === s
                    ? "var(--accent-cyan-dim)"
                    : "transparent",
                color: statusFilter === s ? "var(--accent-cyan)" : "var(--text-secondary)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* INVOICE TABLE */}
      <div
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 60,
              gap: 12,
              color: "var(--text-secondary)",
            }}
          >
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title={search || statusFilter !== "All" ? "No invoices found" : "No invoices yet"}
            description={
              search || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Create your first invoice to get started."
            }
            action={
              !search && statusFilter === "All" ? (
                <Link href="/invoices/new">
                  <button className="btn btn-primary">
                    <Plus size={14} />
                    Create Invoice Studio
                  </button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      style={{
                        color: "var(--accent-cyan)",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        fontFamily: "monospace",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                    >
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {invoice.clients?.full_name || "—"}
                    </div>
                    {invoice.clients?.company && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {invoice.clients.company}
                      </div>
                    )}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatDate(invoice.invoice_date)}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatDate(invoice.due_date)}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td>
                    <span className={getStatusClass(invoice.status)}>
                      {invoice.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/invoices/${invoice.id}`}>
                      <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                        View
                        <ArrowRight size={13} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Invoice"
        maxWidth={520}
      >
        <form onSubmit={createInvoice} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Client */}
          <div>
            <label className="form-label">
              <User size={11} style={{ display: "inline", marginRight: 4 }} />
              Client *
            </label>
            <select
              className="form-input form-select"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              required
            >
              <option value="">— Select Client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                  {client.company ? ` (${client.company})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">
                <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
                Invoice Date *
              </label>
              <input
                type="date"
                className="form-input"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">
                <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
                Due Date
              </label>
              <input
                type="date"
                className="form-input"
                value={form.due_date}
                min={form.invoice_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-input"
              style={{ resize: "vertical", minHeight: 72 }}
              placeholder="Internal notes for this invoice..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Creating...
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Create Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
