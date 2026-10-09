// Client-facing invoice messages (WhatsApp + email) and payment-detail parsing.
// All text is English. The wording follows the invoice status: a normal invoice,
// a polite reminder when it is overdue, or a payment receipt when it is paid.

import { daysFromToday, formatDate, formatRupiah } from "@/lib/format";

export type PaymentDetails = { bank: string; accountNumber: string; accountName: string };

const BANKS: [RegExp, string][] = [
  [/mandiri/i, "Mandiri"],
  [/\bbca\b/i, "BCA"],
  [/\bbri\b/i, "BRI"],
  [/\bbni\b/i, "BNI"],
  [/cimb/i, "CIMB Niaga"],
  [/permata/i, "Permata"],
  [/danamon/i, "Danamon"],
  [/jenius/i, "Jenius"],
  [/\bbsi\b/i, "BSI"],
  [/\buob\b/i, "UOB"],
];

/**
 * Invoice notes hold the chosen bank account, e.g. "BCA Acc No. 0402434901\nA/n : Mulyadi".
 * Returns null when no account number can be found (the raw notes are then shown as-is).
 */
export function parsePaymentNotes(notes?: string | null): PaymentDetails | null {
  if (!notes?.trim()) return null;
  let bank = "";
  let accountNumber = "";
  let accountName = "";
  for (const line of notes.split("\n")) {
    if (!bank) bank = BANKS.find(([re]) => re.test(line))?.[1] ?? "";
    const num = line.replace(/[\s.-]/g, "").match(/\d{8,20}/);
    if (num && !accountNumber) accountNumber = num[0];
    const name = line.split(/a\/?n\.?\s*:?\s*/i)[1];
    if (/a\/?n/i.test(line) && name) accountName = name.trim();
  }
  if (!accountNumber) return null;
  return { bank: bank || "Bank transfer", accountNumber, accountName };
}

const DEFAULT_PAYMENT: PaymentDetails = { bank: "BCA", accountNumber: "0402434901", accountName: "Mulyadi" };

export type InvoiceMessageInput = {
  invoiceNumber: string;
  status?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  amount: number;
  clientName?: string | null;
  notes?: string | null;
  invoiceUrl: string;
  company?: { company_name?: string | null; phone?: string | null; email?: string | null } | null;
  /** Line items, listed in the formatted email. */
  items?: { description?: string | null; quantity?: number | null; unit_price?: number | null; total?: number | null }[];
};

type Kind = "paid" | "overdue" | "invoice";

function kindOf(input: InvoiceMessageInput): Kind {
  if (input.status === "Paid") return "paid";
  const days = daysFromToday(input.dueDate ?? null);
  if (input.status === "Overdue" || (days !== null && days < 0)) return "overdue";
  return "invoice";
}

function greetingName(name?: string | null) {
  return name?.trim() || "there";
}

function companyName(input: InvoiceMessageInput) {
  return input.company?.company_name?.trim() || "Media Creative";
}

function contactLine(input: InvoiceMessageInput) {
  return [input.company?.phone, input.company?.email].filter(Boolean).join(" · ");
}

/** WhatsApp message (uses WhatsApp *bold*). */
export function buildWhatsAppMessage(input: InvoiceMessageInput): string {
  const kind = kindOf(input);
  const pay = parsePaymentNotes(input.notes) ?? DEFAULT_PAYMENT;
  const amount = formatRupiah(input.amount);
  const due = input.dueDate ? formatDate(input.dueDate) : "upon receipt";
  const sender = companyName(input);

  const lines: string[] = [`Hi ${greetingName(input.clientName)},`, ""];

  if (kind === "paid") {
    lines.push(
      `Thank you — we have received your payment for invoice *${input.invoiceNumber}*.`,
      "",
      `Amount paid: *${amount}*`,
      "",
      `Your receipt is available here:`,
      input.invoiceUrl
    );
  } else {
    lines.push(
      kind === "overdue"
        ? `A friendly reminder that invoice *${input.invoiceNumber}* was due on ${due} and is still open.`
        : `Here is your invoice from ${sender}.`,
      "",
      `*${input.invoiceNumber}*`,
      `Amount due: *${amount}*`,
      `Due date: ${due}`,
      "",
      `View & download:`,
      input.invoiceUrl,
      "",
      `*Payment by bank transfer*`,
      `${pay.bank} ${pay.accountNumber}${pay.accountName ? ` a.n. ${pay.accountName}` : ""}`,
      `Please include the invoice number in the transfer note.`
    );
    if (kind === "overdue") lines.push("", `If you have already paid, please ignore this message.`);
  }

  lines.push("", "Thank you,", sender);
  return lines.join("\n");
}

