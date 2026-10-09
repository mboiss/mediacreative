"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building,
  Save,
  CheckCircle2,
  Sliders,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Star,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import {
  getPaymentAccounts,
  savePaymentAccounts,
  PaymentAccount,
} from "@/lib/payment-accounts";
import {
  getTourLeaders,
  saveTourLeaders,
  TourLeader,
} from "@/lib/tour-leaders";

import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";

type SettingsForm = {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  invoice_prefix: string;
  tax_rate: string;
  currency: string;
  payment_terms_days: string;
};

const DEFAULT_SETTINGS: SettingsForm = {
  company_name: "Media Creative Studio",
  email: "billing@mediacreative.co.id",
  phone: "+62 812-3456-7890",
  address: "Jl. Sudirman No. 88, Jakarta Selatan 12190",
  tax_id: "01.234.567.8-012.000",
  invoice_prefix: "INV-MC{YYYY}-",
  tax_rate: "11",
  currency: "IDR (Rp)",
  payment_terms_days: "14",
};

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return (data && typeof data.error === "string" && data.error) || fallback;
}

export default function SettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [tourLeaders, setTourLeaders] = useState<TourLeader[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const ts = Date.now();
      const [sRes, pRes, tRes] = await Promise.all([
        fetch(`/api/settings?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/payment-accounts?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-leaders?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
      ]);

      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData && sData.company_name) {
          setForm({
            company_name: sData.company_name || DEFAULT_SETTINGS.company_name,
            email: sData.email || DEFAULT_SETTINGS.email,
            phone: sData.phone || DEFAULT_SETTINGS.phone,
            address: sData.address || DEFAULT_SETTINGS.address,
            tax_id: sData.tax_id || DEFAULT_SETTINGS.tax_id,
            invoice_prefix: sData.invoice_prefix || DEFAULT_SETTINGS.invoice_prefix,
            tax_rate: sData.tax_rate || DEFAULT_SETTINGS.tax_rate,
            currency: sData.currency || DEFAULT_SETTINGS.currency,
            payment_terms_days: sData.payment_terms_days || DEFAULT_SETTINGS.payment_terms_days,
          });
        }
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) setPaymentAccounts(pData);
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTourLeaders(tData);
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadData, { tables: ["app_settings", "payment_accounts", "tour_leaders"] });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bank Account Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
    notes: "",
  });

  // Tour Leader Modal State
  const [showTlModal, setShowTlModal] = useState(false);
  const [editingTl, setEditingTl] = useState<TourLeader | null>(null);
  const [tlForm, setTlForm] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        localStorage.setItem("media_creative_settings", JSON.stringify(form));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        await loadData();
      } else {
        toast.error("Save Failed", await readError(res, "Could not save settings to the server."));
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Network Error", "Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  // --- Payment Accounts Handlers ---
  function handleOpenAddAccount() {
    setEditingAccount(null);
    setAccountForm({ bank_name: "", account_number: "", account_holder: "", notes: "" });
    setShowAccountModal(true);
  }

  function handleOpenEditAccount(acc: PaymentAccount) {
    setEditingAccount(acc);
    setAccountForm({
      bank_name: acc.bank_name,
      account_number: acc.account_number,
      account_holder: acc.account_holder,
      notes: acc.notes || "",
    });
    setShowAccountModal(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountForm.bank_name || !accountForm.account_number || !accountForm.account_holder) {
      toast.warning("Missing Fields", "Bank name, account number and account holder are required.");
      return;
    }

    const payload: PaymentAccount = {
      id: editingAccount ? editingAccount.id : "acc_" + Date.now(),
      bank_name: accountForm.bank_name.trim(),
      account_number: accountForm.account_number.trim(),
      account_holder: accountForm.account_holder.trim(),
      is_default: editingAccount ? editingAccount.is_default : paymentAccounts.length === 0,
      notes: accountForm.notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Save Failed", await readError(res, "Could not save bank account."));
        return;
      }
      setShowAccountModal(false);
      toast.success(editingAccount ? "Account Updated" : "Account Added", `${payload.bank_name} saved.`);
      loadData();
    } catch (err) {
      console.error("Error saving account:", err);
      toast.error("Network Error", "Could not connect to server.");
    }
  }

  async function handleDeleteAccount(id: string) {
    const acc = paymentAccounts.find((a) => a.id === id);
    if (
      !(await confirm({
        title: "Delete bank account?",
        message: acc
          ? `${acc.bank_name} (${acc.account_number}) will be permanently removed.`
          : "This bank account will be permanently removed.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    try {
      const res = await fetch("/api/payment-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Delete Failed", await readError(res, "Could not delete bank account."));
        return;
      }
      toast.success("Account Deleted", "Bank account removed.");
      loadData();
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error("Network Error", "Could not connect to server.");
    }
  }

  async function handleSetDefaultAccount(id: string) {
    const target = paymentAccounts.find((a) => a.id === id);
    if (!target) return;
    try {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, is_default: true }),
      });
      if (!res.ok) {
        toast.error("Update Failed", await readError(res, "Could not set default account."));
        return;
      }
      toast.success("Default Account Set", `${target.bank_name} is now the default.`);
      loadData();
    } catch (err) {
      console.error("Error setting default account:", err);
      toast.error("Network Error", "Could not connect to server.");
    }
  }

  // --- Tour Leaders Handlers ---
  function handleOpenAddTl() {
    setEditingTl(null);
    setTlForm({ name: "", phone: "", notes: "" });
    setShowTlModal(true);
  }

  function handleOpenEditTl(tl: TourLeader) {
    setEditingTl(tl);
    setTlForm({
      name: tl.name,
      phone: tl.phone || "",
      notes: tl.notes || "",
    });
    setShowTlModal(true);
  }

  async function handleSaveTl(e: React.FormEvent) {
    e.preventDefault();
    if (!tlForm.name.trim()) {
      toast.warning("Missing Name", "Please enter the Tour Leader's name.");
      return;
    }

    const payload = {
      id: editingTl ? editingTl.id : undefined,
      name: tlForm.name.trim(),
      phone: tlForm.phone.trim() || null,
      notes: tlForm.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/tour-leaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Save Failed", await readError(res, "Could not save Tour Leader."));
        return;
      }
      setShowTlModal(false);
      toast.success(editingTl ? "Tour Leader Updated" : "Tour Leader Added", `${payload.name} saved.`);
      loadData();
    } catch (err) {
      console.error("Error saving Tour Leader:", err);
      toast.error("Network Error", "Could not connect to server.");
    }
  }

  async function handleDeleteTl(id: string) {
    const tl = tourLeaders.find((t) => t.id === id);
    if (
      !(await confirm({
        title: "Delete Tour Leader?",
        message: `${tl ? `"${tl.name}"` : "This Tour Leader"} will be permanently removed.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    try {
      const res = await fetch("/api/tour-leaders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Delete Failed", await readError(res, "Could not delete Tour Leader."));
        return;
      }
      toast.success("Tour Leader Deleted", "Tour Leader removed.");
      loadData();
    } catch (err) {
      console.error("Error deleting Tour Leader:", err);
      toast.error("Network Error", "Could not connect to server.");
    }
  }


  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Company profile, payment bank accounts, Tour Leaders and invoicing defaults."
        actions={
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden /> Saving...
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 size={16} aria-hidden /> Saved
              </>
            ) : (
              <>
                <Save size={16} aria-hidden /> Save Changes
              </>
            )}
          </button>
        }
      />

      {savedSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-control border border-success-border bg-success-bg px-4 py-3 text-sm font-semibold text-success"
        >
          <CheckCircle2 size={18} aria-hidden /> Settings saved.
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* COMPANY PROFILE */}
        <Panel title="Company Profile" icon={<Building size={16} />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Company / Brand Name" htmlFor="settings-company" required>
              <TextInput
                id="settings-company"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Billing Email" htmlFor="settings-email" required>
              <TextInput
                id="settings-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Contact Phone" htmlFor="settings-phone">
              <TextInput
                id="settings-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="NPWP / Tax ID" htmlFor="settings-tax-id">
              <TextInput
                id="settings-tax-id"
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              />
            </Field>
            <Field label="Office Address" htmlFor="settings-address" className="md:col-span-2">
              <TextArea
                id="settings-address"
                className="min-h-20"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        {/* PAYMENT TRANSFER ACCOUNTS MANAGEMENT */}
        <Panel
          title="Payment Accounts"
          description="Bank transfer accounts shown in the payment instructions on invoices."
          icon={<CreditCard size={16} />}
          actions={
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleOpenAddAccount}>
              <Plus size={14} aria-hidden /> New Account
            </button>
          }
        >
          {!loading && paymentAccounts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-fg-subtle">
              No bank accounts yet.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-inset">
              {paymentAccounts.map((acc) => (
                <li key={acc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-hover">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-fg">{acc.bank_name}</span>
                      {acc.is_default && (
                        <StatusBadge tone="success" icon={<Star size={12} fill="currentColor" aria-hidden />}>
                          Default
                        </StatusBadge>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-fg">{acc.account_number}</div>
                    <div className="text-sm text-fg-muted">a.n. {acc.account_holder}</div>
                    {acc.notes && <div className="mt-0.5 text-xs text-fg-subtle">{acc.notes}</div>}
                  </div>

                  <RowActions
                    label={`Actions for ${acc.bank_name} ${acc.account_number}`}
                    actions={[
                      {
                        label: "Make default",
                        icon: <Star />,
                        onSelect: () => handleSetDefaultAccount(acc.id),
                        hidden: acc.is_default,
                      },
                      { label: "Edit", icon: <Edit2 />, onSelect: () => handleOpenEditAccount(acc) },
                      { label: "Delete", icon: <Trash2 />, onSelect: () => handleDeleteAccount(acc.id), danger: true },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* TOUR LEADERS MANAGEMENT */}
        <Panel
          title={
            <>
              Tour Leaders
              <StatusBadge tone="neutral">{tourLeaders.length} registered</StatusBadge>
            </>
          }
          description="Pre-configured Tour Leaders for quick selection on modem rental orders."
          icon={<UserCheck size={16} />}
          actions={
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleOpenAddTl}>
              <Plus size={14} aria-hidden /> New Tour Leader
            </button>
          }
        >
          {!loading && tourLeaders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-fg-subtle">
              No Tour Leaders yet.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-inset">
              {tourLeaders.map((tl, idx) => (
                <li key={tl.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-fg-muted"
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fg">{tl.name}</div>
                    <div className="truncate text-xs text-fg-subtle">
                      {tl.phone ? <span className="font-mono">{tl.phone}</span> : "—"}
                      {tl.notes && <span> · {tl.notes}</span>}
                    </div>
                  </div>
                  <RowActions
                    label={`Actions for ${tl.name}`}
                    actions={[
                      { label: "Edit", icon: <Edit2 />, onSelect: () => handleOpenEditTl(tl) },
                      { label: "Delete", icon: <Trash2 />, onSelect: () => handleDeleteTl(tl.id), danger: true },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* SYSTEM INVOICING PREFERENCES */}
        <Panel title="Invoicing Preferences" icon={<Sliders size={16} />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label="Invoice Number Prefix"
              htmlFor="settings-prefix"
              hint={
                <>
                  Use {"{YYYY}"} for the current year — e.g. INV-MC{"{YYYY}"}- → INV-MC2026-0001.
                  {form.invoice_prefix && (
                    <>
                      {" "}
                      Next number looks like{" "}
                      <span className="font-mono text-fg-muted">
                        {form.invoice_prefix.replace(/\{YYYY\}/g, String(new Date().getFullYear()))}0001
                      </span>
                    </>
                  )}
                </>
              }
            >
              <TextInput
                id="settings-prefix"
                value={form.invoice_prefix}
                onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
              />
            </Field>
            <Field label="Default PPN Tax Rate (%)" htmlFor="settings-tax-rate">
              <TextInput
                id="settings-tax-rate"
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              />
            </Field>
            <Field label="Payment Terms (days)" htmlFor="settings-terms">
              <TextInput
                id="settings-terms"
                type="number"
                value={form.payment_terms_days}
                onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
              />
            </Field>
          </div>
        </Panel>
      </form>

      {/* MODAL 1: BANK ACCOUNT MODAL */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={editingAccount ? "Edit Bank Account" : "New Bank Account"}
      >
        <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
          <Field label="Bank Name" htmlFor="account-bank" required>
            <TextInput
              id="account-bank"
              placeholder="e.g. Bank BCA / Mandiri / BSI"
              value={accountForm.bank_name}
              onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Account Number" htmlFor="account-number" required>
            <TextInput
              id="account-number"
              placeholder="e.g. 0402434901"
              value={accountForm.account_number}
              onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
              required
            />
          </Field>
          <Field label="Account Holder Name" htmlFor="account-holder" required>
            <TextInput
              id="account-holder"
              placeholder="e.g. Mulyadi"
              value={accountForm.account_holder}
              onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
              required
            />
          </Field>
          <Field label="Additional Instructions (optional)" htmlFor="account-notes">
            <TextArea
              id="account-notes"
              className="min-h-16"
              placeholder="e.g. Please include Invoice # in payment reference"
              value={accountForm.notes}
              onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAccountModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} aria-hidden />
              {editingAccount ? "Save" : "Add Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TOUR LEADER MODAL */}
      <Modal
        isOpen={showTlModal}
        onClose={() => setShowTlModal(false)}
        title={editingTl ? "Edit Tour Leader" : "New Tour Leader"}
      >
        <form onSubmit={handleSaveTl} className="flex flex-col gap-4">
          <Field label="Tour Leader Name" htmlFor="tl-name" required>
            <TextInput
              id="tl-name"
              placeholder="e.g. Komang Sudira"
              value={tlForm.name}
              onChange={(e) => setTlForm({ ...tlForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone Number (optional)" htmlFor="tl-phone">
            <TextInput
              id="tl-phone"
              placeholder="e.g. 081234567890"
              value={tlForm.phone}
              onChange={(e) => setTlForm({ ...tlForm, phone: e.target.value })}
            />
          </Field>
          <Field label="Notes / Region (optional)" htmlFor="tl-notes">
            <TextArea
              id="tl-notes"
              className="min-h-16"
              placeholder="e.g. Specializes in Bali & Lombok tours"
              value={tlForm.notes}
              onChange={(e) => setTlForm({ ...tlForm, notes: e.target.value })}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setShowTlModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} aria-hidden />
              {editingTl ? "Save" : "Add Tour Leader"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
