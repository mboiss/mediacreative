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
  CreditCard,
  Check,
  Eye,
  FileText,
  Search,
  Wifi,
  Settings,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { InvoiceSheet } from "@/components/invoice/invoice-sheet";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, SearchInput, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import {
  getPaymentAccounts,
  fetchPaymentAccounts,
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
  const toast = useToast();

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
      const ts = Date.now();
      const [cRes, pRes, tRes, accsData] = await Promise.all([
        fetch(`/api/clients?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/products?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-rentals?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetchPaymentAccounts(),
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) setClients(cData);
      } else {
        const err = await cRes.json().catch(() => ({}));
        toast.error("Failed to load clients", err.error);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) setProducts(pData);
      } else {
        const err = await pRes.json().catch(() => ({}));
        toast.error("Failed to load products", err.error);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTourLogs(tData);
      } else {
        const err = await tRes.json().catch(() => ({}));
        toast.error("Failed to load tour logs", err.error);
      }

      setPaymentAccounts(accsData);
      const defaultAcc = accsData.find((a) => a.is_default) || accsData[0];
      if (defaultAcc) {
        setNotes((prev) => prev || formatAccountTransferText(defaultAcc));
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
      toast.error("Failed to load invoice data", "Please refresh the page and try again.");
    } finally {
      setLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.warning("Invoice must have at least 1 line item.");
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
        toast.success("Client added", created.full_name);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to add client", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add client", "Please try again.");
    } finally {
      setCreatingClient(false);
    }
  }

  // Save / Submit Invoice
  async function handleSubmit(targetStatus: "Draft" | "Sent") {
    if (!clientId) {
      toast.warning("Please select a client for this invoice.");
      return;
    }

    if (lineItems.some((it) => !it.description.trim())) {
      toast.warning("All line items must have a description.");
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
        toast.success(targetStatus === "Sent" ? "Invoice created and marked as sent" : "Invoice saved as draft");
        router.push(`/invoices/${created.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to create invoice", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create invoice", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return <LoadingState label="Loading invoice studio..." />;
  }

  const chip = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors";
  const chipIdle = "border-line bg-surface text-fg-muted hover:border-line-accent hover:text-fg";
  const chipAccent = "border-line bg-surface text-fg hover:border-line-accent hover:bg-surface-hover";

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-6">
      {/* TOP HEADER */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="btn btn-ghost btn-icon shrink-0"
              aria-label="Back to invoices"
              title="Back to invoices"
            >
              <ArrowLeft size={16} />
            </Link>
            New Invoice
          </span>
        }
        meta={<StatusBadge status="Draft" />}
        description="Build a professional invoice with a live preview."
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => handleSubmit("Draft")} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Draft
            </button>
            <button type="button" className="btn btn-primary" onClick={() => handleSubmit("Sent")} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Create &amp; Issue
            </button>
          </>
        }
      />

      {/* EDIT / PREVIEW TOGGLE (below xl, where form and preview stack) */}
      <div
        className="flex w-full gap-1 rounded-control border border-line bg-inset p-1 xl:hidden"
        role="tablist"
        aria-label="Invoice editor view"
      >
        {(
          [
            { key: "edit", label: "Edit", icon: <FileText size={14} /> },
            { key: "preview", label: "Preview", icon: <Eye size={14} /> },
          ] as const
        ).map((tab) => {
          const active = activeTabMobile === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTabMobile(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                active ? "bg-accent-bg text-accent" : "text-fg-muted hover:text-fg"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* STUDIO LAYOUT: form + preview side by side on xl, toggled below */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* LEFT COLUMN: EDITOR */}
        <div className={cn("min-w-0 flex-col gap-5", activeTabMobile === "edit" ? "flex" : "hidden xl:flex")}>
          {/* 1. CLIENT SELECTION */}
          <Panel
            title="Client"
            icon={<User size={15} />}
            actions={
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewClientModal(true)}>
                <Plus size={13} />
                New Client
              </button>
            }
          >
            <div className="flex flex-col gap-3">
              <SearchInput
                icon={<Search size={14} />}
                placeholder="Search client name, company, or email..."
                aria-label="Search clients"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />

              <Field label="Select client" htmlFor="invoice-client" required>
                <SelectInput id="invoice-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Select client ({filteredClients.length} found) —</option>
                  {filteredClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.company ? `(${c.company})` : ""} {c.email ? `• ${c.email}` : ""}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {selectedClient && (
                <div className="flex flex-col gap-1 rounded-xl border border-line bg-inset px-4 py-3 text-sm text-fg-muted">
                  <div className="font-semibold text-fg">{selectedClient.full_name}</div>
                  {selectedClient.company && <div>{selectedClient.company}</div>}
                  {selectedClient.email && <div className="break-all">Email: {selectedClient.email}</div>}
                  {selectedClient.phone && <div>Phone: {selectedClient.phone}</div>}
                  {selectedClient.address && <div className="mt-0.5">Address: {selectedClient.address}</div>}
                </div>
              )}
            </div>
          </Panel>

          {/* 2. DATES & TERMS */}
          <Panel title="Dates & Terms" icon={<Calendar size={15} />}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Issue date" htmlFor="invoice-date" required>
                  <TextInput
                    id="invoice-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </Field>
                <Field label="Due date" htmlFor="invoice-due-date">
                  <TextInput
                    id="invoice-due-date"
                    type="date"
                    value={dueDate}
                    min={invoiceDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Due date presets">
                <span className="mr-1 text-xs font-semibold text-fg-subtle">Due in:</span>
                {[
                  { label: "On receipt", days: 0 },
                  { label: "+3 days", days: 3 },
                  { label: "+7 days", days: 7 },
                  { label: "+14 days", days: 14 },
                  { label: "+30 days", days: 30 },
                  { label: "+60 days", days: 60 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyDueDatePreset(preset.days)}
                    className={cn(chip, chipIdle)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* 3. LINE ITEMS */}
          <Panel
            title={`Line Items (${lineItems.length})`}
            icon={<Package size={15} />}
            description={products.length > 0 ? "Pick a catalog product to autofill description and price." : undefined}
          >
            <div className="flex flex-col gap-4">
              {/* Catalog quick add */}
              {products.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Quick add from catalog</span>
                  <div className="flex flex-wrap gap-1.5">
                    {products.slice(0, 5).map((p) => (
                      <button key={p.id} type="button" onClick={() => handleAddLineItem(p)} className={cn(chip, chipAccent)}>
                        <Plus size={12} /> {p.product_name} ({formatRupiah(p.price)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modem rental from active tour */}
              {tourLogs.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-line bg-inset p-3">
                  <span className="flex items-start gap-1.5 text-xs font-semibold text-fg-muted">
                    <Wifi size={14} className="mt-px shrink-0 text-accent" />
                    Quick add modem rental from an active tour (sets qty and Rp 600.000 automatically)
                  </span>
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {tourLogs.slice(0, 10).map((t) => (
                      <button
                        key={t.tourcode}
                        type="button"
                        onClick={() => addModemRentalItemFromTour(t)}
                        className={cn(chip, chipAccent)}
                        title={`Add modem rental for ${t.tourcode} (${t.qty} modems assigned)`}
                      >
                        <Plus size={12} /> {t.tourcode} ({t.qty} modem{t.qty > 1 ? "s" : ""})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Line item cards */}
              <div className="flex flex-col gap-3">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-line bg-inset p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Item #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="btn btn-ghost btn-icon hover:text-danger"
                        aria-label={`Remove item ${idx + 1}`}
                        title="Remove line item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {products.length > 0 && (
                      <SelectInput
                        aria-label={`Catalog product for item ${idx + 1}`}
                        value={item.product_id}
                        onChange={(e) => handleUpdateLineItem(item.id, "product_id", e.target.value)}
                      >
                        <option value="">— Custom description (or pick a catalog product) —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.product_name} — {formatRupiah(p.price)}
                          </option>
                        ))}
                      </SelectInput>
                    )}

                    <Field label="Description" htmlFor={`${item.id}-desc`}>
                      <TextInput
                        id={`${item.id}-desc`}
                        placeholder="Enter item description..."
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                      />
                    </Field>

                    {/* Qty / Unit price / Total: two columns on phones, three on wider screens */}
                    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1.5fr_1fr]">
                      <Field label="Qty" htmlFor={`${item.id}-qty`}>
                        <TextInput
                          id={`${item.id}-qty`}
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(item.id, "quantity", Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Unit price (Rp)" htmlFor={`${item.id}-price`}>
                        <TextInput
                          id={`${item.id}-price`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1000"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateLineItem(item.id, "unit_price", Number(e.target.value))}
                        />
                      </Field>
                      <div className="col-span-2 flex items-baseline justify-between gap-2 border-t border-line pt-2 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-fg-subtle">Total</span>
                        <span className="whitespace-nowrap text-base font-bold tabular-nums text-fg">
                          {formatRupiah((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  className="btn btn-ghost justify-center whitespace-normal"
                  onClick={addGenericModemRentalItem}
                >
                  <Wifi size={14} />
                  Add Modem Rental (Rp 600.000)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost justify-center whitespace-normal border-dashed"
                  onClick={() => handleAddLineItem()}
                >
                  <Plus size={14} />
                  Add Blank Line Item
                </button>
              </div>
            </div>
          </Panel>

          {/* 4. TAX, DISCOUNT & PAYMENT NOTES */}
          <Panel title="Tax, Discount & Payment" icon={<CreditCard size={15} />}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="PPN tax (%)" htmlFor="invoice-tax">
                  <div className="flex gap-2">
                    <TextInput
                      id="invoice-tax"
                      type="number"
                      min="0"
                      max="100"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => setTaxPercent(taxPercent === 11 ? 0 : 11)}
                      aria-pressed={taxPercent === 11}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-control border px-3 text-xs font-bold transition-colors",
                        taxPercent === 11
                          ? "border-accent-border bg-accent-bg text-accent"
                          : "border-line bg-surface text-fg-muted hover:text-fg"
                      )}
                    >
                      PPN 11%
                    </button>
                  </div>
                </Field>

                <Field label="Discount (Rp)" htmlFor="invoice-discount">
                  <TextInput
                    id="invoice-discount"
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="0"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="invoice-notes" className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Payment instructions &amp; notes
                  </label>
                  <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <Settings size={12} /> Manage accounts
                  </Link>
                </div>
                {paymentAccounts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {paymentAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setNotes(formatAccountTransferText(acc))}
                        className={cn(chip, chipIdle)}
                        title={`Use ${acc.bank_name}`}
                      >
                        <Plus size={12} /> {acc.bank_name} ({acc.account_number})
                      </button>
                    ))}
                  </div>
                )}
                <TextArea
                  id="invoice-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Include bank transfer details or payment instructions..."
                />
              </div>

              {/* Totals summary */}
              <dl className="flex flex-col gap-1.5 rounded-xl border border-line bg-inset px-4 py-3 text-sm">
                <div className="flex justify-between gap-3 text-fg-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatRupiah(rawSubtotal)}</dd>
                </div>
                {taxPercent > 0 && (
                  <div className="flex justify-between gap-3 text-fg-muted">
                    <dt>Tax ({taxPercent}%)</dt>
                    <dd className="tabular-nums">{formatRupiah(taxAmount)}</dd>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between gap-3 text-fg-muted">
                    <dt>Discount</dt>
                    <dd className="tabular-nums">− {formatRupiah(discountAmount)}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2 font-bold text-fg">
                  <dt>Grand total</dt>
                  <dd className="tabular-nums">{formatRupiah(grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className={cn("min-w-0 xl:sticky xl:top-24", activeTabMobile === "preview" ? "block" : "hidden xl:block")}>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            <Eye size={14} /> Live preview
          </div>
          <InvoiceSheet
            compact
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
        <form onSubmit={handleCreateClient} className="flex flex-col gap-4">
          <Field label="Full name" htmlFor="new-client-name" required>
            <TextInput
              id="new-client-name"
              value={newClientForm.full_name}
              onChange={(e) => setNewClientForm({ ...newClientForm, full_name: e.target.value })}
              required
              placeholder="e.g. Budi Pratama"
            />
          </Field>
          <Field label="Company" htmlFor="new-client-company">
            <TextInput
              id="new-client-company"
              value={newClientForm.company}
              onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
              placeholder="e.g. PT Media Utama"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email" htmlFor="new-client-email">
              <TextInput
                id="new-client-email"
                type="email"
                value={newClientForm.email}
                onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                placeholder="budi@example.com"
              />
            </Field>
            <Field label="Phone" htmlFor="new-client-phone">
              <TextInput
                id="new-client-phone"
                type="tel"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="new-client-address">
            <TextArea
              id="new-client-address"
              className="min-h-16"
              value={newClientForm.address}
              onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
              placeholder="Client billing address..."
            />
          </Field>

          <div className="mt-2 flex flex-wrap justify-end gap-2.5">
            <button type="button" className="btn btn-ghost" onClick={() => setShowNewClientModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingClient}>
              {creatingClient ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save &amp; Select Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
