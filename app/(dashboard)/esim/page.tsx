"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  Plus,
  Search,
  QrCode,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { exportToCSV } from "@/lib/export-utils";

type EsimProfile = {
  id: string;
  iccid: string;
  package_name: string;
  region: string;
  data_gb: number;
  price: number;
  user_name: string;
  activation_code: string;
  status: "Active" | "Pending" | "Expired";
  expiry_date: string;
};

const INITIAL_PROFILES: EsimProfile[] = [
  {
    id: "esim-01",
    iccid: "8988211004928192831F",
    package_name: "Global Ultra 5G (50GB)",
    region: "Global (120+ Countries)",
    data_gb: 50,
    price: 650000,
    user_name: "Media Crew - Field Ops",
    activation_code: "LPA:1$rsp.global-esim.net$MC-8921-9921",
    status: "Active",
    expiry_date: "2026-08-30",
  },
  {
    id: "esim-02",
    iccid: "8988211004928192832F",
    package_name: "Asia-Pacific Unlimited (10GB)",
    region: "Asia Pacific",
    data_gb: 10,
    price: 250000,
    user_name: "Rizky Event Photographer",
    activation_code: "LPA:1$rsp.asia-esim.com$MC-4410-1092",
    status: "Active",
    expiry_date: "2026-08-15",
  },
  {
    id: "esim-03",
    iccid: "8988211004928192833F",
    package_name: "Indonesia Premier 5G (20GB)",
    region: "Indonesia Domestic",
    data_gb: 20,
    price: 180000,
    user_name: "Client Live Streamer",
    activation_code: "LPA:1$rsp.telkomsel-esim.id$MC-0012-9812",
    status: "Expired",
    expiry_date: "2026-07-20",
  },
];