type EmailContent = {
  kind: Kind;
  subject: string;
  greeting: string;
  intro: string[];
  rows: [string, string][];
  payment: PaymentDetails | null;
  linkLabel: string;
  sender: string;
  contact: string;
};

function emailContent(input: InvoiceMessageInput): EmailContent {
  const kind = kindOf(input);
  const pay = parsePaymentNotes(input.notes) ?? DEFAULT_PAYMENT;
  const amount = formatRupiah(input.amount);
  const due = input.dueDate ? formatDate(input.dueDate) : "Upon receipt";
  const sender = companyName(input);

  const rows: [string, string][] = [
    ["Invoice number", input.invoiceNumber],
    ["Issue date", input.invoiceDate ? formatDate(input.invoiceDate) : "-"],
    ["Due date", due],
    [kind === "paid" ? "Amount paid" : "Amount due", amount],
  ];

  let subject: string;
  let intro: string[];
  if (kind === "paid") {
    subject = `Payment received – Invoice ${input.invoiceNumber} – ${sender}`;
    intro = [`Thank you for your payment. We confirm that invoice ${input.invoiceNumber} has been paid in full.`];
  } else if (kind === "overdue") {
    subject = `Payment reminder – Invoice ${input.invoiceNumber} – ${sender}`;
    intro = [
      `We hope you are well. This is a friendly reminder that invoice ${input.invoiceNumber} was due on ${due} and remains unpaid.`,
      `If you have already made the payment, please disregard this email, or reply with the transfer receipt so we can update our records.`,
    ];
  } else {
    subject = `Invoice ${input.invoiceNumber} from ${sender} – due ${due}`;
    intro = [`Thank you for your business. Please find the details of your invoice below.`];
  }

  return {
    kind,
    subject,
    greeting: `Dear ${input.clientName?.trim() || "Sir/Madam"},`,
    intro,
    rows,
    payment: kind === "paid" ? null : pay,
    linkLabel: kind === "paid" ? "View paid invoice" : "View & download invoice",
    sender,
    contact: contactLine(input),
  };
}

