"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Building,
  MapPin,
  User,
  UserX,
  FileText,
  Plus,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableWrap } from "@/components/ui/data-table";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { MobileList, ListCard } from "@/components/ui/list-card";
import { formatDate, formatRupiah, formatRupiahCompact } from "@/lib/format";

type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
};

type ClientInvoice = {
  id: string;
  invoice_number: string;
  legacy_number?: string | null;
  status: string;
  invoice_date: string;
  due_date: string | null;
  total_amount?: number;
};

/** Field label with a small leading icon. */
function IconLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-fg-subtle" aria-hidden>
        {icon}
      </span>
      {children}
    </span>
  );
}

const isOutstanding = (inv: ClientInvoice) => inv.status !== "Paid" && inv.status !== "Cancelled";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });

  const loadClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setClient(data);
      setForm({
        full_name: data.full_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        address: data.address ?? "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices?client_id=${encodeURIComponent(id)}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Failed to load invoices", data?.error);
        return;
      }
      if (Array.isArray(data)) {
        // Newest first by invoice date.
        data.sort((a: ClientInvoice, b: ClientInvoice) => (b.invoice_date || "").localeCompare(a.invoice_date || ""));
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoices", "Please check your connection and try again.");
    } finally {
      setInvoicesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadClient();
    loadInvoices();
  }, [loadClient, loadInvoices]);

  const { pageItems, page, setPage, pageSize, setPageSize, totalPages, totalItems } = usePagination(invoices, id);

  const totals = invoices.reduce(
    (acc, inv) => {
      const amount = inv.total_amount ?? 0;
      if (inv.status !== "Cancelled") acc.billed += amount;
      if (inv.status === "Paid") acc.paid += amount;
      if (isOutstanding(inv)) {
        acc.outstanding += amount;
        acc.outstandingCount += 1;
      }
      return acc;
    },
    { billed: 0, paid: 0, outstanding: 0, outstandingCount: 0 }
  );
  const lastInvoiceDate = invoices[0]?.invoice_date;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await loadClient();
        toast.success("Client Updated", "Changes saved successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Update Failed", err.error || "Could not update client.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  const backLink = (
    <Link href="/clients" className="btn btn-ghost btn-sm self-start">
      <ArrowLeft size={14} aria-hidden /> All Clients
    </Link>
  );

  if (loading) {
    return <LoadingState label="Loading client..." />;
  }

  if (!client) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          icon={<UserX size={28} />}
          title="Client not found"
          description="It may have been deleted, or the link is wrong."
        />
      </div>
    );
  }

  const newInvoiceHref = `/invoices/new?client=${client.id}`;

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <PageHeader
        title={client.full_name}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {client.company && (
              <span className="inline-flex items-center gap-1.5">
                <Building size={14} aria-hidden /> {client.company}
              </span>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <Mail size={14} aria-hidden /> {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <Phone size={14} aria-hidden /> {client.phone}
              </a>
            )}
          </span>
        }
        actions={
          <Link href={newInvoiceHref} className="btn btn-primary">
            <Plus size={16} aria-hidden /> New Invoice
          </Link>
        }
      />

      <StatGrid>
        <StatCard
          label="Total Billed"
          value={formatRupiahCompact(totals.billed)}
          icon={<Wallet size={18} />}
          tone="accent"
          hint={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
          loading={invoicesLoading}
        />
        <StatCard
          label="Paid"
          value={formatRupiahCompact(totals.paid)}
          icon={<CheckCircle2 size={18} />}
          tone="success"
          loading={invoicesLoading}
        />
        <StatCard
          label="Outstanding"
          value={formatRupiahCompact(totals.outstanding)}
          icon={<Clock size={18} />}
          tone={totals.outstanding > 0 ? "warning" : "neutral"}
          hint={totals.outstandingCount > 0 ? `${totals.outstandingCount} unpaid` : "All settled"}
          loading={invoicesLoading}
        />
        <StatCard
          label="Last Invoice"
          value={<span className="text-lg sm:text-xl">{lastInvoiceDate ? formatDate(lastInvoiceDate) : "—"}</span>}
          icon={<FileText size={18} />}
          tone="purple"
          hint={invoices[0]?.invoice_number}
          loading={invoicesLoading}
        />
      </StatGrid>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        {/* INVOICE HISTORY */}
        <Panel
          title="Invoices"
          description="Every invoice issued to this client, newest first."
          icon={<FileText size={16} />}
          padded={false}
          className="xl:col-span-2"
          actions={
            <Link href={newInvoiceHref} className="btn btn-ghost btn-sm">
              <Plus size={14} aria-hidden /> New
            </Link>
          }
        >
          {invoicesLoading ? (
            <LoadingState label="Loading invoices..." />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="No invoices yet"
              description="Invoices you create for this client will appear here."
              action={
                <Link href={newInvoiceHref} className="btn btn-ghost">
                  <Plus size={14} aria-hidden /> Create first invoice
                </Link>
              }
            />
          ) : (
            <>
              <TableWrap className="hidden md:block">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Due</th>
                      <th className="text-right!">Amount</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <Link href={`/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-accent hover:underline">
                            {inv.invoice_number}
                          </Link>
                          {inv.legacy_number && (
                            <div className="font-mono text-xs text-fg-subtle" title="Number before renumbering">
                              {inv.legacy_number}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{formatDate(inv.invoice_date)}</td>
                        <td className="whitespace-nowrap tabular-nums">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums text-fg">
                          {formatRupiah(inv.total_amount)}
                        </td>
                        <td>
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="btn btn-ghost btn-sm btn-icon size-8!"
                            aria-label={`Open invoice ${inv.invoice_number}`}
                            title="Open invoice"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>

              <MobileList>
                {pageItems.map((inv) => (
                  <ListCard
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    title={<span className="font-mono">{inv.invoice_number}</span>}
                    subtitle={`Issued ${formatDate(inv.invoice_date)}${inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}`}
                    value={formatRupiah(inv.total_amount)}
                    meta={<StatusBadge status={inv.status} />}
                  />
                ))}
              </MobileList>

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </Panel>

        {/* CLIENT DETAILS */}
        <Panel title="Client details" icon={<User size={16} />}>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field
                label={<IconLabel icon={<User size={12} />}>Full Name</IconLabel>}
                htmlFor="client-full-name"
                required
                className="sm:col-span-2 xl:col-span-1"
              >
                <TextInput
                  id="client-full-name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </Field>
              <Field label={<IconLabel icon={<Mail size={12} />}>Email</IconLabel>} htmlFor="client-email">
                <TextInput
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label={<IconLabel icon={<Phone size={12} />}>Phone</IconLabel>} htmlFor="client-phone">
                <TextInput
                  id="client-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field
                label={<IconLabel icon={<Building size={12} />}>Company</IconLabel>}
                htmlFor="client-company"
                className="sm:col-span-2 xl:col-span-1"
              >
                <TextInput
                  id="client-company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </Field>
              <Field
                label={<IconLabel icon={<MapPin size={12} />}>Address</IconLabel>}
                htmlFor="client-address"
                className="sm:col-span-2 xl:col-span-1"
              >
                <TextArea
                  id="client-address"
                  className="min-h-20"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-line pt-4">
              <button type="submit" className="btn btn-ghost" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
