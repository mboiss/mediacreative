"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Building,
  MapPin,
  User,
} from "lucide-react";

type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    loadClient();
  }, [loadClient]);

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
        alert("Client updated successfully.");
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to update"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, color: "#8ba3c7" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading client...
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <p style={{ color: "#8ba3c7" }}>Client not found.</p>
        <Link href="/clients">
          <button className="btn btn-ghost" style={{ marginTop: 16 }}>
            <ArrowLeft size={14} /> Back
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <Link href="/clients">
        <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "0.8rem" }}>
          <ArrowLeft size={13} /> All Clients
        </button>
      </Link>

      <div className="animate-fade-in-up">
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {client.full_name}
        </h1>
        {client.company && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>{client.company}</p>
        )}
      </div>

      <form
        onSubmit={handleSave}
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">
              <User size={11} style={{ display: "inline", marginRight: 4 }} />
              Full Name *
            </label>
            <input
              className="form-input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">
              <Mail size={11} style={{ display: "inline", marginRight: 4 }} />
              Email
            </label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">
              <Phone size={11} style={{ display: "inline", marginRight: 4 }} />
              Phone
            </label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">
              <Building size={11} style={{ display: "inline", marginRight: 4 }} />
              Company
            </label>
            <input
              className="form-input"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">
              <MapPin size={11} style={{ display: "inline", marginRight: 4 }} />
              Address
            </label>
            <textarea
              className="form-input"
              style={{ resize: "vertical", minHeight: 72 }}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
