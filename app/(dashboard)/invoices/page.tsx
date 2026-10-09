"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, FileText, ArrowRight, RefreshCw, CheckCircle2, Send, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/field";
import { FilterBar, TableWrap } from "@/components/ui/data-table";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { cn } from "@/lib/utils";

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
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadData = useCallback(async () => {
    try {
      const ts = Date.now();
      const invoicesRes = await fetch(`/api/invoices?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } });
      const invoiceData = await invoicesRes.json().catch(() => null);
      if (!invoicesRes.ok) {
        toast.error("Failed to load invoices", invoiceData?.error);
        return;
      }
      if (Array.isArray(invoiceData)) setInvoices(invoiceData);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Failed to load invoices", "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadData, { tables: ["invoices", "clients", "invoice_items"] });

  // Filtered & searched invoices
  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { pageItems, page, setPage, pageSize, setPageSize, totalPages, totalItems } = usePagination(
    filtered,
    `${search}|${statusFilter}`
  );

  // Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "Paid").length,
    sent: invoices.filter((i) => i.status === "Sent").length,
    draft: invoices.filter((i) => i.status === "Draft").length,
    revenue: invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + (i.total_amount ?? 0), 0),
  };

  const isFiltered = search !== "" || statusFilter !== "All";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Manage invoices, track payments, and control billing."
        actions={
          <>
            <button
              type="button"
              onClick={loadData}
              className="btn btn-ghost btn-icon"
              aria-label="Refresh invoices"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <Link href="/invoices/new" className="btn btn-primary">
              <Plus size={16} />
              New Invoice
            </Link>
          </>
        }
      />

      {/* KPI STRIP */}
      <StatGrid>
        <StatCard
          label="Total Invoices"
          value={stats.total}
          icon={<FileText size={18} />}
          tone="accent"
          hint={`${stats.draft} draft`}
          loading={loading}
        />
        <StatCard label="Paid" value={stats.paid} icon={<CheckCircle2 size={18} />} tone="success" loading={loading} />
        <StatCard label="Sent / Pending" value={stats.sent} icon={<Send size={18} />} tone="info" loading={loading} />
        <StatCard
          label="Revenue (Paid)"
          value={<span className="block break-words text-lg sm:text-2xl">{formatCurrency(stats.revenue)}</span>}
          icon={<Wallet size={18} />}
          tone="warning"
          loading={loading}
        />
      </StatGrid>

      {/* INVOICE TABLE */}
      <Panel padded={false}>
        <div className="border-b border-line p-4">
          <FilterBar>
            <SearchInput
              icon={<Search size={14} />}
              className="basis-60"
              placeholder="Search invoice number or client..."
              aria-label="Search invoices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {STATUS_OPTIONS.map((s) => {
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-accent-border bg-accent-bg text-accent"
                        : "border-line bg-transparent text-fg-muted hover:border-line-strong hover:text-fg"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </FilterBar>
        </div>

        {loading ? (
          <LoadingState label="Loading invoices..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title={isFiltered ? "No invoices found" : "No invoices yet"}
            description={isFiltered ? "Try adjusting your search or filter." : "Create your first invoice to get started."}
            action={
              !isFiltered ? (
                <Link href="/invoices/new" className="btn btn-primary">
                  <Plus size={14} />
                  New Invoice
                </Link>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-mono text-sm font-semibold text-accent hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="min-w-40">
                      <div className="font-medium text-fg">{invoice.clients?.full_name || "—"}</div>
                      {invoice.clients?.company && (
                        <div className="text-xs text-fg-subtle">{invoice.clients.company}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatDate(invoice.invoice_date)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatDate(invoice.due_date)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums text-fg">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="btn btn-ghost btn-sm"
                        aria-label={`View invoice ${invoice.invoice_number}`}
                      >
                        View
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Panel>
    </div>
  );
}
