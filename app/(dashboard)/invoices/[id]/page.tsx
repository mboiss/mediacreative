"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Send,
  FileText,
  User,
  Calendar,
  Building,
  Mail,
  Phone,
  Package,
  Loader2,
  Save,
  Edit2,
  X,
  Printer,
  Share2,
  MessageSquare,
  Copy,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceSheet } from "@/components/invoice/invoice-sheet";
import { getPaymentAccounts, formatAccountTransferText } from "@/lib/payment-accounts";

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
};

type InvoiceItem = {
  id: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date?: string;
  total_amount?: number;
  notes?: string;
  client_id?: string;
  clients?: Client;
};

const STATUS_FLOW = ["Draft", "Sent", "Paid"];

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
  if (amount === undefined || amount === null) return "Rp 0";
  return "Rp " + Number(amount).toLocaleString("id-ID");
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Header modal
  const [showEditHeader, setShowEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    client_id: "",
    due_date: "",
    notes: "",
  });

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    product_id: "",
    description: "",
    quantity: "1",
    unit_price: "",
  });

  // Deletions
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Share & Communication State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const getPublicInvoiceUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/invoices/${id}`;
    }
    return `https://mediacreative.vercel.app/invoices/${id}`;
  }, [id]);

  function formatWhatsAppPhone(phoneStr?: string) {
    if (!phoneStr) return "";
    let cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    }
    return cleaned;
  }

  function handleSendWhatsApp(overridePhone?: string) {
    if (!invoice) return;
    const phone = overridePhone || formatWhatsAppPhone(invoice.clients?.phone || manualPhone);
    const clientName = invoice.clients?.full_name || "Pelanggan";
    const formattedAmount = formatCurrency(invoice.total_amount ?? subtotal);
    const formattedDueDate = formatDate(invoice.due_date);
    const invoiceUrl = getPublicInvoiceUrl();

    const text = `Halo *${clientName}*,\n\nBerikut rincian invoice Anda dari *Media Creative*:\n📄 *No. Invoice:* ${invoice.invoice_number}\n💰 *Total:* ${formattedAmount}\n📅 *Jatuh Tempo:* ${formattedDueDate}\n\n🔗 *Lihat & Download Invoice:* \n${invoiceUrl}\n\n*Instruksi Pembayaran:*\nBank BCA Acc No. 0402434901 A/n : Mulyadi\n\nTerima kasih atas kerja samanya! 🙏`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, "_blank");
  }

  function handleSendEmail(overrideEmail?: string) {
    if (!invoice) return;
    const email = overrideEmail || invoice.clients?.email || manualEmail || "";
    const clientName = invoice.clients?.full_name || "Pelanggan";
    const formattedAmount = formatCurrency(invoice.total_amount ?? subtotal);
    const formattedDueDate = formatDate(invoice.due_date);
    const invoiceUrl = getPublicInvoiceUrl();

    const subject = `Invoice ${invoice.invoice_number} - Media Creative`;
    const body = `Halo ${clientName},\n\nBerikut kami kirimkan rincian invoice untuk Anda dari Media Creative:\n\n- No. Invoice : ${invoice.invoice_number}\n- Total       : ${formattedAmount}\n- Due Date    : ${formattedDueDate}\n\nAnda dapat melihat dan mengunduh invoice online melalui tautan berikut:\n${invoiceUrl}\n\nInstruksi Pembayaran:\nBank BCA Acc No. 0402434901 A/n : Mulyadi\n\nTerima kasih atas kerja samanya.\n\nHormat kami,\nMedia Creative Control Center`;

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }

  function copyInvoiceLink() {
    const url = getPublicInvoiceUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const loadInvoice = useCallback(async () => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.error || "Invoice not found or failed to load");
        setInvoice(null);
        return;
      }
      const json = await res.json();
      setInvoice(json.invoice);
      setItems(json.items ?? []);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      setErrorMessage("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadInvoice();
    loadProducts();
    loadClients();
  }, [loadInvoice, loadProducts, loadClients]);

  function openHeaderEditModal() {
    if (!invoice) return;
    setHeaderForm({
      client_id: invoice.client_id || invoice.clients?.id || "",
      due_date: invoice.due_date ? invoice.due_date.split("T")[0] : "",
      notes: invoice.notes || "",
    });
    setShowEditHeader(true);
  }

  async function saveHeaderEdit(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: headerForm.client_id || undefined,
          due_date: headerForm.due_date || undefined,
          notes: headerForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowEditHeader(false);
        await loadInvoice();
      } else {
        const err = await res.json();
        alert("Failed to update: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update invoice.");
    } finally {
      setUpdating(false);
    }
  }

  // When product is selected, auto-fill unit_price
  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    setItemForm((f) => ({
      ...f,
      product_id: productId,
      description: product ? product.product_name : f.description,
      unit_price: product ? String(product.price) : f.unit_price,
    }));
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.quantity || !itemForm.unit_price) {
      alert("Please fill in quantity and unit price.");
      return;
    }
    setAddingItem(true);
    try {
      const res = await fetch("/api/invoice-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: id,
          product_id: itemForm.product_id || null,
          description: itemForm.description || null,
          quantity: Number(itemForm.quantity),
          unit_price: Number(itemForm.unit_price),
        }),
      });
      if (res.ok) {
        await loadInvoice();
        setItemForm({ product_id: "", description: "", quantity: "1", unit_price: "" });
        setShowAddItem(false);
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to add item"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add item.");
    } finally {
      setAddingItem(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Remove this line item?")) return;
    setDeletingItemId(itemId);
    try {
      const res = await fetch("/api/invoice-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, invoice_id: id }),
      });
      if (res.ok) {
        await loadInvoice();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingItemId(null);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!invoice) return;
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadInvoice();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteInvoice() {
    if (!confirm("Are you sure you want to delete this entire invoice? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/invoices");
      } else {
        const err = await res.json();
        alert("Failed to delete: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting invoice.");
    } finally {
      setDeleting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const subtotal = items.reduce((s, item) => s + (item.total ?? 0), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, color: "#8ba3c7" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading invoice...
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <p style={{ color: "#8ba3c7", fontSize: "1.1rem", marginBottom: 8 }}>
          {errorMessage || "Invoice not found."}
        </p>
        <p style={{ color: "#4a6080", fontSize: "0.85rem", marginBottom: 20 }}>
          The requested invoice ID could not be loaded or may have been removed.
        </p>
        <Link href="/invoices">
          <button className="btn btn-primary">
            <ArrowLeft size={14} /> Back to Invoices
          </button>
        </Link>
      </div>
    );
  }

  const isEditable = invoice.status === "Draft";
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(invoice.status) + 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* BACK BUTTON */}
      <div className="animate-fade-in">
        <Link href="/invoices">
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "0.8rem" }}>
            <ArrowLeft size={13} />
            All Invoices
          </button>
        </Link>
      </div>

      {/* HEADER */}
      <div
        className="animate-fade-in-up"
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "28px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {invoice.invoice_number}
              </span>
              <span className={getStatusClass(invoice.status)}>
                {invoice.status}
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                <Calendar size={13} />
                <span>Issued: {formatDate(invoice.invoice_date)}</span>
              </div>
              {invoice.due_date && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  <Calendar size={13} />
                  <span>Due: {formatDate(invoice.due_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions & Toolbar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {isEditable && (
              <button
                className="btn btn-ghost"
                onClick={openHeaderEditModal}
                style={{ fontSize: "0.85rem", gap: 6 }}
                title="Edit Client, Due Date, or Notes"
              >
                <Edit2 size={14} />
                Edit Details
              </button>
            )}

            <button
              className="btn btn-ghost"
              onClick={handlePrint}
              style={{ fontSize: "0.85rem", gap: 6 }}
              title="Print or Save as PDF"
            >
              <Printer size={14} />
              Print
            </button>

            {/* WhatsApp Direct Share */}
            <button
              className="btn"
              onClick={() => {
                if (invoice.clients?.phone) {
                  handleSendWhatsApp();
                } else {
                  setManualPhone("");
                  setShowShareModal(true);
                }
              }}
              style={{
                fontSize: "0.85rem",
                gap: 6,
                background: "#25D366",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
              }}
              title="Kirim Invoice via WhatsApp"
            >
              <MessageSquare size={14} />
              WhatsApp
            </button>

            {/* Email Direct Share */}
            <button
              className="btn"
              onClick={() => {
                if (invoice.clients?.email) {
                  handleSendEmail();
                } else {
                  setManualEmail("");
                  setShowShareModal(true);
                }
              }}
              style={{
                fontSize: "0.85rem",
                gap: 6,
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
              }}
              title="Kirim Invoice via Email"
            >
              <Mail size={14} />
              Email
            </button>

            {/* Share / Copy Link Modal Button */}
            <button
              className="btn btn-ghost"
              onClick={() => setShowShareModal(true)}
              style={{ fontSize: "0.85rem", gap: 6 }}
              title="Opsi Berbagi & Copy Link"
            >
              <Share2 size={14} />
              Share
            </button>

            {invoice.status !== "Cancelled" && nextStatus && (
              <button
                className={nextStatus === "Paid" ? "btn btn-success" : "btn btn-ghost"}
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                style={{ fontSize: "0.85rem" }}
              >
                {updating ? (
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                ) : nextStatus === "Paid" ? (
                  <Check size={14} />
                ) : (
                  <Send size={14} />
                )}
                Mark as {nextStatus}
              </button>
            )}
            {invoice.status !== "Cancelled" && invoice.status !== "Paid" && (
              <button
                className="btn btn-ghost"
                onClick={() => updateStatus("Cancelled")}
                disabled={updating}
                style={{ fontSize: "0.85rem", color: "#f87171" }}
              >
                <X size={14} />
                Cancel
              </button>
            )}
            <button
              className="btn btn-danger"
              onClick={deleteInvoice}
              disabled={deleting}
              style={{ fontSize: "0.85rem", padding: "8px 12px" }}
              title="Delete Invoice"
            >
              {deleting ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Total */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Grand Total</span>
          <span
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--accent-cyan)",
            }}
          >
            {formatCurrency(invoice.total_amount ?? subtotal)}
          </span>
        </div>
      </div>

      {/* OFFICIAL PRINTABLE INVOICE SHEET */}
      <div className="animate-fade-in-up">
        <InvoiceSheet
          invoiceNumber={invoice.invoice_number}
          invoiceDate={invoice.invoice_date}
          dueDate={invoice.due_date}
          client={invoice.clients}
          items={items}
          notes={invoice.notes}
          subtotal={subtotal}
          totalAmount={invoice.total_amount ?? subtotal}
          status={invoice.status}
        />
      </div>

      {/* LINE ITEM MANAGEMENT TOOLBAR (Only shown for Draft or Editable invoices) */}
      {isEditable && (
        <div
          className="no-print"
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
              Manage Invoice Items ({items.length})
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddItem((v) => !v)}
              style={{ padding: "7px 14px", fontSize: "0.8rem" }}
            >
              {showAddItem ? <X size={13} /> : <Plus size={13} />}
              {showAddItem ? "Cancel" : "Add Line Item"}
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <form
              onSubmit={addItem}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--accent-cyan-dim)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Product Catalog (optional)</label>
                  <select
                    className="form-input form-select"
                    value={itemForm.product_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                  >
                    <option value="">— Custom item —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} — Rp {p.price.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Description *</label>
                  <input
                    className="form-input"
                    placeholder="Item description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    step="0.01"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Unit Price (Rp) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={itemForm.unit_price}
                    onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
                    required
                  />
                </div>
              </div>

              {itemForm.quantity && itemForm.unit_price && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "8px 12px", background: "var(--bg-glass)", borderRadius: 8 }}>
                  Subtotal: <strong style={{ color: "var(--accent-cyan)" }}>
                    {formatCurrency(Number(itemForm.quantity) * Number(itemForm.unit_price))}
                  </strong>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddItem(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingItem}>
                  {addingItem ? (
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Plus size={13} />
                  )}
                  Add Line
                </button>
              </div>
            </form>
          )}

          {/* Quick list of items to delete if needed */}
          {items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--bg-glass-hover)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.description || item.products?.product_name || "—"}
                    </span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                      ({item.quantity} x {formatCurrency(item.unit_price)})
                    </span>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingItemId === item.id}
                  >
                    {deletingItemId === item.id ? (
                      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT INVOICE HEADER MODAL */}
      <Modal isOpen={showEditHeader} onClose={() => setShowEditHeader(false)} title="Edit Invoice Details">
        <form onSubmit={saveHeaderEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="form-label">Client</label>
            <select
              className="form-input form-select"
              value={headerForm.client_id}
              onChange={(e) => setHeaderForm({ ...headerForm, client_id: e.target.value })}
            >
              <option value="">— Select Client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.company ? `(${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={headerForm.due_date}
              onChange={(e) => setHeaderForm({ ...headerForm, due_date: e.target.value })}
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Payment Instructions & Notes</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {getPaymentAccounts().map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setHeaderForm({ ...headerForm, notes: formatAccountTransferText(acc) })}
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "2px 6px",
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
              </div>
            </div>
            <textarea
              className="form-input"
              style={{ minHeight: 80, resize: "vertical" }}
              value={headerForm.notes}
              onChange={(e) => setHeaderForm({ ...headerForm, notes: e.target.value })}
              placeholder="e.g. Bank BCA 0402434901 a/n Mulyadi..."
            />
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowEditHeader(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={updating}>
              {updating ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Save size={14} />
              )}
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* SHARE / SEND INVOICE MODAL */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share Invoice via WhatsApp / Email">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Public Link Card */}
          <div style={{ background: "var(--bg-glass-hover)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
            <label className="form-label" style={{ marginBottom: 6 }}>Direct Invoice Online Link</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                readOnly
                value={getPublicInvoiceUrl()}
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              />
              <button
                className="btn btn-primary"
                onClick={copyInvoiceLink}
                style={{ padding: "8px 14px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Quick WhatsApp Action */}
          <div style={{ background: "rgba(37, 211, 102, 0.08)", border: "1px solid rgba(37, 211, 102, 0.2)", borderRadius: 12, padding: "14px 16px" }}>
            <label className="form-label" style={{ color: "#25D366", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={14} /> Kirim via WhatsApp
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                placeholder="Nomor WhatsApp (misal: 08123456789)..."
                defaultValue={invoice?.clients?.phone || ""}
                onChange={(e) => setManualPhone(e.target.value)}
                style={{ fontSize: "0.85rem" }}
              />
              <button
                className="btn"
                onClick={() => handleSendWhatsApp(manualPhone ? formatWhatsAppPhone(manualPhone) : undefined)}
                style={{ background: "#25D366", color: "#fff", border: "none", fontWeight: 700, padding: "8px 16px", whiteSpace: "nowrap" }}
              >
                Kirim WA
              </button>
            </div>
          </div>

          {/* Quick Email Action */}
          <div style={{ background: "rgba(2, 132, 199, 0.08)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 12, padding: "14px 16px" }}>
            <label className="form-label" style={{ color: "#0284c7", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={14} /> Kirim via Email
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                type="email"
                placeholder="Email tujuan..."
                defaultValue={invoice?.clients?.email || ""}
                onChange={(e) => setManualEmail(e.target.value)}
                style={{ fontSize: "0.85rem" }}
              />
              <button
                className="btn"
                onClick={() => handleSendEmail(manualEmail || undefined)}
                style={{ background: "#0284c7", color: "#fff", border: "none", fontWeight: 700, padding: "8px 16px", whiteSpace: "nowrap" }}
              >
                Kirim Email
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}