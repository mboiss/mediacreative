"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Printer, Download, Loader2, CheckCircle } from "lucide-react";
import { InvoiceSheet } from "@/components/invoice/invoice-sheet";

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
  clients?: Client;
};

export default function PublicInvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadInvoice = useCallback(async () => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) {
        setErrorMessage("Invoice not found or no longer available.");
        setInvoice(null);
        return;
      }
      const json = await res.json();
      setInvoice(json.invoice);
      setItems(json.items ?? []);
    } catch (err) {
      console.error("Error loading invoice:", err);
      setErrorMessage("Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    setDownloadingPdf(true);

    try {
      const element = document.querySelector(".printable-invoice") as HTMLElement;
      if (!element) {
        alert("Invoice element not found.");
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
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  }

  const subtotal = items.reduce((s, item) => s + (item.total ?? (item.quantity * item.unit_price)), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, color: "#8ba3c7", background: "#060d1a" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#00d4ff" }} />
        <span style={{ fontSize: "0.95rem" }}>Loading Invoice...</span>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#060d1a", color: "#f0f6ff", padding: 20 }}>
        <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 20, padding: 40, textAlign: "center", maxWidth: 450 }}>
          <p style={{ color: "#ef4444", fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>
            {errorMessage || "Invoice Not Found"}
          </p>
          <p style={{ color: "#8ba3c7", fontSize: "0.85rem" }}>
            The requested invoice link could not be loaded or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", padding: "24px 16px" }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* PUBLIC HEADER BAR */}
      <div
        className="no-print"
        style={{
          maxWidth: 794,
          margin: "0 auto 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          padding: "12px 20px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.png" alt="Media Creative" width={110} height={36} style={{ objectFit: "contain", height: "auto" }} priority />
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f0f6ff" }}>
              Invoice {invoice.invoice_number}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#8ba3c7" }}>
              Official Media Creative Invoice
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f0f6ff",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Print
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 212, 255, 0.25)",
            }}
          >
            {downloadingPdf ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
            {downloadingPdf ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* INVOICE SHEET CONTAINER */}
      <div style={{ maxWidth: 794, margin: "0 auto" }}>
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
    </div>
  );
}
