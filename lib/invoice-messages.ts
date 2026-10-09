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

/** Email subject + plain-text body (mailto: cannot carry formatting, so no symbols or markup). */
export function buildEmail(input: InvoiceMessageInput): { subject: string; body: string } {
  const kind = kindOf(input);
  const pay = parsePaymentNotes(input.notes) ?? DEFAULT_PAYMENT;
  const amount = formatRupiah(input.amount);
  const due = input.dueDate ? formatDate(input.dueDate) : "Upon receipt";
  const sender = companyName(input);
  const contact = contactLine(input);
  const greeting = `Dear ${input.clientName?.trim() || "Sir/Madam"},`;

  const summary = [
    `Invoice number : ${input.invoiceNumber}`,
    `Issue date     : ${input.invoiceDate ? formatDate(input.invoiceDate) : "-"}`,
    `Due date       : ${due}`,
    `${kind === "paid" ? "Amount paid    " : "Amount due     "}: ${amount}`,
  ];

  const payment = [
    "Payment details",
    `Bank           : ${pay.bank}`,
    `Account number : ${pay.accountNumber}`,
    ...(pay.accountName ? [`Account name   : ${pay.accountName}`] : []),
    `Please use the invoice number as the transfer reference.`,
  ];

  let subject: string;
  let intro: string[];
  let closing: string[];

  if (kind === "paid") {
    subject = `Payment received – Invoice ${input.invoiceNumber} – ${sender}`;
    intro = [`Thank you for your payment. We confirm that invoice ${input.invoiceNumber} has been paid in full.`];
    closing = [`You can view and download your paid invoice for your records here:`, input.invoiceUrl];
  } else if (kind === "overdue") {
    subject = `Payment reminder – Invoice ${input.invoiceNumber} – ${sender}`;
    intro = [
      `We hope you are well. This is a friendly reminder that invoice ${input.invoiceNumber} was due on ${due} and remains unpaid.`,
      `If you have already made the payment, please disregard this email, or reply with the transfer receipt so we can update our records.`,
    ];
    closing = [`View and download the invoice:`, input.invoiceUrl, "", ...payment];
  } else {
    subject = `Invoice ${input.invoiceNumber} from ${sender} – due ${due}`;
    intro = [`Thank you for your business. Please find the details of your invoice below.`];
    closing = [`View and download the invoice:`, input.invoiceUrl, "", ...payment];
  }

  const body = [
    greeting,
    "",
    ...intro,
    "",
    ...summary,
    "",
    ...closing,
    "",
    `If you have any questions, simply reply to this email.`,
    "",
    "Kind regards,",
    sender,
    ...(contact ? [contact] : []),
  ].join("\n");

  return { subject, body };
}
