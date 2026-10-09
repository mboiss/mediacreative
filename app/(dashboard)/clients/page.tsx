"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Trash2, Users, Loader2, Edit2, Mail, Phone, Building, Download, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { FilterBar, TableWrap } from "@/components/ui/data-table";
import { Field, SearchInput, TextArea, TextInput } from "@/components/ui/field";
import { exportToCSV } from "@/lib/export-utils";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
};

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
};

// Opens the "Add Client" modal when the URL contains ?new=1 (e.g. from the dashboard Quick Action).
function NewClientTrigger({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  useEffect(() => {
    if (isNew) onOpen();
  }, [isNew, onOpen]);
  return null;
}

/** Table cell content with a leading icon, or a muted dash when empty. */
function IconCell({ icon, value }: { icon: React.ReactNode; value?: string | null }) {
  if (!value) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="shrink-0 text-fg-subtle" aria-hidden>
        {icon}
      </span>
      {value}
    </span>
  );
}

export default function ClientsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadClients, { tables: ["clients"] });

  const openCreateModal = useCallback(() => {
    setEditingClient(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }, []);

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      full_name: client.full_name || "",
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      address: client.address || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = !!editingClient;
      const res = await fetch("/api/clients", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingClient.id, ...form } : form),
      });
      if (res.ok) {
        setForm({ ...EMPTY_FORM });
        setEditingClient(null);
        setShowModal(false);
        toast.success(
          isEdit ? "Client Updated" : "Client Added",
          `Client ${form.full_name} saved successfully`
        );
        await loadClients();
      } else {
        const err = await res.json();
        toast.error("Error Saving Client", err.error || "Operation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not connect to server");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: string) {
    const client = clients.find((c) => c.id === id);
    if (
      !(await confirm({
        title: "Delete client?",
        message: `${client?.full_name ? `"${client.full_name}"` : "This client"} will be permanently removed.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        toast.success("Client Deleted", "Client removed from database");
        await loadClients();
      } else {
        const err = await res.json();
        toast.error("Delete Failed", err.error || "Server error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection Error", "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    exportToCSV("clients_export", clients, [
      { key: "full_name", label: "Full Name" },
      { key: "company", label: "Company" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
    ]);
    toast.info("Exporting Data", "CSV file download started");
  }

  const filtered = clients.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const { pageItems, page, setPage, pageSize, setPageSize, totalPages, totalItems } = usePagination(filtered, search);

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <NewClientTrigger onOpen={openCreateModal} />
      </Suspense>

      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length !== 1 ? "s" : ""} in your database`}
        actions={
          <>
            <button className="btn btn-ghost" onClick={handleExport} title="Export CSV file">
              <Download size={16} aria-hidden />
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={16} aria-hidden />
              New Client
            </button>
          </>
        }
      />

      <Panel padded={false}>
        <div className="border-b border-line p-4">
          <FilterBar>
            <SearchInput
              icon={<Search size={16} />}
              className="sm:max-w-sm"
              placeholder="Search name, company, email..."
              aria-label="Search clients"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterBar>
        </div>

        {loading ? (
          <LoadingState label="Loading clients..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={search ? "No clients found" : "No clients yet"}
            description={search ? "Try a different search term." : "Add your first client to get started."}
            action={
              !search ? (
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={16} aria-hidden /> New Client
                </button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right!">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link
                        href={`/clients/${client.id}`}
                        className="whitespace-nowrap font-semibold text-fg hover:text-accent hover:underline"
                      >
                        {client.full_name}
                      </Link>
                    </td>
                    <td>
                      <IconCell icon={<Building size={14} />} value={client.company} />
                    </td>
                    <td>
                      <IconCell icon={<Mail size={14} />} value={client.email} />
                    </td>
                    <td>
                      <IconCell icon={<Phone size={14} />} value={client.phone} />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(client)}
                          aria-label={`Edit ${client.full_name}`}
                          title="Edit"
                        >
                          <Edit2 size={14} aria-hidden />
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteClient(client.id)}
                          disabled={deletingId === client.id}
                          aria-label={`Delete ${client.full_name}`}
                          title="Delete"
                        >
                          {deletingId === client.id ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                          ) : (
                            <Trash2 size={14} aria-hidden />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
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
      </Panel>

      {/* ADD / EDIT CLIENT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingClient ? "Edit Client" : "New Client"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" htmlFor="client-full-name" required className="sm:col-span-2">
              <TextInput
                id="client-full-name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email" htmlFor="client-email">
              <TextInput
                id="client-email"
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone" htmlFor="client-phone">
              <TextInput
                id="client-phone"
                placeholder="+62 812 ..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Company" htmlFor="client-company" className="sm:col-span-2">
              <TextInput
                id="client-company"
                placeholder="PT. Example Indonesia"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Address" htmlFor="client-address" className="sm:col-span-2">
              <TextArea
                id="client-address"
                className="min-h-16"
                placeholder="Street, City, Province"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowModal(false);
                setForm({ ...EMPTY_FORM });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : editingClient ? (
                <Save size={16} aria-hidden />
              ) : (
                <Plus size={16} aria-hidden />
              )}
              {saving ? "Saving..." : editingClient ? "Save" : "Add Client"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
