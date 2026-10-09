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
  Trash2,
  Copy,
  Check,
  Download,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, TableWrap } from "@/components/ui/data-table";
import { Field, SearchInput, SelectInput, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { formatDate, formatRupiah } from "@/lib/format";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { MobileList, ListCard } from "@/components/ui/list-card";

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

export default function EsimPage() {
  const toast = useToast();
  const confirm = useConfirm();
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
    if (
      !(await confirm({
        title: "Remove eSIM profile?",
        message: "This eSIM profile will be permanently deleted.",
        confirmLabel: "Remove",
        tone: "danger",
      }))
    )
      return;
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
      toast.error("Network Error", "Failed to remove eSIM profile");
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

  const esimActions = (item: EsimProfile): RowAction[] => [
    { label: "Show QR code", icon: <QrCode />, onSelect: () => setActiveQrModal(item) },
    { label: "Copy activation code", icon: <Copy />, onSelect: () => copyActivationCode(item.activation_code) },
    { label: "Remove", icon: <Trash2 />, onSelect: () => deleteProfile(item.id), danger: true },
  ];

  const totalActive = profiles.filter((p) => p.status === "Active").length;
  const totalGb = profiles.reduce((s, p) => s + (p.status === "Active" ? p.data_gb : 0), 0);
  const totalRevenue = profiles.reduce((s, p) => s + p.price, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="eSIM Profiles"
        description="Provision eSIM profiles, track ICCIDs and share QR activation codes."
        actions={
          <>
            <button className="btn btn-ghost" onClick={handleExport} title="Export CSV file">
              <Download size={16} aria-hidden />
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} aria-hidden />
              Provision eSIM
            </button>
          </>
        }
      />

      {/* KPI STRIP */}
      <StatGrid>
        <StatCard label="Total Profiles" value={profiles.length} icon={<Smartphone size={20} />} tone="accent" loading={loading} />
        <StatCard label="Active Connections" value={totalActive} icon={<CheckCircle2 size={20} />} tone="success" loading={loading} />
        <StatCard label="Active Bandwidth" value={`${totalGb} GB`} icon={<Globe size={20} />} tone="purple" loading={loading} />
        <StatCard label="eSIM Sales Value" value={formatRupiah(totalRevenue)} icon={<Wallet size={20} />} tone="warning" loading={loading} />
      </StatGrid>

      <Panel padded={false}>
        {/* FILTER BAR */}
        <div className="border-b border-line p-4">
          <FilterBar>
            <SearchInput
              icon={<Search size={16} />}
              className="basis-full sm:basis-64"
              placeholder="Search ICCID, user or package..."
              aria-label="Search eSIM profiles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
              {["All", "Active", "Expired", "Pending"].map((s) => {
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-accent-border bg-accent-bg text-accent"
                        : "border-line text-fg-muted hover:bg-surface-hover hover:text-fg"
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
          <LoadingState label="Loading eSIM profiles..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Smartphone size={28} />}
            title="No eSIM profiles found"
            description="Provision a new eSIM profile to get started."
            action={
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} aria-hidden /> Provision eSIM
              </button>
            }
          />
        ) : (
          <>
          <TableWrap className="hidden md:block">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>ICCID / User</th>
                  <th>Package Plan</th>
                  <th>Region</th>
                  <th>Quota</th>
                  <th className="text-right!">Price</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th className="text-right!"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-fg">{item.user_name}</div>
                      <div className="mt-0.5 inline-block rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-xs text-fg-muted">
                        {item.iccid}
                      </div>
                    </td>
                    <td className="font-medium text-fg">{item.package_name}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Globe size={14} className="shrink-0 text-fg-subtle" aria-hidden /> {item.region}
                      </span>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{item.data_gb} GB</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{formatRupiah(item.price)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatDate(item.expiry_date)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveQrModal(item)}
                          aria-label={`Show QR code for ${item.user_name}`}
                          title="QR code"
                        >
                          <QrCode size={14} aria-hidden /> QR Code
                        </button>
                        <RowActions label={`Actions for ${item.user_name}`} actions={esimActions(item)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <MobileList>
            {filtered.map((item) => (
              <ListCard
                key={item.id}
                title={item.user_name}
                subtitle={<span className="font-mono">{item.iccid}</span>}
                value={formatRupiah(item.price)}
                meta={
                  <>
                    <StatusBadge status={item.status} />
                    <span>
                      {item.package_name} · {item.data_gb} GB
                    </span>
                    <span className="tabular-nums text-fg-subtle">Expires {formatDate(item.expiry_date)}</span>
                  </>
                }
                actions={<RowActions label={`Actions for ${item.user_name}`} actions={esimActions(item)} />}
              />
            ))}
          </MobileList>
          </>
        )}
      </Panel>

      {/* PROVISION ESIM MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Provision eSIM Profile">
        <form onSubmit={handleCreateEsim} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assignee / User Name" htmlFor="esim-user" required className="sm:col-span-2">
              <TextInput
                id="esim-user"
                placeholder="e.g. Media Event Team"
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Package Plan" htmlFor="esim-package" required className="sm:col-span-2">
              <SelectInput
                id="esim-package"
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
              </SelectInput>
            </Field>
            <Field label="Quota (GB)" htmlFor="esim-quota">
              <TextInput id="esim-quota" value={form.data_gb} readOnly />
            </Field>
            <Field label="Price (Rp)" htmlFor="esim-price">
              <TextInput id="esim-price" value={form.price} readOnly />
            </Field>
            <Field label="Validity Period (days)" htmlFor="esim-validity" required>
              <TextInput
                id="esim-validity"
                type="number"
                value={form.validity_days}
                onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
                required
              />
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Zap size={16} aria-hidden /> Provision eSIM
            </button>
          </div>
        </form>
      </Modal>

      {/* QR CODE MODAL */}
      <Modal isOpen={!!activeQrModal} onClose={() => setActiveQrModal(null)} title="eSIM QR Code & Activation">
        {activeQrModal && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-card border border-line bg-inset p-4">
              {/* Simulated QR pattern */}
              <div className="grid size-40 grid-cols-8 gap-0.5 rounded-lg bg-page p-2" aria-hidden>
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      (i * 13 + 7) % 3 === 0 || (i * 7 + 3) % 2 === 0 ? "bg-fg" : "bg-page",
                      i % 5 === 0 && "rounded-xs"
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-lg font-bold text-fg">{activeQrModal.package_name}</div>
              <div className="mt-0.5 text-sm text-fg-muted">{activeQrModal.user_name}</div>
            </div>

            <div className="w-full rounded-xl border border-line bg-inset px-4 py-3 text-left">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Activation String (LPA)</div>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-xs text-accent">{activeQrModal.activation_code}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm shrink-0"
                  onClick={() => copyActivationCode(activeQrModal.activation_code)}
                  aria-label="Copy activation code"
                >
                  {copiedCode ? <Check size={14} className="text-success" aria-hidden /> : <Copy size={14} aria-hidden />}
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
