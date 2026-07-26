"use client";

import { useState, useEffect } from "react";
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
  X,
  UserCheck,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
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
  invoice_prefix: "INV-2026-",
  tax_rate: "11",
  currency: "IDR (Rp)",
  payment_terms_days: "14",
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("media_creative_settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          /* ignore */
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [tourLeaders, setTourLeaders] = useState<TourLeader[]>([]);

  useEffect(() => {
    setPaymentAccounts(getPaymentAccounts());
    setTourLeaders(getTourLeaders());
  }, []);

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

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    setTimeout(() => {
      localStorage.setItem("media_creative_settings", JSON.stringify(form));
      savePaymentAccounts(paymentAccounts);
      saveTourLeaders(tourLeaders);
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 400);
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

  function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountForm.bank_name || !accountForm.account_number || !accountForm.account_holder) {
      alert("Please fill in required bank account fields.");
      return;
    }

    let updated: PaymentAccount[];
    if (editingAccount) {
      updated = paymentAccounts.map((acc) =>
        acc.id === editingAccount.id
          ? {
              ...acc,
              bank_name: accountForm.bank_name.trim(),
              account_number: accountForm.account_number.trim(),
              account_holder: accountForm.account_holder.trim(),
              notes: accountForm.notes.trim() || undefined,
            }
          : acc
      );
    } else {
      const newAcc: PaymentAccount = {
        id: "acc-" + Date.now(),
        bank_name: accountForm.bank_name.trim(),
        account_number: accountForm.account_number.trim(),
        account_holder: accountForm.account_holder.trim(),
        is_default: paymentAccounts.length === 0,
        notes: accountForm.notes.trim() || undefined,
      };
      updated = [...paymentAccounts, newAcc];
    }

    setPaymentAccounts(updated);
    savePaymentAccounts(updated);
    setShowAccountModal(false);
  }

  function handleDeleteAccount(id: string) {
    if (!confirm("Are you sure you want to delete this bank account?")) return;
    const updated = paymentAccounts.filter((a) => a.id !== id);
    setPaymentAccounts(updated);
    savePaymentAccounts(updated);
  }

  function handleSetDefaultAccount(id: string) {
    const updated = paymentAccounts.map((a) => ({
      ...a,
      is_default: a.id === id,
    }));
    setPaymentAccounts(updated);
    savePaymentAccounts(updated);
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

  function handleSaveTl(e: React.FormEvent) {
    e.preventDefault();
    if (!tlForm.name.trim()) {
      alert("Please enter the Tour Leader's name.");
      return;
    }

    let updated: TourLeader[];
    if (editingTl) {
      updated = tourLeaders.map((tl) =>
        tl.id === editingTl.id
          ? {
              ...tl,
              name: tlForm.name.trim(),
              phone: tlForm.phone.trim() || undefined,
              notes: tlForm.notes.trim() || undefined,
            }
          : tl
      );
    } else {
      const newTl: TourLeader = {
        id: "tl-" + Date.now(),
        name: tlForm.name.trim(),
        phone: tlForm.phone.trim() || undefined,
        notes: tlForm.notes.trim() || undefined,
      };
      updated = [...tourLeaders, newTl];
    }

    setTourLeaders(updated);
    saveTourLeaders(updated);
    setShowTlModal(false);
  }

  function handleDeleteTl(id: string) {
    if (!confirm("Are you sure you want to delete this Tour Leader?")) return;
    const updated = tourLeaders.filter((tl) => tl.id !== id);
    setTourLeaders(updated);
    saveTourLeaders(updated);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000 }}>
      {/* HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Settings & System Preferences
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Manage company profile, payment bank accounts, Tour Leaders list, and invoicing defaults.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            "Saving..."
          ) : savedSuccess ? (
            <>
              <CheckCircle2 size={16} /> Saved!
            </>
          ) : (
            <>
              <Save size={16} /> Save Changes
            </>
          )}
        </button>
      </div>

      {savedSuccess && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} /> Settings successfully updated and saved locally.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* COMPANY PROFILE */}
        <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <Building size={20} style={{ color: "var(--accent-cyan)" }} />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Company Profile
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="form-label">Company / Brand Name</label>
              <input
                className="form-input"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Billing Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Contact Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">NPWP / Tax ID</label>
              <input
                className="form-input"
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Office Address</label>
              <textarea
                className="form-input"
                style={{ minHeight: 70, resize: "vertical" }}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* PAYMENT TRANSFER ACCOUNTS MANAGEMENT */}
        <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CreditCard size={20} style={{ color: "var(--accent-cyan)" }} />
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Payment Transfer Accounts
                </h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
                  Configure bank transfer accounts to populate payment instructions on invoices.
                </p>
              </div>
            </div>

            <button type="button" className="btn btn-primary" onClick={handleOpenAddAccount} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
              <Plus size={14} /> Add Bank Account
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {paymentAccounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  background: "var(--bg-glass-hover)",
                  border: `1px solid ${acc.is_default ? "var(--accent-cyan)" : "var(--border)"}`,
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: 6 }}>
                      {acc.bank_name}
                    </span>
                    {acc.is_default ? (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Star size={11} fill="currentColor" /> Primary Account
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAccount(acc.id)}
                        style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Make Default
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "monospace", color: "var(--text-primary)", letterSpacing: "0.03em" }}>
                    {acc.account_number}
                  </div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    a.n. {acc.account_holder}
                  </div>
                  {acc.notes && (
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                      {acc.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleOpenEditAccount(acc)}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button type="button" className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => handleDeleteAccount(acc.id)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOUR LEADERS MANAGEMENT */}
        <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserCheck size={20} style={{ color: "var(--accent-cyan)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Tour Leaders (TL) List
                  </h2>
                  <span style={{ background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                    {tourLeaders.length} Registered
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
                  Manage pre-configured Tour Leaders for quick selection when creating modem rental orders.
                </p>
              </div>
            </div>

            <button type="button" className="btn btn-primary" onClick={handleOpenAddTl} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
              <Plus size={14} /> Add Tour Leader
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {tourLeaders.map((tl, idx) => (
              <div
                key={tl.id}
                style={{
                  background: "var(--bg-glass-hover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                      {tl.name}
                    </div>
                    {tl.phone && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{tl.phone}</div>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 4 }}>
                  <button type="button" className="btn btn-ghost" style={{ padding: "3px 6px" }} onClick={() => handleOpenEditTl(tl)} title="Edit TL">
                    <Edit2 size={12} />
                  </button>
                  <button type="button" className="btn btn-danger" style={{ padding: "3px 6px" }} onClick={() => handleDeleteTl(tl.id)} title="Delete TL">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM INVOICING PREFERENCES */}
        <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <Sliders size={20} style={{ color: "var(--accent-cyan)" }} />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Invoicing Preferences
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label className="form-label">Invoice Number Prefix</label>
              <input
                className="form-input"
                value={form.invoice_prefix}
                onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Default PPN Tax Rate (%)</label>
              <input
                type="number"
                className="form-input"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Payment Terms (Days)</label>
              <input
                type="number"
                className="form-input"
                value={form.payment_terms_days}
                onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
              />
            </div>
          </div>
        </div>
      </form>

      {/* MODAL 1: BANK ACCOUNT MODAL */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={editingAccount ? "Edit Bank Account" : "Add Payment Bank Account"}
      >
        <form onSubmit={handleSaveAccount} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="form-label">Bank Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Bank BCA / Mandiri / BSI"
              value={accountForm.bank_name}
              onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Account Number *</label>
            <input
              className="form-input"
              placeholder="e.g. 0402434901"
              value={accountForm.account_number}
              onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Account Holder Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Mulyadi"
              value={accountForm.account_holder}
              onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Additional Instructions (Optional)</label>
            <textarea
              className="form-input"
              style={{ minHeight: 60, resize: "vertical" }}
              placeholder="e.g. Please include Invoice # in payment reference"
              value={accountForm.notes}
              onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAccountModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              {editingAccount ? "Update Account" : "Save Bank Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TOUR LEADER MODAL */}
      <Modal
        isOpen={showTlModal}
        onClose={() => setShowTlModal(false)}
        title={editingTl ? "Edit Tour Leader" : "Add New Tour Leader"}
      >
        <form onSubmit={handleSaveTl} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="form-label">Tour Leader Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Komang Sudira"
              value={tlForm.name}
              onChange={(e) => setTlForm({ ...tlForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Phone Number (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. 081234567890"
              value={tlForm.phone}
              onChange={(e) => setTlForm({ ...tlForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Notes / Region (Optional)</label>
            <textarea
              className="form-input"
              style={{ minHeight: 60, resize: "vertical" }}
              placeholder="e.g. Specializes in Bali & Lombok tours"
              value={tlForm.notes}
              onChange={(e) => setTlForm({ ...tlForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowTlModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              {editingTl ? "Update Tour Leader" : "Save Tour Leader"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}