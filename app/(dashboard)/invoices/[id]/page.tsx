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
  Mail,
  Package,
  Loader2,
  Save,
  Edit2,
  X,
  Printer,
  Share2,
  MessageSquare,
  Copy,
  Download,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceSheet, type InvoiceCompany } from "@/components/invoice/invoice-sheet";
import { buildEmail, buildEmailHtml, buildWhatsAppMessage } from "@/lib/invoice-messages";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { getPaymentAccounts, formatAccountTransferText } from "@/lib/payment-accounts";
import { formatDate, formatRupiah } from "@/lib/format";
import { RowActions } from "@/components/ui/row-actions";

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
  legacy_number?: string | null;
  status: string;
  invoice_date: string;
  due_date?: string;
  total_amount?: number;
  notes?: string;
  client_id?: string;
  clients?: Client;
};

const STATUS_FLOW = ["Draft", "Sent", "Paid"];

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [company, setCompany] = useState<InvoiceCompany | null>(null);
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
      return `${window.location.origin}/view-invoice/${id}`;
    }
    return `https://mediacreative.vercel.app/view-invoice/${id}`;
  }, [id]);

  function formatWhatsAppPhone(phoneStr?: string) {
    if (!phoneStr) return "";
    let cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    }
    return cleaned;
  }

  function messageInput() {
    return {
      invoiceNumber: invoice!.invoice_number,
      status: invoice!.status,
      invoiceDate: invoice!.invoice_date,
      dueDate: invoice!.due_date,
      amount: invoice!.total_amount ?? subtotal,
      clientName: invoice!.clients?.full_name,
      notes: invoice!.notes,
      invoiceUrl: getPublicInvoiceUrl(),
      items,
      company,
    };
  }

  function handleSendWhatsApp(overridePhone?: string) {
    if (!invoice) return;
    const phone = overridePhone || formatWhatsAppPhone(invoice.clients?.phone || manualPhone);
    const text = buildWhatsAppMessage(messageInput());

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, "_blank");
  }

  /**
   * mailto: can only carry plain text, so the formatted (table) email is copied to the clipboard as HTML
   * and the mail app opens with recipient + subject; the user pastes the body with Ctrl+V.
   * Falls back to the plain-text body when rich clipboard isn't available.
   */
  async function handleSendEmail(overrideEmail?: string) {
    if (!invoice) return;
    const email = overrideEmail || invoice.clients?.email || manualEmail || "";
    const input = messageInput();
    const plain = buildEmail(input);
    const { subject, html } = buildEmailHtml(input);

    let copied = false;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain.body], { type: "text/plain" }),
          }),
        ]);
        copied = true;
      }
    } catch (err) {
      console.error("Rich clipboard copy failed:", err);
    }

    if (copied) {
      toast.success("Formatted email copied", "Your mail app is opening — paste into the message body with Ctrl+V (⌘V on Mac).");
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    } else {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(plain.subject)}&body=${encodeURIComponent(plain.body)}`;
    }
  }

  function copyInvoiceLink() {
    const url = getPublicInvoiceUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!invoice) return;
    setDownloadingPdf(true);

    try {
      const element = document.querySelector(".printable-invoice") as HTMLElement;
      if (!element) {
        toast.error("Invoice element not found.");
        setDownloadingPdf(false);
        return;
      }

      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF engine"));
          document.body.appendChild(script);
        });
      }

      const opt = {
        margin: [4, 4, 4, 4],
        filename: `Invoice_${invoice.invoice_number}.pdf`,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await (window as any).html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.warning("PDF download failed", "Opening the print dialog instead.");
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
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
      setCompany(json.company ?? null);
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Failed to load products", data?.error);
        return;
      }
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Failed to load clients", data?.error);
        return;
      }
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load clients");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.success("Invoice updated");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to update invoice", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update invoice", "Please try again.");
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
      toast.warning("Please fill in quantity and unit price.");
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
        toast.success("Line item added");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to add item", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add item", "Please try again.");
    } finally {
      setAddingItem(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (
      !(await confirm({
        title: "Remove line item?",
        message: "This line item will be removed from the invoice.",
        confirmLabel: "Remove",
        tone: "danger",
      }))
    )
      return;
    setDeletingItemId(itemId);
    try {
      const res = await fetch("/api/invoice-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, invoice_id: id }),
      });
      if (res.ok) {
        await loadInvoice();
        toast.success("Line item removed");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to remove item", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove item", "Please try again.");
    } finally {
      setDeletingItemId(null);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!invoice) return;
    if (
      !(await confirm({
        title: "Change status?",
        message: `Change this invoice's status to "${newStatus}"?`,
        confirmLabel: "Change status",
      }))
    )
      return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadInvoice();
        toast.success(`Status changed to ${newStatus}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to change status", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to change status", "Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  async function deleteInvoice() {
    if (
      !(await confirm({
        title: "Delete invoice?",
        message: "This will permanently delete the entire invoice. This action cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Invoice deleted");
        router.push("/invoices");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to delete invoice", err.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice", "Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const subtotal = items.reduce((s, item) => s + (item.total ?? 0), 0);

  if (loading) {
    return <LoadingState label="Loading invoice..." />;
  }

  if (!invoice) {
    return (
      <Panel>
        <EmptyState
          icon={<FileText size={28} />}
          title={errorMessage || "Invoice not found."}
          description="The requested invoice could not be loaded or may have been removed."
          action={
            <Link href="/invoices" className="btn btn-primary">
              <ArrowLeft size={14} /> Back to Invoices
            </Link>
          }
        />
      </Panel>
    );
  }

  const isEditable = invoice.status === "Draft";
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(invoice.status) + 1];
  const spinner = <Loader2 size={14} className="animate-spin" />;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      {/* BACK LINK */}
      <div className="no-print animate-fade-in">
        <Link href="/invoices" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} />
          All Invoices
        </Link>
      </div>

      {/* HEADER */}
      <PageHeader
        className="no-print"
        title={<span className="break-all font-mono">{invoice.invoice_number}</span>}
        meta={
          <>
            <StatusBadge status={invoice.status} />
            {invoice.legacy_number && (
              <span className="text-xs text-fg-subtle" title="Invoice number before renumbering">
                Formerly <span className="font-mono">{invoice.legacy_number}</span>
              </span>
            )}
          </>
        }
        description={
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} aria-hidden /> Issued {formatDate(invoice.invoice_date)}
            </span>
            {invoice.due_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden /> Due {formatDate(invoice.due_date)}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={handlePrint} title="Print or save as PDF">
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              title="Download the invoice as a PDF file"
            >
              {downloadingPdf ? spinner : <Download size={14} />}
              {downloadingPdf ? "Generating PDF..." : "Download PDF"}
            </button>
          </>
        }
      />

      {/* SUMMARY & ACTIONS */}
      <Panel className="no-print">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Grand Total</div>
              <div className="mt-1 break-words text-2xl font-bold tabular-nums text-fg sm:text-3xl">
                {formatRupiah(invoice.total_amount ?? subtotal)}
              </div>
            </div>
            {invoice.clients && (
              <div className="min-w-0 text-sm text-fg-muted sm:text-right">
                <div className="flex items-center gap-1.5 font-semibold text-fg sm:justify-end">
                  <User size={14} aria-hidden /> {invoice.clients.full_name}
                </div>
                {invoice.clients.company && <div>{invoice.clients.company}</div>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            {/* Send / share */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Send invoice">
              <button
                type="button"
                className="btn btn-success"
                onClick={() => {
                  if (invoice.clients?.phone) {
                    handleSendWhatsApp();
                  } else {
                    setManualPhone("");
                    setShowShareModal(true);
                  }
                }}
                title="Send invoice via WhatsApp"
              >
                <MessageSquare size={14} />
                WhatsApp
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (invoice.clients?.email) {
                    handleSendEmail();
                  } else {
                    setManualEmail("");
                    setShowShareModal(true);
                  }
                }}
                title="Send invoice via email"
              >
                <Mail size={14} />
                Email
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowShareModal(true)}
                title="Share options and copy link"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>

            {/* Status & management */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Manage invoice">
              {invoice.status !== "Cancelled" && nextStatus && (
                <button
                  type="button"
                  className={nextStatus === "Paid" ? "btn btn-success" : "btn btn-ghost"}
                  onClick={() => updateStatus(nextStatus)}
                  disabled={updating}
                >
                  {updating ? spinner : nextStatus === "Paid" ? <Check size={14} /> : <Send size={14} />}
                  Mark as {nextStatus}
                </button>
              )}
              <RowActions
                label="More invoice actions"
                className="size-9 border border-line"
                actions={[
                  {
                    label: "Edit details",
                    icon: <Edit2 />,
                    onSelect: openHeaderEditModal,
                    hidden: !isEditable,
                  },
                  {
                    label: "Cancel invoice",
                    icon: <X />,
                    onSelect: () => updateStatus("Cancelled"),
                    disabled: updating,
                    hidden: invoice.status === "Cancelled" || invoice.status === "Paid",
                    danger: true,
                  },
                  {
                    label: deleting ? "Deleting..." : "Delete invoice",
                    icon: deleting ? <Loader2 className="animate-spin" /> : <Trash2 />,
                    onSelect: deleteInvoice,
                    disabled: deleting,
                    danger: true,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Panel>

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
          company={company}
        />
      </div>

      {/* LINE ITEM MANAGEMENT (Draft only) */}
      {isEditable && (
        <Panel
          className="no-print"
          title={`Manage Invoice Items (${items.length})`}
          icon={<Package size={15} />}
          actions={
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddItem((v) => !v)}>
              {showAddItem ? <X size={13} /> : <Plus size={13} />}
              {showAddItem ? "Cancel" : "Add Line Item"}
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            {showAddItem && (
              <form
                onSubmit={addItem}
                className="flex flex-col gap-3 rounded-xl border border-line bg-inset p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Product catalog (optional)" htmlFor="add-item-product">
                    <SelectInput
                      id="add-item-product"
                      value={itemForm.product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                    >
                      <option value="">— Custom item —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_name} — {formatRupiah(p.price)}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Description" htmlFor="add-item-description" required>
                    <TextInput
                      id="add-item-description"
                      placeholder="Item description"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Quantity" htmlFor="add-item-qty" required>
                    <TextInput
                      id="add-item-qty"
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.01"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Unit price (Rp)" htmlFor="add-item-price" required>
                    <TextInput
                      id="add-item-price"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={itemForm.unit_price}
                      onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
                      required
                    />
                  </Field>
                </div>

                {itemForm.quantity && itemForm.unit_price && (
                  <div className="rounded-lg bg-surface px-3 py-2 text-sm text-fg-muted">
                    Subtotal:{" "}
                    <strong className="tabular-nums text-fg">
                      {formatRupiah(Number(itemForm.quantity) * Number(itemForm.unit_price))}
                    </strong>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={addingItem}>
                    {addingItem ? spinner : <Plus size={14} />}
                    Add Line
                  </button>
                </div>
              </form>
            )}

            {items.length > 0 && (
              <ul className="flex flex-col gap-2">
                {items.map((item, idx) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="break-words font-semibold text-fg">
                        {item.description || item.products?.product_name || "—"}
                      </div>
                      <div className="text-xs text-fg-subtle tabular-nums">
                        {item.quantity} × {formatRupiah(item.unit_price)} = {formatRupiah(item.total)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon shrink-0 hover:text-danger"
                      onClick={() => deleteItem(item.id)}
                      disabled={deletingItemId === item.id}
                      aria-label={`Remove line item ${idx + 1}`}
                      title="Remove line item"
                    >
                      {deletingItemId === item.id ? spinner : <Trash2 size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}

      {/* EDIT INVOICE DETAILS MODAL */}
      <Modal isOpen={showEditHeader} onClose={() => setShowEditHeader(false)} title="Edit Invoice Details">
        <form onSubmit={saveHeaderEdit} className="flex flex-col gap-4">
          <Field label="Client" htmlFor="edit-client">
            <SelectInput
              id="edit-client"
              value={headerForm.client_id}
              onChange={(e) => setHeaderForm({ ...headerForm, client_id: e.target.value })}
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.company ? `(${c.company})` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Due date" htmlFor="edit-due-date">
            <TextInput
              id="edit-due-date"
              type="date"
              value={headerForm.due_date}
              onChange={(e) => setHeaderForm({ ...headerForm, due_date: e.target.value })}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-notes" className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Payment instructions &amp; notes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {getPaymentAccounts().map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setHeaderForm({ ...headerForm, notes: formatAccountTransferText(acc) })}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-fg-muted transition-colors hover:border-line-accent hover:text-fg"
                  title={`Use ${acc.bank_name}`}
                >
                  <Plus size={12} /> {acc.bank_name} ({acc.account_number})
                </button>
              ))}
            </div>
            <TextArea
              id="edit-notes"
              value={headerForm.notes}
              onChange={(e) => setHeaderForm({ ...headerForm, notes: e.target.value })}
              placeholder="e.g. Bank BCA 0402434901 a/n Mulyadi..."
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setShowEditHeader(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={updating}>
              {updating ? spinner : <Save size={14} />}
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* SHARE / SEND INVOICE MODAL */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share Invoice">
        <div className="flex flex-col gap-4">
          {/* Public link */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-inset p-4">
            <label htmlFor="share-link" className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Public invoice link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput id="share-link" readOnly value={getPublicInvoiceUrl()} className="text-fg-muted" />
              <button type="button" className="btn btn-primary justify-center" onClick={copyInvoiceLink}>
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-inset p-4">
            <label
              htmlFor="share-phone"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted"
            >
              <MessageSquare size={14} /> Send via WhatsApp
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                id="share-phone"
                type="tel"
                placeholder="WhatsApp number (e.g. 08123456789)"
                defaultValue={invoice?.clients?.phone || ""}
                onChange={(e) => setManualPhone(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-success justify-center"
                onClick={() => handleSendWhatsApp(manualPhone ? formatWhatsAppPhone(manualPhone) : undefined)}
              >
                Send WhatsApp
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-inset p-4">
            <label
              htmlFor="share-email"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted"
            >
              <Mail size={14} /> Send via Email
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                id="share-email"
                type="email"
                placeholder="Recipient email..."
                defaultValue={invoice?.clients?.email || ""}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost justify-center"
                onClick={() => handleSendEmail(manualEmail || undefined)}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
