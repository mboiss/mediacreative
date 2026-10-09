"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Printer, Download, Loader2 } from "lucide-react";
import { InvoiceSheet, type InvoiceCompany } from "@/components/invoice/invoice-sheet";
import { useToast } from "@/components/ui/toast";
import { LoadingState } from "@/components/ui/loading-state";

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
  const toast = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [company, setCompany] = useState<InvoiceCompany | null>(null);
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
      setCompany(json.company ?? null);
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

  const subtotal = items.reduce((s, item) => s + (item.total ?? (item.quantity * item.unit_price)), 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <LoadingState label="Loading invoice..." />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-page p-5 text-fg">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-card sm:p-10">
          <p className="mb-2 text-lg font-bold text-danger">{errorMessage || "Invoice Not Found"}</p>
          <p className="text-sm text-fg-muted">The requested invoice link could not be loaded or may have been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page px-4 py-6 sm:py-10">
      {/* PUBLIC HEADER BAR */}
      <div className="no-print mx-auto mb-5 flex max-w-[794px] flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logo.png" alt="Media Creative" width={110} height={36} className="h-auto w-[96px] object-contain sm:w-[110px]" priority />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-fg">Invoice {invoice.invoice_number}</div>
            <div className="text-xs text-fg-muted">Official Media Creative invoice</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handlePrint} className="btn btn-ghost btn-sm">
            <Printer size={14} /> Print
          </button>

          <button type="button" onClick={handleDownloadPdf} disabled={downloadingPdf} className="btn btn-primary btn-sm">
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloadingPdf ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* INVOICE SHEET */}
      <div className="mx-auto max-w-[794px]">
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
    </div>
  );
}
