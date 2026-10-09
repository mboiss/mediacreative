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
  lines.push("", "If you have any questions, simply reply to this email.", "", "Kind regards,", c.sender);
  if (c.contact) lines.push(c.contact);
  return { subject: c.subject, body: lines.join("\n") };
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Formatted email body (HTML with inline styles and tables, which Gmail / Outlook / Apple Mail keep when pasted).
 * Copied to the clipboard by the "Email" button; the user pastes it into the message body.
 */
export function buildEmailHtml(input: InvoiceMessageInput): { subject: string; html: string } {
  const c = emailContent(input);
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const muted = "color:#64748b;";
  const ink = "color:#0f172a;";
  const brand = "#0369a1";

  const accent = c.kind === "paid" ? "#047857" : c.kind === "overdue" ? "#b91c1c" : brand;
  const badge = c.kind === "paid" ? "PAID" : c.kind === "overdue" ? "OVERDUE" : "INVOICE";

  const row = ([k, v]: [string, string], last: boolean) => {
    const isAmount = k.startsWith("Amount");
    return `<tr>
      <td style="${font}${muted}font-size:13px;padding:10px 16px;${last ? "" : "border-bottom:1px solid #e2e8f0;"}">${esc(k)}</td>
      <td style="${font}${isAmount ? `color:${accent};font-size:16px;font-weight:bold;` : `${ink}font-size:14px;font-weight:bold;`}padding:10px 16px;text-align:right;${last ? "" : "border-bottom:1px solid #e2e8f0;"}">${esc(v)}</td>
    </tr>`;
  };

  const paymentRows = c.payment
    ? [
        ["Bank", c.payment.bank],
        ["Account number", c.payment.accountNumber],
        ...(c.payment.accountName ? [["Account name", c.payment.accountName]] : []),
      ]
        .map(
          ([k, v]) => `<tr>
      <td style="${font}${muted}font-size:13px;padding:6px 16px;">${esc(k)}</td>
      <td style="${font}${ink}font-size:14px;font-weight:bold;padding:6px 16px;text-align:right;">${esc(v)}</td>
    </tr>`
        )
        .join("")
    : "";

  const html = `<div style="${font}${ink}font-size:14px;line-height:1.6;max-width:600px;">
  <p style="margin:0 0 12px;">${esc(c.greeting)}</p>
  ${c.intro.map((t) => `<p style="margin:0 0 12px;">${esc(t)}</p>`).join("")}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;max-width:600px;">
    <tr>
      <td colspan="2" style="${font}background:#f8fafc;border-bottom:3px solid ${accent};padding:12px 16px;border-radius:8px 8px 0 0;">
        <span style="font-size:12px;font-weight:bold;letter-spacing:2px;color:${accent};">${badge}</span>
        <span style="font-size:14px;font-weight:bold;${ink}margin-left:8px;">${esc(c.sender)}</span>
      </td>
    </tr>
    ${c.rows.map((r, i) => row(r, i === c.rows.length - 1)).join("")}
  </table>
  <p style="margin:0 0 20px;">
    <a href="${esc(input.invoiceUrl)}" style="${font}display:inline-block;background:${brand};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:6px;">${esc(c.linkLabel)}</a>
  </p>
  ${
    c.payment
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 16px;max-width:600px;">
    <tr><td colspan="2" style="${font}${muted}font-size:11px;font-weight:bold;letter-spacing:1px;padding:12px 16px 4px;">PAYMENT DETAILS</td></tr>
    ${paymentRows}
    <tr><td colspan="2" style="${font}${muted}font-size:12px;padding:6px 16px 12px;">Please use <b style="${ink}">${esc(input.invoiceNumber)}</b> as the transfer reference.</td></tr>
  </table>`
      : ""
  }
  <p style="margin:0 0 12px;">If you have any questions, simply reply to this email.</p>
  <p style="margin:0;">Kind regards,<br><b>${esc(c.sender)}</b>${c.contact ? `<br><span style="${muted}font-size:13px;">${esc(c.contact)}</span>` : ""}</p>
</div>`;

  return { subject: c.subject, html };
}
