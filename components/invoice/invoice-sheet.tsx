"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatRupiah } from "@/lib/format";
import { parsePaymentNotes } from "@/lib/invoice-messages";

export type InvoiceCompany = {
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
};

export interface InvoiceSheetProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  client?: {
    full_name?: string;
    company?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total?: number;
  }>;
  /** Payment instructions (bank, account number, account name) chosen when the invoice was created. */
  notes?: string;
  subtotal: number;
  totalAmount?: number;
  status?: string;
  /** Sender details from Settings; falls back to Media Creative defaults. */
  company?: InvoiceCompany | null;
  /**
   * Narrow layout for small containers (e.g. the live preview beside the invoice form):
   * tighter padding, smaller type and stacked sections, so nothing is clipped.
   */
  compact?: boolean;
}

/**
 * Paper palette. The invoice is a printed document, so it stays white paper with dark ink in every
 * app theme, in print and in the html2pdf export. These are the ONLY hardcoded colours allowed outside
 * the design tokens (see DESIGN.md). They are plain hex values on purpose: html2canvas (used by html2pdf)
 * cannot parse the oklch()/color-mix() colours that Tailwind palette utilities and opacity modifiers emit,
 * and theme tokens would turn the paper dark in dark mode.
 */
const PAPER = {
  sheet: "bg-[#ffffff] text-[#0f172a] border-[#e2e8f0]",
  ink: "text-[#0f172a]",
  inkSoft: "text-[#334155]",
  muted: "text-[#64748b]",
  brand: "text-[#0369a1]",
  brandBar: "bg-[#0369a1]",
  tint: "bg-[#f8fafc]",
  head: "bg-[#f1f5f9] text-[#475569]",
  rule: "border-[#e2e8f0]",
  ruleStrong: "border-[#cbd5e1]",
  shadow: "shadow-[0_12px_40px_rgba(0,0,0,0.10)]",
} as const;

const STAMPS: Record<string, string> = {
  Paid: "border-[#047857] text-[#047857]",
  Overdue: "border-[#b91c1c] text-[#b91c1c]",
  Cancelled: "border-[#64748b] text-[#64748b]",
  Draft: "border-[#64748b] text-[#64748b]",
};

const DEFAULT_COMPANY: InvoiceCompany = {
  company_name: "Media Creative",
  address: "Denpasar, Bali",
};

/** Small uppercase section label. */
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]", PAPER.muted, className)}>{children}</div>
  );
}