function formatCurrency(amount: number) {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EsimPage() {
  const toast = useToast();
  const [profiles, setProfiles] = useState<EsimProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeQrModal, setActiveQrModal] = useState<EsimProfile | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [form, setForm] = useState({
    user_name: "",
    package_name: "Global Ultra 5G (50GB)",
    region: "Global (120+ Countries)",
    data_gb: "50",
    price: "650000",
    validity_days: "30",
  });

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/esim?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setProfiles(data);
      }
    } catch (err) {
      console.error("Failed to load eSIM profiles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadProfiles, { tables: ["esim_profiles"] });

  async function handleCreateEsim(e: React.FormEvent) {
    e.preventDefault();
    const randomIccid = "8988211004" + Math.floor(1000000000 + Math.random() * 9000000000) + "F";
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + Number(form.validity_days || 30));

    const newProfile = {
      iccid: randomIccid,
      package_name: form.package_name,
      region: form.region,
      data_gb: Number(form.data_gb),
      price: Number(form.price),
      user_name: form.user_name || "Media Creative User",
      activation_code: `LPA:1$rsp.global-esim.net$MC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "Active",
      expiry_date: expDate.toISOString().split("T")[0],
    };

    try {
      const res = await fetch("/api/esim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProfile),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({
          user_name: "",
          package_name: "Global Ultra 5G (50GB)",
          region: "Global (120+ Countries)",
          data_gb: "50",
          price: "650000",
          validity_days: "30",
        });
        toast.success("eSIM Provisioned", `Profile assigned to ${newProfile.user_name}`);
        await loadProfiles();
      } else {
        toast.error("Provisioning Failed", "Could not save eSIM to database");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Failed to create eSIM");
    }
  }

  async function deleteProfile(id: string) {
    if (!confirm("Are you sure you want to remove this eSIM profile?")) return;
    try {
      const res = await fetch("/api/esim", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        toast.success("eSIM Profile Removed", "Profile deleted permanently");
      } else {
        toast.error("Delete Failed", "Could not remove profile from database");
      }
    } catch (err) {
      console.error(err);
    }
  }

  function copyActivationCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.info("Copied", "Activation code copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleExport() {
    exportToCSV("esim_profiles_export", profiles, [
      { key: "user_name", label: "User / Assignee" },
      { key: "iccid", label: "ICCID" },
      { key: "package_name", label: "Package" },
      { key: "region", label: "Region" },
      { key: "data_gb", label: "Data (GB)" },
      { key: "price", label: "Price (IDR)" },
      { key: "status", label: "Status" },
      { key: "expiry_date", label: "Expiry Date" },
    ]);
    toast.info("Exporting Data", "CSV file download started");
  }

  const filtered = profiles.filter((p) => {
    const matchSearch =
      p.user_name.toLowerCase().includes(search.toLowerCase()) ||
      p.iccid.toLowerCase().includes(search.toLowerCase()) ||
      p.package_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive = profiles.filter((p) => p.status === "Active").length;
  const totalGb = profiles.reduce((s, p) => s + (p.status === "Active" ? p.data_gb : 0), 0);
  const totalRevenue = profiles.reduce((s, p) => s + p.price, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            eSIM Global Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Instant eSIM profile provision, ICCID tracking, and QR code activation.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleExport} title="Export CSV file">
            <Download size={15} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Provision eSIM
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Total Profiles", value: profiles.length, color: "var(--accent-cyan)" },
          { label: "Active Connections", value: totalActive, color: "var(--accent-emerald)" },
          { label: "Active Bandwidth", value: `${totalGb} GB`, color: "#7c3aed" },
          { label: "eSIM Sales Value", value: formatCurrency(totalRevenue), color: "var(--accent-amber)" },
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
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search ICCID, user or package..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "Active", "Expired", "Pending"].map((s) => (
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
                borderColor: statusFilter === s ? "var(--border-accent)" : "var(--border)",
                background: statusFilter === s ? "var(--accent-cyan-dim)" : "transparent",
                color: statusFilter === s ? "var(--accent-cyan)" : "var(--text-secondary)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Smartphone size={28} />}
            title="No eSIM profiles found"
            description="Provision a new eSIM profile to get started."
            action={
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} /> Provision eSIM
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ICCID / User</th>
                <th>Package Plan</th>
                <th>Region</th>
                <th>Quota</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.user_name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-secondary)", background: "var(--bg-glass-hover)", padding: "1px 5px", borderRadius: 4, display: "inline-block", marginTop: 2 }}>
                      {item.iccid}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{item.package_name}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      <Globe size={12} /> {item.region}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "#a78bfa" }}>{item.data_gb} GB</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(item.price)}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatDate(item.expiry_date)}</td>
                  <td>
                    <span className={item.status === "Active" ? "badge badge-paid" : "badge badge-cancelled"}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setActiveQrModal(item)}
                      >
                        <QrCode size={13} /> QR Code
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "5px 8px", fontSize: "0.78rem" }}
                        onClick={() => deleteProfile(item.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PROVISION ESIM MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Provision New eSIM Profile">
        <form onSubmit={handleCreateEsim} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Assignee / User Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Media Event Team"
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                required
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Package Plan *</label>
              <select
                className="form-input form-select"
                value={form.package_name}
                onChange={(e) => {
                  const pName = e.target.value;
                  if (pName.includes("50GB")) {
                    setForm({ ...form, package_name: pName, region: "Global (120+ Countries)", data_gb: "50", price: "650000" });
                  } else if (pName.includes("10GB")) {
                    setForm({ ...form, package_name: pName, region: "Asia Pacific", data_gb: "10", price: "250000" });
                  } else {
                    setForm({ ...form, package_name: pName, region: "Indonesia Domestic", data_gb: "20", price: "180000" });
                  }
                }}
              >
                <option value="Global Ultra 5G (50GB)">Global Ultra 5G (50GB) — Rp 650.000</option>
                <option value="Asia-Pacific Unlimited (10GB)">Asia-Pacific Unlimited (10GB) — Rp 250.000</option>
                <option value="Indonesia Premier 5G (20GB)">Indonesia Premier 5G (20GB) — Rp 180.000</option>
              </select>
            </div>
            <div>
              <label className="form-label">Quota (GB)</label>
              <input className="form-input" value={form.data_gb} readOnly />
            </div>
            <div>
              <label className="form-label">Price (Rp)</label>
              <input className="form-input" value={form.price} readOnly />
            </div>
            <div>
              <label className="form-label">Validity Period (Days)</label>
              <input
                type="number"
                className="form-input"
                value={form.validity_days}
                onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Zap size={14} /> Provision eSIM
            </button>
          </div>
        </form>
      </Modal>

      {/* QR CODE MODAL */}
      <Modal isOpen={!!activeQrModal} onClose={() => setActiveQrModal(null)} title="eSIM QR Code & Activation">
        {activeQrModal && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ background: "white", padding: 16, borderRadius: 16, border: "4px solid rgba(0,212,255,0.3)" }}>
              {/* Simulated QR Pattern */}
              <div style={{ width: 160, height: 160, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, background: "#0f172a", padding: 8, borderRadius: 8 }}>
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background: (i * 13 + 7) % 3 === 0 ? "#00d4ff" : (i * 7 + 3) % 2 === 0 ? "#7c3aed" : "#0f172a",
                      borderRadius: (i % 5 === 0) ? 2 : 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: "#f0f6ff", fontSize: "1.1rem" }}>{activeQrModal.package_name}</div>
              <div style={{ fontSize: "0.8rem", color: "#8ba3c7", marginTop: 2 }}>{activeQrModal.user_name}</div>
            </div>

            <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", textAlign: "left" }}>
              <div style={{ fontSize: "0.7rem", color: "#4a6080", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Activation String (LPA)</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#00d4ff", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeQrModal.activation_code}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => copyActivationCode(activeQrModal.activation_code)}
                >
                  {copiedCode ? <Check size={12} style={{ color: "#34d399" }} /> : <Copy size={12} />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}