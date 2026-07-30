"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Trash2, Package, Loader2, Tag, Edit2, Wrench, Box, TrendingUp } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

type Product = {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
};

// Helper: determine if an item is a Service vs Goods
function isServiceItem(p: Product): boolean {
  if (p.stock === -1) return true;
  const cat = (p.category || "").toLowerCase();
  return cat.includes("jasa") || cat.includes("service");
}

const EMPTY_FORM = {
  is_service: false,
  product_code: "",
  product_name: "",
  category: "",
  price: "",
  cost: "",
  stock: "10",
  description: "",
};

function formatCurrency(amount: number) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "goods" | "service">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadProducts, { tables: ["products"] });

  function openCreateModal(defaultService = false) {
    setEditingProduct(null);
    setForm({
      ...EMPTY_FORM,
      is_service: defaultService,
      category: defaultService ? "Service" : "",
      stock: defaultService ? "-1" : "10",
    });
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    const isSvc = isServiceItem(product);
    setEditingProduct(product);
    setForm({
      is_service: isSvc,
      product_code: product.product_code || "",
      product_name: product.product_name || "",
      category: product.category || "",
      price: String(product.price ?? 0),
      cost: String(product.cost ?? 0),
      stock: String(product.stock ?? 0),
      description: product.description || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = !!editingProduct;
      const stockVal = form.is_service ? -1 : Number(form.stock || 0);
      const costVal = form.is_service ? 0 : Number(form.cost || 0);

      const res = await fetch("/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingProduct.id } : {}),
          product_code: form.product_code,
          product_name: form.product_name,
          category: form.category || (form.is_service ? "Service" : "General"),
          price: Number(form.price || 0),
          cost: costVal,
          stock: stockVal,
          description: form.description,
        }),
      });

      if (res.ok) {
        setForm({ ...EMPTY_FORM });
        setEditingProduct(null);
        setShowModal(false);
        await loadProducts();
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || `Failed to ${isEdit ? "update" : "add"} product`));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product / service item?")) return;
    setDeletingId(id);
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  // Filter products by tab and search
  const filtered = products.filter((p) => {
    const isSvc = isServiceItem(p);
    if (activeTab === "goods" && isSvc) return false;
    if (activeTab === "service" && !isSvc) return false;

    const q = search.toLowerCase();
    return (
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const goodsList = products.filter((p) => !isServiceItem(p));
  const servicesList = products.filter((p) => isServiceItem(p));
  const inStockCount = goodsList.filter((p) => p.stock > 0).length;

  // Margin calculation for form preview
  const formPrice = Number(form.price || 0);
  const formCost = Number(form.cost || 0);
  const formProfit = formPrice - formCost;
  const formMarginPct = formPrice > 0 ? ((formProfit / formPrice) * 100).toFixed(1) : "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* HEADER */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Products & Services Catalog
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Manage physical inventory and service offerings in a unified catalog.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => openCreateModal(true)}>
            <Wrench size={16} style={{ color: "#a78bfa" }} />
            + Add Service
          </button>
          <button className="btn btn-primary" onClick={() => openCreateModal(false)}>
            <Plus size={16} />
            + Add Product
          </button>
        </div>
      </div>

      {/* STATS SUMMARY */}
      {products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ padding: "14px 18px", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Catalog</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{products.length} Items</div>
            </div>
          </div>

          <div style={{ padding: "14px 18px", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Physical Goods</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {goodsList.length} <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>({inStockCount} In Stock)</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "14px 18px", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(167, 139, 250, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wrench size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Services</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{servicesList.length} Services</div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        {/* TABS */}
        <div style={{ display: "flex", gap: 6, background: "rgba(15, 23, 42, 0.6)", padding: 4, borderRadius: 12, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "all" ? "var(--accent-primary, #3b82f6)" : "transparent",
              color: activeTab === "all" ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("goods")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "goods" ? "#10b981" : "transparent",
              color: activeTab === "goods" ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            📦 Physical Goods ({goodsList.length})
          </button>
          <button
            onClick={() => setActiveTab("service")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "service" ? "#8b5cf6" : "transparent",
              color: activeTab === "service" ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            🛠️ Services ({servicesList.length})
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search code, name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--text-secondary)" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            Loading catalog...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title={search ? "No items found" : "Catalog is empty"}
            description={search ? "Try searching with a different keyword." : "Get started by adding your physical goods or services."}
            action={
              !search ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" onClick={() => openCreateModal(false)}>
                    <Plus size={14} /> Add Product
                  </button>
                  <button className="btn btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => openCreateModal(true)}>
                    <Wrench size={14} /> Add Service
                  </button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Cost Price</th>
                  <th style={{ textAlign: "right" }}>Selling Price</th>
                  <th style={{ textAlign: "right" }}>Est. Margin</th>
                  <th style={{ textAlign: "right" }}>Stock</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isSvc = isServiceItem(product);
                  const cost = Number(product.cost || 0);
                  const price = Number(product.price || 0);
                  const profit = price - cost;
                  const marginPct = price > 0 && cost > 0 ? ((profit / price) * 100).toFixed(0) : null;

                  return (
                    <tr key={product.id}>
                      {/* TYPE BADGE */}
                      <td>
                        {isSvc ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", fontSize: "0.72rem", color: "#c4b5fd", fontWeight: 700 }}>
                            <Wrench size={11} /> Service
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.72rem", color: "#6ee7b7", fontWeight: 700 }}>
                            <Box size={11} /> Goods
                          </span>
                        )}
                      </td>

                      {/* CODE */}
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                          {product.product_code || "—"}
                        </span>
                      </td>

                      {/* NAME */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{product.product_name}</div>
                        {product.description && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>{product.description}</div>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td>
                        {product.category ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
                            <Tag size={10} />
                            {product.category}
                          </span>
                        ) : (
                          <span style={{ color: "#4a6080" }}>—</span>
                        )}
                      </td>

                      {/* COST PRICE */}
                      <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {isSvc ? <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>N/A (Service)</span> : formatCurrency(cost)}
                      </td>

                      {/* SELLING PRICE */}
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatCurrency(price)}
                      </td>

                      {/* EST. MARGIN */}
                      <td style={{ textAlign: "right" }}>
                        {isSvc ? (
                          <span style={{ fontSize: "0.75rem", color: "#a78bfa", fontWeight: 600 }}>100% Service</span>
                        ) : marginPct !== null ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: profit >= 0 ? "#34d399" : "#f87171" }}>
                              +{formatCurrency(profit)}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{marginPct}% margin</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>

                      {/* STOCK */}
                      <td style={{ textAlign: "right" }}>
                        {isSvc ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            Unlimited
                          </span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: "0.8rem",
                              background: product.stock > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                              color: product.stock > 0 ? "#34d399" : "#f87171",
                            }}
                          >
                            {product.stock} pcs
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                            onClick={() => openEditModal(product)}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                            onClick={() => deleteProduct(product.id)}
                            disabled={deletingId === product.id}
                          >
                            {deletingId === product.id ? (
                              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? "Edit Catalog Item" : "Add New Item"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TYPE TOGGLE BUTTONS */}
          <div>
            <label className="form-label" style={{ marginBottom: 6 }}>Item Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_service: false, stock: form.stock === "-1" ? "10" : form.stock })}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: !form.is_service ? "2px solid #10b981" : "1px solid var(--border)",
                  background: !form.is_service ? "rgba(16, 185, 129, 0.12)" : "rgba(15, 23, 42, 0.4)",
                  color: !form.is_service ? "#34d399" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Box size={16} /> Physical Goods
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, is_service: true, stock: "-1", cost: "0" })}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: form.is_service ? "2px solid #8b5cf6" : "1px solid var(--border)",
                  background: form.is_service ? "rgba(139, 92, 246, 0.12)" : "rgba(15, 23, 42, 0.4)",
                  color: form.is_service ? "#c4b5fd" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Wrench size={16} /> Service Offering
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Item Code / SKU</label>
              <input
                className="form-input"
                placeholder={form.is_service ? "SVC-001" : "PRD-001"}
                value={form.product_code}
                onChange={(e) => setForm({ ...form, product_code: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <input
                className="form-input"
                placeholder={form.is_service ? "e.g. Design, Video, Consulting" : "e.g. Electronics, Accessories"}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Item Name *</label>
              <input
                className="form-input"
                placeholder={form.is_service ? "e.g. Logo Design & Branding Package" : "e.g. Pro Aluminum Camera Tripod"}
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                required
              />
            </div>

            {/* COST PRICE (GOODS ONLY) */}
            {!form.is_service && (
              <div>
                <label className="form-label">Cost Price / HPP (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            )}

            {/* SELLING PRICE */}
            <div style={{ gridColumn: form.is_service ? "1 / -1" : undefined }}>
              <label className="form-label">Selling Price (Rp) *</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="1000"
                placeholder="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>

            {/* STOCK (GOODS ONLY) */}
            {!form.is_service && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Stock Quantity (Pcs/Units) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required
                />
              </div>
            )}

            {/* DESCRIPTION / NOTES */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Description / Scope Details (Optional)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder={form.is_service ? "Scope of work (e.g., 3x revisions, source files included)" : "Item specifications or internal notes..."}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* LIVE MARGIN PREVIEW FOR GOODS */}
          {!form.is_service && formPrice > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34d399", fontWeight: 600 }}>
                <TrendingUp size={14} /> Est. Profit per Unit:
              </div>
              <div style={{ fontWeight: 800, color: formProfit >= 0 ? "#34d399" : "#f87171" }}>
                {formatCurrency(formProfit)} ({formMarginPct}% margin)
              </div>
            </div>
          )}

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              {saving ? "Saving..." : editingProduct ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}