/** Email subject + plain-text body (fallback for mail apps that don't accept pasted formatting). */
export function buildEmail(input: InvoiceMessageInput): { subject: string; body: string } {
  const c = emailContent(input);
  const lines = [
    c.greeting,
    "",
    ...c.intro,
    "",
    ...c.rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${c.linkLabel}: ${input.invoiceUrl}`,
  ];
  if (c.payment) {
    lines.push(
      "",
      "Payment details",
      `Bank: ${c.payment.bank}`,
      `Account number: ${c.payment.accountNumber}`,
      ...(c.payment.accountName ? [`Account name: ${c.payment.accountName}`] : []),
      "Please use the invoice number as the transfer reference."
    );
  }
  // Ends at "Kind regards," — the sender's own mail signature follows.
  lines.push("", "If you have any questions, simply reply to this email.", "", "Kind regards,");
  return { subject: c.subject, body: lines.join("\n") };
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Formatted email body (HTML with inline styles and tables, which Gmail / Outlook / Apple Mail keep when pasted).
 * Copied to the clipboard by the "Email" button; the user pastes it into the message body.
 * Ends at "Kind regards," because the sender's own mail signature follows.
 */
export function buildEmailHtml(input: InvoiceMessageInput): { subject: string; html: string } {
  const c = emailContent(input);
  const F = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";
  const INK = "#0f172a";
  const MUTED = "#64748b";
  const LINE = "#e2e8f0";
  const BRAND = "#0369a1";

  const tone =
    c.kind === "paid"
      ? { color: "#047857", bg: "#ecfdf5", label: "Paid" }
      : c.kind === "overdue"
        ? { color: "#b91c1c", bg: "#fef2f2", label: "Overdue" }
        : { color: BRAND, bg: "#f0f9ff", label: "Invoice" };

  const amountLabel = c.kind === "paid" ? "Amount paid" : "Amount due";
  const dueText = c.kind === "paid" ? "Paid in full — thank you" : `Due ${c.rows[2][1]}`;

  const items = (input.items ?? []).filter((it) => it.description || it.total || it.unit_price);
  const itemRows = items
    .map((it) => {
      const qty = Number(it.quantity ?? 1);
      const total = Number(it.total ?? qty * Number(it.unit_price ?? 0));
      return `<tr>
        <td style="${F}color:${INK};font-size:14px;padding:10px 0;border-bottom:1px solid ${LINE};">${esc(it.description || "Item")}${
          qty !== 1 ? `<br><span style="color:${MUTED};font-size:12px;">${qty} × ${esc(formatRupiah(Number(it.unit_price ?? 0)))}</span>` : ""
        }</td>
        <td align="right" style="${F}color:${INK};font-size:14px;padding:10px 0;border-bottom:1px solid ${LINE};white-space:nowrap;vertical-align:top;">${esc(formatRupiah(total))}</td>
      </tr>`;
    })
    .join("");

  const meta = (label: string, value: string) =>
    `<td style="${F}padding:0 16px 0 0;vertical-align:top;"><div style="color:${MUTED};font-size:12px;">${esc(label)}</div><div style="color:${INK};font-size:14px;font-weight:600;">${esc(value)}</div></td>`;

  const payment = c.payment
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#f8fafc;border:1px solid ${LINE};border-radius:10px;margin:0 0 20px;">
  <tr><td style="${F}padding:16px 20px;">
    <div style="color:${MUTED};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Payment by bank transfer</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="${F}color:${MUTED};font-size:13px;padding:3px 0;">Bank</td><td align="right" style="${F}color:${INK};font-size:14px;font-weight:600;padding:3px 0;">${esc(c.payment.bank)}</td></tr>
      <tr><td style="${F}color:${MUTED};font-size:13px;padding:3px 0;">Account number</td><td align="right" style="font-family:Consolas,'Courier New',monospace;color:${INK};font-size:14px;font-weight:600;padding:3px 0;">${esc(c.payment.accountNumber)}</td></tr>
      ${c.payment.accountName ? `<tr><td style="${F}color:${MUTED};font-size:13px;padding:3px 0;">Account name</td><td align="right" style="${F}color:${INK};font-size:14px;font-weight:600;padding:3px 0;">${esc(c.payment.accountName)}</td></tr>` : ""}
    </table>
    <div style="${F}color:${MUTED};font-size:12px;margin:10px 0 0;">Please use <b style="color:${INK};">${esc(input.invoiceNumber)}</b> as the transfer reference.</div>
  </td></tr>
</table>`
    : "";

  const html = `<div style="${F}color:${INK};font-size:15px;line-height:1.6;max-width:560px;">
  <p style="margin:0 0 14px;">${esc(c.greeting)}</p>
  ${c.intro.map((t) => `<p style="margin:0 0 14px;">${esc(t)}</p>`).join("")}

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border:1px solid ${LINE};border-radius:12px;margin:22px 0;">
    <tr><td style="background:${tone.color};height:4px;line-height:4px;font-size:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
    <tr><td style="${F}padding:20px 24px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="${F}color:${MUTED};font-size:13px;">Invoice <b style="color:${INK};">${esc(input.invoiceNumber)}</b></td>
        <td align="right"><span style="${F}display:inline-block;background:${tone.bg};color:${tone.color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">${tone.label}</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="${F}padding:6px 24px 18px;">
      <div style="color:${MUTED};font-size:13px;">${amountLabel}</div>
      <div style="color:${INK};font-size:30px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">${esc(c.rows[3][1])}</div>
      <div style="color:${c.kind === "overdue" ? tone.color : MUTED};font-size:13px;margin-top:2px;">${esc(dueText)}</div>
    </td></tr>
    ${
      itemRows
        ? `<tr><td style="${F}padding:0 24px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${LINE};">${itemRows}
        <tr><td style="${F}color:${INK};font-size:14px;font-weight:700;padding:12px 0 0;">Total</td><td align="right" style="${F}color:${INK};font-size:14px;font-weight:700;padding:12px 0 0;white-space:nowrap;">${esc(c.rows[3][1])}</td></tr>
      </table>
    </td></tr>`
        : ""
    }
    <tr><td style="${F}padding:14px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${meta("Issue date", c.rows[1][1])}${meta("Due date", c.rows[2][1])}</tr></table>
    </td></tr>
    <tr><td style="${F}padding:6px 24px 24px;">
      <a href="${esc(input.invoiceUrl)}" style="${F}display:block;background:${BRAND};color:#ffffff;text-align:center;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px;">${esc(c.linkLabel)}</a>
    </td></tr>
  </table>

  ${payment}
  <p style="margin:0 0 14px;">If you have any questions, simply reply to this email.</p>
  <p style="margin:0;">Kind regards,</p>
</div>`;

  return { subject: c.subject, html };
}
