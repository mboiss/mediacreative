"use client";

import React from "react";
import { cn } from "@/lib/utils";

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
  notes?: string;
  subtotal: number;
  totalAmount?: number;
  status?: string;
  /**
   * Narrow layout for small containers (e.g. the live preview beside the invoice form):
   * tighter padding, smaller type and stacked totals, so nothing is clipped.
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
  sheet: "bg-[#ffffff] text-[#0f172a] border-[#cbd5e1]",
  ink: "text-[#0f172a]",
  inkSoft: "text-[#334155]",
  muted: "text-[#475569]",
  subtle: "text-[#64748b]",
  brand: "text-[#0284c7]",
  tint: "bg-[#f8fafc]",
  tintStrong: "bg-[#f1f5f9]",
  rowBase: "bg-[#ffffff]",
  rowAlt: "bg-[#f8fafc]",
  rule: "border-[#e2e8f0]",
  ruleStrong: "border-[#cbd5e1]",
  frame: "border-[#334155]",
  head: "bg-[#334155] text-[#ffffff]",
  shadow: "shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
} as const;

/** "Rp" on the left, amount on the right; wraps onto two lines instead of overflowing in narrow columns. */
function Money({ value }: { value: string }) {
  return (
    <span className="flex flex-wrap items-baseline justify-between gap-x-1.5">
      <span className={cn("font-normal", PAPER.subtle)}>Rp</span>
      <span className="ml-auto whitespace-nowrap">{value}</span>
    </span>
  );
}

