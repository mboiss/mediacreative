"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Trash2, Users, Loader2, X, Edit2, Mail, Phone, Building, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { exportToCSV } from "@/lib/export-utils";

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

export default function ClientsPage() {
  const toast = useToast();
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
      const res = await fetch("/api/clients");
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

  function openCreateModal() {
    setEditingClient(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

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
    if (!confirm("Apakah Anda yakin ingin menghapus client ini?")) return;
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Clients CRM
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            {clients.length} client{clients.length !== 1 ? "s" : ""} in your database
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleExport} title="Export CSV file">
            <Download size={15} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ position: "relative", maxWidth: 400 }}>
        <Search
          size={14}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
        />
        <input
          className="form-input"
          style={{ paddingLeft: 36 }}
          placeholder="Search name, company, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--text-secondary)" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            Loading clients...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={search ? "No clients found" : "No clients yet"}
            description={search ? "Try a different search term." : "Add your first client to get started."}
            action={
              !search ? (
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={14} /> Add Client
                </button>
              ) : undefined
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {client.full_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {client.company ? (
                        <>
                          <Building size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                          {client.company}
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {client.email ? (
                        <>
                          <Mail size={12} style={{ color: "#4a6080", flexShrink: 0 }} />
                          {client.email}
                        </>
                      ) : (
                        <span style={{ color: "#4a6080" }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {client.phone ? (
                        <>
                          <Phone size={12} style={{ color: "#4a6080", flexShrink: 0 }} />
                          {client.phone}
                        </>
                      ) : (
                        <span style={{ color: "#4a6080" }}>—</span>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => openEditModal(client)}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => deleteClient(client.id)}
                        disabled={deletingId === client.id}
                      >
                        {deletingId === client.id ? (
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD / EDIT CLIENT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingClient ? "Edit Client" : "Add New Client"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                placeholder="+62 812 ..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Company</label>
              <input
                className="form-input"
                placeholder="PT. Example Indonesia"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                style={{ resize: "vertical", minHeight: 64 }}
                placeholder="Street, City, Province"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Plus size={14} />
              )}
              {saving ? "Saving..." : "Add Client"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}