function isPastDue(dueDate?: string) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function InvoiceSheet({
  invoiceNumber,
  invoiceDate,
  dueDate,
  client,
  items,
  notes,
  totalAmount,
  status,
  company,
  compact = false,
}: InvoiceSheetProps) {
  const sender = { ...DEFAULT_COMPANY, ...Object.fromEntries(Object.entries(company ?? {}).filter(([, v]) => v)) };

  const subtotal = items.reduce((sum, item) => sum + (item.total ?? item.quantity * item.unit_price), 0);
  const finalTotal = totalAmount ?? subtotal;
  const adjustment = finalTotal - subtotal;

  const isPaid = status === "Paid";
  // Stamp: explicit status, or OVERDUE when an unpaid invoice is past its due date.
  const stamp =
    status === "Paid" || status === "Cancelled" || status === "Draft" || status === "Overdue"
      ? status
      : status !== "Paid" && isPastDue(dueDate)
        ? "Overdue"
        : null;

  const payment = parsePaymentNotes(notes);
  const cell = compact ? "px-2 py-2" : "px-2 py-2.5 sm:px-3.5 sm:py-3";
  const contactLine = [sender.phone, sender.email].filter(Boolean).join("  ·  ");

  return (
    <div
      className={cn(
        "printable-invoice relative mx-auto box-border flex w-full max-w-[794px] flex-col overflow-hidden rounded-xl border font-sans leading-normal",
        PAPER.sheet,
        PAPER.shadow,
        !compact && "sm:min-h-[1050px]"
      )}
    >
      {/* Brand bar */}
      <div className={cn("h-1.5 w-full shrink-0", PAPER.brandBar)} aria-hidden />

      <div className={cn("flex flex-1 flex-col", compact ? "gap-5 p-5" : "gap-7 p-5 sm:p-10 md:px-12 md:py-10")}>
        {/* 1. HEADER: sender + invoice title */}
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          {/* Logo and company name centred on each other as one brand block */}
          <div className="inline-flex min-w-0 flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so html2canvas captures it */}
            <img
              src="/logo.png"
              alt={sender.company_name ?? "Media Creative"}
              className={cn("mb-2 block h-auto object-contain", compact ? "w-[100px]" : "w-[110px] sm:w-[130px]")}
            />
            <div className={cn("font-bold", PAPER.ink, compact ? "text-xs" : "text-sm")}>{sender.company_name}</div>
          </div>

          <div className="ml-auto text-right">
            <div
              className={cn(
                "font-extrabold leading-none tracking-[0.12em]",
                PAPER.ink,
                compact ? "text-2xl" : "text-3xl sm:text-[2.25rem]"
              )}
            >
              INVOICE
            </div>
            <dl
              className={cn(
                "ml-auto mt-4 grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-left",
                compact ? "text-xs" : "text-xs sm:text-sm"
              )}
            >
              {[
                ["Invoice No.", <span key="n" className="font-mono">{invoiceNumber}</span>],
                ["Issue Date", formatDate(invoiceDate)],
                ["Due Date", dueDate ? formatDate(dueDate) : "On receipt"],
              ].map(([label, value]) => (
                <React.Fragment key={String(label)}>
                  <dt className={PAPER.muted}>{label}</dt>
                  <dd className={cn("text-right font-semibold", PAPER.ink)}>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
            {stamp && (
              <div
                className={cn(
                  "mt-3 inline-block -rotate-3 rounded-md border-2 px-3 py-1 font-extrabold uppercase tracking-[0.18em]",
                  STAMPS[stamp],
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {stamp}
              </div>
            )}
          </div>
        </div>

        {/* 2. BILL TO */}
        <div className={cn("border-t pt-5", PAPER.rule)}>
          <Label>Bill To</Label>
          {client ? (
            <div className={cn("leading-snug", compact ? "text-xs" : "text-sm")}>
              <div className={cn("font-bold", PAPER.ink)}>{client.company || client.full_name || "—"}</div>
              {client.company && client.full_name && <div className={PAPER.inkSoft}>Attn. {client.full_name}</div>}
              {client.address && <div className={cn("mt-1 whitespace-pre-line", PAPER.muted)}>{client.address}</div>}
              {(client.phone || client.email) && (
                <div className={cn("mt-0.5", PAPER.muted)}>{[client.phone, client.email].filter(Boolean).join("  ·  ")}</div>
              )}
            </div>
          ) : (
            <div className={cn("text-xs italic", PAPER.muted)}>No client selected.</div>
          )}
        </div>

        {/* 3. LINE ITEMS — auto layout so the amount column is never clipped */}
        <div className={cn("overflow-x-auto rounded-lg border", PAPER.rule)}>
          <table className={cn("w-full min-w-[420px] border-collapse", compact ? "text-xs" : "text-xs sm:text-sm")}>
            <thead>
              <tr className={cn("text-left text-[11px] font-bold uppercase tracking-[0.06em]", PAPER.head)}>
                <th className={cn(cell, "w-8 text-center")}>#</th>
                <th className={cell}>Description</th>
                <th className={cn(cell, "text-center")}>Qty</th>
                <th className={cn(cell, "text-right")}>Unit Price</th>
                <th className={cn(cell, "text-right")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn("p-6 text-center", PAPER.muted)}>
                    No line items yet.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const itemTotal = item.total ?? item.quantity * item.unit_price;
                  return (
                    <tr key={item.id || idx} className={cn("border-t align-top", PAPER.rule)}>
                      <td className={cn(cell, "text-center tabular-nums", PAPER.muted)}>{idx + 1}</td>
                      <td className={cn(cell, "break-words font-medium", PAPER.ink)}>{item.description || "—"}</td>
                      <td className={cn(cell, "text-center tabular-nums", PAPER.inkSoft)}>{item.quantity}</td>
                      <td className={cn(cell, "whitespace-nowrap text-right tabular-nums", PAPER.inkSoft)}>
                        {formatRupiah(item.unit_price)}
                      </td>
                      <td className={cn(cell, "whitespace-nowrap text-right font-semibold tabular-nums", PAPER.ink)}>
                        {formatRupiah(itemTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAYMENT + SIGNATURE (left) · TOTALS (right) */}
        <div className={cn("grid items-start gap-x-10 gap-y-6", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[1fr_300px]")}>
          <div className={cn("flex flex-col gap-5", compact ? "order-last" : "order-last sm:order-first")}>
            <div className={cn("rounded-lg border px-4 py-3", PAPER.rule, PAPER.tint)}>
              <Label>{isPaid ? "Payment Received" : "Payment Details"}</Label>
              {isPaid ? (
                <div className={cn("text-xs leading-relaxed", PAPER.inkSoft)}>
                  This invoice has been paid in full. Thank you.
                </div>
              ) : (
                <>
                  {payment || !notes?.trim() ? (
                    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs", PAPER.ink)}>
                      {[
                        ["Bank", payment?.bank ?? "BCA"],
                        ["Account No.", payment?.accountNumber ?? "0402434901"],
                        ["Account Name", payment?.accountName || "Mulyadi"],
                      ].map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className={PAPER.muted}>{k}</dt>
                          <dd className={cn("font-semibold", k === "Account No." && "font-mono")}>{v}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  ) : (
                    <div className={cn("whitespace-pre-line text-xs font-medium leading-relaxed", PAPER.ink)}>{notes}</div>
                  )}
                  <div className={cn("mt-2 text-[11px] leading-snug", PAPER.muted)}>
                    Please include <span className="font-mono font-semibold">{invoiceNumber}</span> as the transfer
                    reference.
                  </div>
                </>
              )}
            </div>

            <div className="flex w-[150px] flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so html2canvas captures it */}
              <img src="/signature.png" alt="Authorized signature" className="mb-1 block h-auto max-h-[55px] w-[100px]" />
              <div className={cn("w-full border-t pt-1 text-center text-xs font-bold", PAPER.ruleStrong, PAPER.ink)}>Mulyadi</div>
              <div className={cn("text-center text-[11px]", PAPER.muted)}>{sender.company_name}</div>
            </div>
          </div>

          <div className="w-full">
            <div className={cn("flex justify-between py-1.5 text-sm", PAPER.inkSoft)}>
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(subtotal)}</span>
            </div>
            {adjustment !== 0 && (
              <div className={cn("flex justify-between py-1.5 text-sm", PAPER.inkSoft)}>
                <span>{adjustment > 0 ? "Tax & charges" : "Discount"}</span>
                <span className="tabular-nums">
                  {adjustment > 0 ? "" : "− "}
                  {formatRupiah(Math.abs(adjustment))}
                </span>
              </div>
            )}
            <div className={cn("mt-1 flex items-baseline justify-between border-t-2 pt-2.5", PAPER.ruleStrong)}>
              <span className={cn("text-sm font-bold uppercase tracking-[0.06em]", PAPER.ink)}>
                {isPaid ? "Total Paid" : "Total Due"}
              </span>
              <span className={cn("font-extrabold tabular-nums", PAPER.brand, compact ? "text-base" : "text-xl")}>
                {formatRupiah(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 7. FOOTER */}
        <div className={cn("mt-auto border-t pt-4 text-center", PAPER.rule)}>
          <div className={cn("text-xs font-semibold", PAPER.inkSoft)}>Thank you for your business.</div>
          {contactLine && (
            <div className={cn("mt-0.5 text-[11px]", PAPER.muted)}>
              Questions about this invoice? Contact us at {contactLine}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