export function InvoiceSheet({
  invoiceNumber,
  invoiceDate,
  dueDate,
  client,
  items,
  notes,
  totalAmount,
  compact = false,
}: InvoiceSheetProps) {
  function formatCurrency(num?: number) {
    if (num === undefined || num === null) return "0";
    return Number(num).toLocaleString("id-ID");
  }

  function formatDate(dStr?: string) {
    if (!dStr) return "—";
    try {
      return new Date(dStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  }

  const calculatedSubtotal = items.reduce(
    (sum, item) => sum + (item.total ?? (item.quantity * item.unit_price)),
    0
  );
  const finalTotal = totalAmount ?? calculatedSubtotal;

  // `compact` always uses the narrow layout; otherwise the sheet grows with the viewport.
  const cell = compact ? "px-2 py-2" : "px-2 py-2.5 sm:px-4 sm:py-3";

  return (
    <div
      className={cn(
        "printable-invoice mx-auto box-border flex w-full max-w-[794px] flex-col justify-between rounded-2xl border font-sans leading-normal",
        PAPER.sheet,
        PAPER.shadow,
        compact ? "gap-6 p-5" : "gap-8 p-5 sm:min-h-[1050px] sm:p-10 md:px-[54px] md:py-12"
      )}
    >
      <div>
        {/* 1. HEADER: LOGO & INVOICE META */}
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-b-2 pb-5",
            PAPER.rule,
            compact ? "mb-5" : "mb-6 sm:mb-8"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so html2canvas captures it */}
          <img
            src="/logo.png"
            alt="Media Creative Logo"
            className={cn("block h-auto object-contain", compact ? "w-[110px]" : "w-[110px] sm:w-[135px]")}
          />

          <div className="ml-auto text-right">
            <h1
              className={cn(
                "m-0 mb-3 font-black leading-none tracking-[0.04em]",
                PAPER.inkSoft,
                compact ? "text-3xl" : "text-3xl sm:mb-4 sm:text-[2.6rem]"
              )}
            >
              INVOICE
            </h1>

            <table className={cn("ml-auto border-collapse", compact ? "text-xs" : "text-xs sm:text-[0.83rem]")}>
              <tbody>
                <tr>
                  <td className={cn("pb-1 pr-3 text-right font-bold", PAPER.subtle)}>DATE:</td>
                  <td className={cn("pb-1 text-right font-semibold", PAPER.ink)}>{formatDate(invoiceDate)}</td>
                </tr>
                <tr>
                  <td className={cn("pb-1 pr-3 text-right font-bold", PAPER.subtle)}>INVOICE #:</td>
                  <td className={cn("pb-1 text-right font-mono font-extrabold", PAPER.ink)}>{invoiceNumber}</td>
                </tr>
                {dueDate && (
                  <tr>
                    <td className={cn("pr-3 text-right font-bold", PAPER.subtle)}>DUE DATE:</td>
                    <td className={cn("text-right font-bold", PAPER.brand)}>{formatDate(dueDate)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. BILL TO */}
        <div className={cn("mb-5 max-w-[380px] rounded-lg border px-4 py-3", PAPER.tint, PAPER.ruleStrong)}>
          <div className={cn("mb-1 text-xs font-extrabold uppercase tracking-[0.06em]", PAPER.muted)}>BILL TO:</div>

          {client ? (
            <div className={cn("leading-snug", compact ? "text-xs" : "text-sm")}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("font-extrabold", PAPER.ink)}>{client.full_name || "—"}</span>
                {client.company && <span className={cn("font-semibold", PAPER.brand)}>- {client.company}</span>}
              </div>
              {client.address && <div className={cn("mt-1 whitespace-pre-line", PAPER.muted)}>{client.address}</div>}
              {client.phone && <div className={cn("mt-0.5", PAPER.muted)}>{client.phone}</div>}
            </div>
          ) : (
            <div className={cn("text-xs italic", PAPER.subtle)}>No client details provided.</div>
          )}
        </div>

        {/* 3. LINE ITEMS — auto layout (no fixed column widths) so the amount column is never clipped */}
        <div className={cn("overflow-hidden rounded-[10px] border-[1.5px]", PAPER.frame, compact ? "mb-5" : "mb-6 sm:mb-7")}>
          <table className={cn("w-full border-collapse", compact ? "text-xs" : "text-xs sm:text-sm")}>
            <thead>
              <tr className={cn("text-left font-bold uppercase tracking-[0.05em]", PAPER.head)}>
                <th className={cell}>Description</th>
                <th className={cn(cell, "text-center")}>Qty</th>
                <th className={cn(cell, "text-right")}>Rate</th>
                <th className={cn(cell, "text-right")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className={cn("p-6 text-center", PAPER.subtle)}>
                    No line items listed.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const itemTotal = item.total ?? (item.quantity * item.unit_price);
                  return (
                    <tr
                      key={item.id || idx}
                      className={cn("border-b", PAPER.rule, idx % 2 === 0 ? PAPER.rowBase : PAPER.rowAlt)}
                    >
                      <td className={cn(cell, "break-words font-medium", PAPER.ink)}>{item.description || "—"}</td>
                      <td className={cn(cell, "text-center font-semibold", PAPER.inkSoft)}>{item.quantity}</td>
                      <td className={cn(cell, "text-right", PAPER.inkSoft)}>
                        <Money value={formatCurrency(item.unit_price)} />
                      </td>
                      <td className={cn(cell, "text-right font-bold", PAPER.ink)}>
                        <Money value={formatCurrency(itemTotal)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAYMENT DETAILS & TOTALS (totals sit right on wide paper, first when stacked) */}
        <div className={cn("mb-6 grid items-start gap-6", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[1.2fr_0.8fr]")}>
          <div
            className={cn(
              "overflow-hidden rounded-lg border-[1.5px]",
              PAPER.frame,
              compact ? "order-first" : "order-first sm:order-last"
            )}
          >
            <table className="w-full border-collapse text-xs sm:text-[0.8rem]">
              <tbody>
                <tr className={cn("border-b", PAPER.rule)}>
                  <td className={cn("px-3 py-2 font-bold uppercase", PAPER.muted)}>SUBTOTAL</td>
                  <td className={cn("px-3 py-2 text-right font-bold", PAPER.ink)}>
                    <Money value={formatCurrency(calculatedSubtotal)} />
                  </td>
                </tr>
                <tr className={cn("border-b-[1.5px]", PAPER.frame)}>
                  <td className={cn("px-3 py-2 font-bold uppercase", PAPER.muted)}>OTHERS</td>
                  <td className={cn("px-3 py-2 text-right", PAPER.subtle)}>—</td>
                </tr>
                <tr className={PAPER.tint}>
                  <td className={cn("px-3 py-2.5 text-sm font-black uppercase", PAPER.ink)}>TOTAL</td>
                  <td className={cn("px-3 py-2.5 text-right text-base font-black", PAPER.brand)}>
                    <Money value={formatCurrency(finalTotal)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BANK DETAILS & SIGNATURE */}
          <div className="flex flex-col gap-3.5">
            <div className={cn("max-w-[300px] rounded-lg border px-3.5 py-2.5", PAPER.tint, PAPER.ruleStrong)}>
              <div className={cn("mb-1 text-xs font-extrabold italic", PAPER.ink)}>Payment Transfer</div>
              {notes ? (
                <div className={cn("whitespace-pre-line text-xs font-semibold leading-snug", PAPER.inkSoft)}>{notes}</div>
              ) : (
                <div className={cn("text-xs font-semibold leading-snug", PAPER.inkSoft)}>
                  BCA Acc No. 0402434901
                  <br />
                  A/n : Mulyadi
                </div>
              )}
            </div>

            <div className="mt-1 flex w-[120px] flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so html2canvas captures it */}
              <img src="/signature.png" alt="Authorized Signature" className="mb-1 block h-auto max-h-[55px] w-[100px]" />
              <div className={cn("w-full text-center text-[0.82rem] font-extrabold leading-tight", PAPER.ink)}>Mulyadi</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FOOTER BANNER */}
      <div
        className={cn(
          "mt-auto rounded-lg border p-2.5 text-center text-xs font-extrabold uppercase tracking-[0.08em]",
          PAPER.tintStrong,
          PAPER.ruleStrong,
          PAPER.inkSoft
        )}
      >
        THANK YOU FOR YOUR COOPERATION
      </div>
    </div>
  );
}
