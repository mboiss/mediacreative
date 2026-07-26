"use client";

import React from "react";
import Image from "next/image";

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
}

export function InvoiceSheet({
  invoiceNumber,
  invoiceDate,
  dueDate,
  client,
  items,
  notes,
  subtotal,
  totalAmount,
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

  return (
    <div
      className="printable-invoice"
      style={{
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        borderRadius: 16,
        padding: "48px 54px",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
        width: "100%",
        maxWidth: "794px", // Standard A4 width pixel equivalent (210mm @ 96DPI)
        minHeight: "1050px", // A4 height proportion ratio
        margin: "0 auto",
        lineHeight: 1.5,
        border: "1px solid #cbd5e1",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        {/* 1. HEADER: BRAND LOGO & INVOICE META */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
            paddingBottom: 20,
            borderBottom: "2px solid #e2e8f0",
          }}
        >
          {/* LOGO & BRANDING */}
          <div>
            <div>
              {/* Standard img tag for 100% accurate PDF rendering without html2canvas cropping */}
              <img
                src="/logo.png"
                alt="Media Creative Logo"
                style={{
                  width: "160px",
                  height: "auto",
                  maxHeight: "65px",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* INVOICE META TABLE */}
          <div style={{ textAlign: "right" }}>
            <h1
              style={{
                fontSize: "2.6rem",
                fontWeight: 900,
                color: "#334155",
                margin: "0 0 16px",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              INVOICE
            </h1>

            <table style={{ marginLeft: "auto", fontSize: "0.83rem", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, color: "#64748b", paddingRight: 14, paddingBottom: 4, textAlign: "right" }}>DATE:</td>
                  <td style={{ fontWeight: 600, color: "#0f172a", paddingBottom: 4, textAlign: "right" }}>{formatDate(invoiceDate)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: "#64748b", paddingRight: 14, paddingBottom: 4, textAlign: "right" }}>INVOICE #:</td>
                  <td style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: "0.92rem", paddingBottom: 4, textAlign: "right" }}>
                    {invoiceNumber}
                  </td>
                </tr>
                {dueDate && (
                  <tr>
                    <td style={{ fontWeight: 700, color: "#64748b", paddingRight: 14, textAlign: "right" }}>DUE DATE:</td>
                    <td style={{ fontWeight: 700, color: "#0284c7", textAlign: "right" }}>{formatDate(dueDate)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. BILL TO SECTION */}
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            maxWidth: "380px",
          }}
        >
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            BILL TO:
          </div>

          {client ? (
            <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontWeight: 800, color: "#0f172a" }}>
                  {client.full_name || "—"}
                </span>
                {client.company && (
                  <span style={{ fontWeight: 600, color: "#0284c7" }}>
                    - {client.company}
                  </span>
                )}
              </div>
              {client.address && (
                <div style={{ color: "#475569", marginTop: 3, whiteSpace: "pre-line" }}>
                  {client.address}
                </div>
              )}
              {client.phone && (
                <div style={{ color: "#475569", marginTop: 2 }}>
                  {client.phone}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
              No client details provided.
            </div>
          )}
        </div>

        {/* 3. ITEMIZATION TABLE */}
        <div style={{ marginBottom: 28, border: "1.5px solid #334155", borderRadius: 10, overflow: "hidden" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#334155",
                  color: "#ffffff",
                  textAlign: "left",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                <th style={{ padding: "12px 16px", textTransform: "uppercase" }}>DESCRIPTION</th>
                <th style={{ padding: "12px 16px", textAlign: "center", width: 60, textTransform: "uppercase" }}>QTY</th>
                <th style={{ padding: "12px 16px", textAlign: "right", width: 130, textTransform: "uppercase" }}>RATE</th>
                <th style={{ padding: "12px 16px", textAlign: "right", width: 150, textTransform: "uppercase" }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                    No line items listed.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const itemTotal = item.total ?? (item.quantity * item.unit_price);
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        background: isEven ? "#ffffff" : "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 500 }}>
                        {item.description || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#334155", fontWeight: 600 }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#334155" }}>
                        <span style={{ float: "left", color: "#64748b" }}>Rp</span>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        <span style={{ float: "left", color: "#64748b" }}>Rp</span>
                        {formatCurrency(itemTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAYMENT DETAILS & TOTALS ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 24,
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          {/* LEFT: BANK DETAILS & SIGNATURE */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Payment Transfer Details Box */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px 14px",
                maxWidth: "300px",
              }}
            >
              <div style={{ fontWeight: 800, color: "#0f172a", fontStyle: "italic", fontSize: "0.74rem", marginBottom: 3 }}>
                Payment Transfer
              </div>
              {notes ? (
                <div style={{ whiteSpace: "pre-line", color: "#334155", fontWeight: 600, fontSize: "0.72rem", lineHeight: 1.4 }}>
                  {notes}
                </div>
              ) : (
                <div style={{ color: "#334155", fontWeight: 600, fontSize: "0.72rem", lineHeight: 1.4 }}>
                  BCA Acc No. 0402434901<br />
                  A/n : Mulyadi
                </div>
              )}
            </div>

            {/* REAL USER SIGNATURE */}
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", alignItems: "center", width: "120px" }}>
              <div style={{ marginBottom: 4, display: "flex", justifyContent: "center", width: "100%" }}>
                <img
                  src="/signature.png"
                  alt="Authorized Signature"
                  style={{
                    width: "100px",
                    height: "auto",
                    maxHeight: "55px",
                    display: "block",
                  }}
                />
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, textAlign: "center", width: "100%" }}>
                Mulyadi
              </div>
            </div>
          </div>

          {/* RIGHT: TOTALS TABLE */}
          <div style={{ border: "1.5px solid #334155", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    SUBTOTAL
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                    <span style={{ float: "left", color: "#64748b" }}>Rp</span>
                    {formatCurrency(calculatedSubtotal)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1.5px solid #334155" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    OTHERS
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>
                    —
                  </td>
                </tr>
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 900, color: "#0f172a", fontSize: "0.88rem", textTransform: "uppercase" }}>
                    TOTAL
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: "#0284c7", fontSize: "1rem" }}>
                    <span style={{ float: "left", color: "#64748b" }}>Rp</span>
                    {formatCurrency(finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. FOOTER BANNER */}
      <div
        style={{
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "10px",
          textAlign: "center",
          fontSize: "0.74rem",
          fontWeight: 800,
          color: "#334155",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginTop: "auto",
        }}
      >
        THANK YOU FOR YOUR COOPERATION
      </div>
    </div>
  );
}
