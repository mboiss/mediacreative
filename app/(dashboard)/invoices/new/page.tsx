"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  User,
  Calendar,
  Package,
  Sparkles,
  Building,
  CreditCard,
  Percent,
  Check,
  Eye,
  FileText,
  DollarSign,
  AlertCircle,
  Search,
  Wifi,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { InvoiceSheet } from "@/components/invoice/invoice-sheet";
import {
  getPaymentAccounts,
  formatAccountTransferText,
  PaymentAccount,
} from "@/lib/payment-accounts";

type Client = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
};

type Product = {
  id: string;
  product_name: string;
  product_code?: string;
  price: number;
  category?: string;
};

type FormLineItem = {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export default function NewInvoicePage() {
  const router = useRouter();

  // Data sources
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [notes, setNotes] = useState("");

  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Line items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { id: "item-1", product_id: "", description: "Media & Creative Production Services", quantity: 1, unit_price: 1500000 },
  ]);

  // UI States
  const [saving, setSaving] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ full_name: "", company: "", email: "", phone: "", address: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<"edit" | "preview">("edit");
  const [clientSearch, setClientSearch] = useState("");
  const [tourLogs, setTourLogs] = useState<any[]>([]);

  // Load clients, products, payment accounts, and tour logs
  const loadData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/products"),
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      if (Array.isArray(cData)) setClients(cData);
      if (Array.isArray(pData)) setProducts(pData);

      const accs = getPaymentAccounts();
      setPaymentAccounts(accs);
      const defaultAcc = accs.find((a) => a.is_default) || accs[0];
      if (defaultAcc) {
        setNotes(formatAccountTransferText(defaultAcc));
      }

      if (typeof window !== "undefined") {
        const savedTours = localStorage.getItem("media_creative_tour_logs");
        if (savedTours) {
          try { setTourLogs(JSON.parse(savedTours)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected client object & Live Filter
  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });
  const selectedClient = clients.find((c) => c.id === clientId);

  // Quick Add Modem Rental from Tour Code (Auto Qty & Auto Rp 600.000)
  function addModemRentalItemFromTour(t: any) {
    const newItem: FormLineItem = {
      id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
      product_id: "",
      description: `Modem Wifi Rental — Tour Code: ${t.tourcode} (Start Date: ${t.start_date || "—"})`,
      quantity: Number(t.qty) || 1, // Automatically set quantity to assigned modems!
      unit_price: 600000,           // Automatically set price to Rp 600.000!
    };
    setLineItems((prev) => [...prev, newItem]);
  }

  function addGenericModemRentalItem() {
    const newItem: FormLineItem = {
      id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
      product_id: "",
      description: "Modem Wifi Rental (Orbit Mifi Device)",
      quantity: 1,
      unit_price: 600000,           // Automatically set price to Rp 600.000!
    };
    setLineItems((prev) => [...prev, newItem]);
  }

  // Due date presets
  function applyDueDatePreset(days: number) {
    const d = new Date(invoiceDate || Date.now());
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split("T")[0]);
  }

  // Line item manipulation
  function handleAddLineItem(product?: Product) {
    const newItem: FormLineItem = {
      id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
      product_id: product?.id || "",
      description: product ? product.product_name : "",
      quantity: 1,
      unit_price: product ? product.price : 0,
    };
    setLineItems((prev) => [...prev, newItem]);
  }

  function handleUpdateLineItem(id: string, field: keyof FormLineItem, val: any) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === "product_id" && val) {
          const matched = products.find((p) => p.id === val);
          if (matched) {
            updated.description = matched.product_name;
            updated.unit_price = matched.price;
          }
        }
        return updated;
      })
    );
  }

  function handleRemoveLineItem(id: string) {
    if (lineItems.length === 1) {
      alert("Invoice must have at least 1 line item.");
      return;
    }
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Quick preset bank notes
  function applyBankPreset(bankName: string, accNo: string) {
    const preset = `Transfer Pembayaran:\nBank ${bankName}: ${accNo} a.n. Media Creative\nMohon bukti transfer diisi nomor invoice. Terima kasih!`;
    setNotes(preset);
  }

  // Calculations
  const rawSubtotal = lineItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxAmount = (rawSubtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, rawSubtotal + taxAmount - discountAmount);

  function formatCurrency(num: number) {
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  }

  // Quick Client Creation
  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientForm),
      });
      if (res.ok) {
        const created = await res.json();
        setClients((prev) => [created, ...prev]);
        setClientId(created.id);
        setShowNewClientModal(false);
        setNewClientForm({ full_name: "", company: "", email: "", phone: "", address: "" });
      } else {
        const err = await res.json();
        alert("Failed to add client: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error adding client.");
    } finally {
      setCreatingClient(false);
    }
  }

  // Save / Submit Invoice
  async function handleSubmit(targetStatus: "Draft" | "Sent") {
    if (!clientId) {
      alert("Please select a client for this invoice.");
      return;
    }

    if (lineItems.some((it) => !it.description.trim())) {
      alert("All line items must have a description.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        notes: notes || null,
        status: targetStatus,
        tax_percent: taxPercent,
        discount_amount: discountAmount,
        items: lineItems.map((it) => ({
          product_id: it.product_id || null,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
        })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        router.push(`/invoices/${created.id}`);
      } else {
        const err = await res.json();
        alert("Failed to create invoice: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, color: "var(--text-secondary)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Initializing Invoice Studio...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1240, margin: "0 auto" }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* TOP HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/invoices">
            <button className="btn btn-ghost" style={{ padding: "8px 12px" }}>
              <ArrowLeft size={15} />
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              Create New Invoice
              <span className="badge badge-draft">Draft</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "2px 0 0" }}>
              Build a professional invoice with real-time live preview.
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={() => handleSubmit("Draft")}
            disabled={saving}
            style={{ fontSize: "0.875rem" }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            Save Draft
          </button>

          <button
            className="btn btn-primary"
            onClick={() => handleSubmit("Sent")}
            disabled={saving}
            style={{ fontSize: "0.875rem" }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
            Create & Issue Invoice
          </button>
        </div>
      </div>

      {/* TWO-COLUMN STUDIO LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 24, alignItems: "start" }}>

        {/* LEFT COLUMN: EDITOR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 1. CLIENT SELECTION */}
          <div
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <User size={13} style={{ color: "var(--accent-cyan)" }} />
                Select Client *
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowNewClientModal(true)}
                style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--accent-cyan)" }}
              >
                <Plus size={12} />
                New Client
              </button>
            </div>

            {/* SEARCHABLE CLIENT SELECTOR */}
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="form-input"
                style={{ paddingLeft: 30, fontSize: "0.82rem", height: 36 }}
                placeholder="Type to search client name, company, or email..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input form-select"
              style={{ fontSize: "0.95rem", fontWeight: 500 }}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Select Client ({filteredClients.length} found) —</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.company ? `(${c.company})` : ""} {c.email ? `• ${c.email}` : ""}
                </option>
              ))}
            </select>

            {selectedClient && (
              <div
                style={{
                  background: "var(--bg-glass-hover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.875rem" }}>
                  {selectedClient.full_name}
                </div>
                {selectedClient.company && <div>{selectedClient.company}</div>}
                {selectedClient.email && <div>Email: {selectedClient.email}</div>}
                {selectedClient.phone && <div>Phone: {selectedClient.phone}</div>}
                {selectedClient.address && <div style={{ marginTop: 2 }}>Address: {selectedClient.address}</div>}
              </div>
            )}
          </div>

          {/* 2. DATES & TERMS */}
          <div
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={13} style={{ color: "var(--accent-cyan)" }} />
              Invoice Dates & Terms
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">Issue Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  min={invoiceDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Due Date Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Quick Presets:</span>
              {[
                { label: "On Receipt", days: 0 },
                { label: "+3 Days", days: 3 },
                { label: "+7 Days", days: 7 },
                { label: "+14 Days", days: 14 },
                { label: "+30 Days", days: 30 },
                { label: "+60 Days", days: 60 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyDueDatePreset(preset.days)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--bg-glass)",
                    color: "var(--text-secondary)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. LINE ITEMS TABLE EDITOR */}
          <div
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
                <Package size={13} style={{ color: "var(--accent-cyan)" }} />
                Line Items ({lineItems.length})
              </div>

              {products.length > 0 && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Autofill from catalog active
                </div>
              )}
            </div>

            {/* Catalog Quick Add Pills */}
            {products.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Quick Add Catalog Item:</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {products.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddLineItem(p)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 20,
                        border: "1px solid var(--border)",
                        background: "var(--accent-cyan-dim)",
                        color: "var(--accent-cyan)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Plus size={11} /> {p.product_name} ({formatCurrency(p.price)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TOUR CODE MODEM RENTAL SHORTCUT PILLS */}
            {tourLogs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "rgba(0,212,255,0.04)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--accent-cyan)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Wifi size={13} /> Quick Add Modem Rental from Active Tour (Auto-sets Qty & Rp 600.000):
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 110, overflowY: "auto" }}>
                  {tourLogs.slice(0, 10).map((t) => (
                    <button
                      key={t.tourcode}
                      type="button"
                      onClick={() => addModemRentalItemFromTour(t)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 16,
                        border: "1px solid var(--accent-cyan)",
                        background: "var(--accent-cyan-dim)",
                        color: "var(--accent-cyan)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={`Add Modem Rental for ${t.tourcode} (${t.qty} modems assigned)`}
                    >
                      <Plus size={11} /> {t.tourcode} ({t.qty} modem{t.qty > 1 ? "s" : ""})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "var(--bg-glass-hover)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      Item #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        cursor: "pointer",
                        padding: 4,
                      }}
                      title="Remove line item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Catalog Selector Dropdown */}
                  {products.length > 0 && (
                    <div>
                      <select
                        className="form-input form-select"
                        style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                        value={item.product_id}
                        onChange={(e) => handleUpdateLineItem(item.id, "product_id", e.target.value)}
                      >
                        <option value="">— Custom Description (or pick catalog product) —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.product_name} — Rp {p.price.toLocaleString("id-ID")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Description Input */}
                  <input
                    className="form-input"
                    placeholder="Enter item description..."
                    value={item.description}
                    onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                  />

                  {/* Qty, Unit Price, Subtotal Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 10, alignItems: "center" }}>
                    <div>
                      <label className="form-label" style={{ fontSize: "0.68rem" }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLineItem(item.id, "quantity", Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: "0.68rem" }}>Unit Price (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        className="form-input"
                        value={item.unit_price}
                        onChange={(e) => handleUpdateLineItem(item.id, "unit_price", Number(e.target.value))}
                      />
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Total</span>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addGenericModemRentalItem}
                style={{ justifyContent: "center", borderStyle: "solid", borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", gap: 6, fontSize: "0.82rem" }}
              >
                <Wifi size={14} />
                + Add Modem Rental (Rp 600.000)
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleAddLineItem()}
                style={{ justifyContent: "center", borderStyle: "dashed", gap: 6, fontSize: "0.82rem" }}
              >
                <Plus size={14} />
                Add Blank Line Item
              </button>
            </div>
          </div>

          {/* 4. TAX, DISCOUNT & PAYMENT NOTES */}
          <div
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
              <CreditCard size={13} style={{ color: "var(--accent-cyan)" }} />
              Tax, Discount & Payment Terms
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">PPN Tax (%)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setTaxPercent(taxPercent === 11 ? 0 : 11)}
                    style={{
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: taxPercent === 11 ? "var(--accent-cyan-dim)" : "var(--bg-glass)",
                      color: taxPercent === 11 ? "var(--accent-cyan)" : "var(--text-secondary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    PPN 11%
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Discount Amount (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  className="form-input"
                  placeholder="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Payment Instructions & Notes</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {paymentAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setNotes(formatAccountTransferText(acc))}
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--bg-glass)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                      title={`Select ${acc.bank_name}`}
                    >
                      + {acc.bank_name} ({acc.account_number})
                    </button>
                  ))}
                  <Link
                    href="/settings"
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--accent-cyan)",
                      textDecoration: "none",
                      fontWeight: 600,
                      marginLeft: 4,
                    }}
                  >
                    ⚙️ Manage
                  </Link>
                </div>
              </div>
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include bank transfer details or payment instructions..."
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME LIVE INVOICE PREVIEW SHEET */}
        <div style={{ position: "sticky", top: 88 }}>
          <InvoiceSheet
            invoiceNumber="PREVIEW-DRAFT"
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            client={selectedClient}
            items={lineItems}
            notes={notes}
            subtotal={rawSubtotal}
            totalAmount={grandTotal}
            status="Draft"
          />
        </div>
      </div>

      {/* CREATE NEW CLIENT MODAL */}
      <Modal isOpen={showNewClientModal} onClose={() => setShowNewClientModal(false)} title="Quick Add Client">
        <form onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              value={newClientForm.full_name}
              onChange={(e) => setNewClientForm({ ...newClientForm, full_name: e.target.value })}
              required
              placeholder="e.g. Budi Pratama"
            />
          </div>
          <div>
            <label className="form-label">Company Name</label>
            <input
              className="form-input"
              value={newClientForm.company}
              onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
              placeholder="e.g. PT Media Utama"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={newClientForm.email}
                onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                placeholder="budi@example.com"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              style={{ minHeight: 60, resize: "vertical" }}
              value={newClientForm.address}
              onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
              placeholder="Client billing address..."
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowNewClientModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingClient}>
              {creatingClient ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
              Save Client & Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
