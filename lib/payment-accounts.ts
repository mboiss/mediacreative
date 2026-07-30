export type PaymentAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default?: boolean;
  notes?: string;
};

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  {
    id: "acc_bca",
    bank_name: "BCA",
    account_number: "0402434901",
    account_holder: "Mulyadi",
    is_default: true,
  },
  {
    id: "acc_mandiri",
    bank_name: "Bank Mandiri",
    account_number: "137-00-1234567-8",
    account_holder: "Media Creative",
    is_default: false,
  },
  {
    id: "acc_uob",
    bank_name: "Bank UOB",
    account_number: "301-301-123-4",
    account_holder: "Media Creative",
    is_default: false,
  },
];

export async function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  try {
    const res = await fetch(`/api/payment-accounts?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error("Failed to fetch payment accounts from API:", err);
  }
  return getPaymentAccounts();
}

export function getPaymentAccounts(): PaymentAccount[] {
  if (typeof window === "undefined") return DEFAULT_PAYMENT_ACCOUNTS;
  try {
    const saved = localStorage.getItem("media_creative_payment_accounts");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading payment accounts from localStorage:", e);
  }
  return DEFAULT_PAYMENT_ACCOUNTS;
}

export async function savePaymentAccountToApi(account: PaymentAccount): Promise<boolean> {
  try {
    const res = await fetch("/api/payment-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
    return res.ok;
  } catch (e) {
    console.error("Error saving payment account to API:", e);
    return false;
  }
}

export function savePaymentAccounts(accounts: PaymentAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("media_creative_payment_accounts", JSON.stringify(accounts));
  } catch (e) {
    console.error("Error saving payment accounts to localStorage:", e);
  }
}

export function formatAccountTransferText(acc: PaymentAccount): string {
  const bankLabel = acc.bank_name.toUpperCase().startsWith("BANK")
    ? acc.bank_name
    : `${acc.bank_name} Acc No.`;
  return `${bankLabel} ${acc.account_number}\nA/n : ${acc.account_holder}${acc.notes ? `\n${acc.notes}` : ""}`;
}
