"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Trash2, Package, Loader2, Tag, Edit2, Wrench, Box, TrendingUp, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, TableWrap } from "@/components/ui/data-table";
import { Field, SearchInput, TextArea, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { MobileList, ListCard } from "@/components/ui/list-card";

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

export default function ProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
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
        toast.success(isEdit ? "Item Updated" : "Item Added", `${form.product_name} saved successfully.`);
        await loadProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(isEdit ? "Update Failed" : "Add Failed", err.error || `Failed to ${isEdit ? "update" : "add"} item.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    const product = products.find((p) => p.id === id);
    if (
      !(await confirm({
        title: "Delete item?",
        message: `${product?.product_name ? `"${product.product_name}"` : "This product / service item"} will be permanently removed from the catalog.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Item Deleted", "Removed from the catalog.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Delete Failed", err.error || "Could not delete item.");
      }
      await loadProducts();
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not connect to server.");
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

  const { pageItems, page, setPage, pageSize, setPageSize, totalPages, totalItems } = usePagination(
    filtered,
    `${activeTab}|${search}`
  );

  const productActions = (product: Product): RowAction[] => [
    { label: "Edit", icon: <Edit2 />, onSelect: () => openEditModal(product) },
    {
      label: deletingId === product.id ? "Deleting..." : "Delete",
      icon: deletingId === product.id ? <Loader2 className="animate-spin" /> : <Trash2 />,
      onSelect: () => deleteProduct(product.id),
      disabled: deletingId === product.id,
      danger: true,
    },
  ];

  // Calculate statistics
  const goodsList = products.filter((p) => !isServiceItem(p));
  const servicesList = products.filter((p) => isServiceItem(p));
  const inStockCount = goodsList.filter((p) => p.stock > 0).length;

  // Margin calculation for form preview
  const formPrice = Number(form.price || 0);
  const formCost = Number(form.cost || 0);
  const formProfit = formPrice - formCost;
  const formMarginPct = formPrice > 0 ? ((formProfit / formPrice) * 100).toFixed(1) : "0";

  const tabs: { key: "all" | "goods" | "service"; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: "all", label: "All", count: products.length },
    { key: "goods", label: "Physical Goods", count: goodsList.length, icon: <Box size={14} aria-hidden /> },
    { key: "service", label: "Services", count: servicesList.length, icon: <Wrench size={14} aria-hidden /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products & Services"
        description="Manage physical inventory and service offerings in one catalog."
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => openCreateModal(true)}>
              <Wrench size={16} className="text-purple" aria-hidden />
              New Service
            </button>
            <button className="btn btn-primary" onClick={() => openCreateModal(false)}>
              <Plus size={16} aria-hidden />
              New Product
            </button>
          </>
        }
      />

      {/* STATS SUMMARY */}
      {products.length > 0 && (
        <StatGrid className="lg:grid-cols-3">
          <StatCard label="Total Catalog" value={`${products.length} items`} icon={<Package size={20} />} tone="info" />
          <StatCard
            label="Physical Goods"
            value={goodsList.length}
            hint={`${inStockCount} in stock`}
            icon={<Box size={20} />}
            tone="success"
          />
          <StatCard label="Services" value={servicesList.length} icon={<Wrench size={20} />} tone="purple" />
        </StatGrid>
      )}

      <Panel padded={false}>
        {/* FILTER TABS & SEARCH */}
        <div className="border-b border-line p-4">
          <FilterBar className="justify-between">
            <div
              role="tablist"
              aria-label="Item type"
              className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-inset p-1"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3 py-1.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-accent-border bg-accent-bg text-accent"
                        : "border-transparent text-fg-muted hover:bg-surface-hover hover:text-fg"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className="text-xs font-medium opacity-80">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            <SearchInput
              icon={<Search size={16} />}
              className="w-full sm:w-auto sm:max-w-xs"
              placeholder="Search code, name, category..."
              aria-label="Search catalog"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterBar>
        </div>

        {loading ? (
          <LoadingState label="Loading catalog..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title={search ? "No items found" : "Catalog is empty"}
            description={search ? "Try searching with a different keyword." : "Get started by adding your physical goods or services."}
            action={
              !search ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn btn-primary" onClick={() => openCreateModal(false)}>
                    <Plus size={16} aria-hidden /> New Product
                  </button>
                  <button className="btn btn-ghost" onClick={() => openCreateModal(true)}>
                    <Wrench size={16} aria-hidden /> New Service
                  </button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
          <TableWrap className="hidden md:block">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="text-right!">Cost Price</th>
                  <th className="text-right!">Selling Price</th>
                  <th className="text-right!">Est. Margin</th>
                  <th className="text-right!">Stock</th>
                  <th className="text-right!"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => {
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
                          <StatusBadge tone="purple" icon={<Wrench size={12} aria-hidden />}>
                            Service
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="success" icon={<Box size={12} aria-hidden />}>
                            Goods
                          </StatusBadge>
                        )}
                      </td>

                      {/* CODE */}
                      <td>
                        {product.product_code ? (
                          <span className="whitespace-nowrap rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-xs text-fg-muted">
                            {product.product_code}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>

                      {/* NAME */}
                      <td className="min-w-48">
                        <div className="font-semibold text-fg">{product.product_name}</div>
                        {product.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{product.description}</div>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td>
                        {product.category ? (
                          <StatusBadge tone="neutral" icon={<Tag size={12} aria-hidden />}>
                            {product.category}
                          </StatusBadge>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>

                      {/* COST PRICE */}
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {isSvc ? <span className="text-xs text-fg-subtle">N/A</span> : formatRupiah(cost)}
                      </td>

                      {/* SELLING PRICE */}
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums text-fg">{formatRupiah(price)}</td>

                      {/* EST. MARGIN */}
                      <td className="whitespace-nowrap text-right">
                        {isSvc ? (
                          <span className="text-xs font-semibold text-purple">Service</span>
                        ) : marginPct !== null ? (
                          <div className="flex flex-col items-end">
                            <span className={cn("text-sm font-semibold", profit >= 0 ? "text-success" : "text-danger")}>
                              {profit >= 0 ? "+" : ""}{formatRupiah(profit)}
                            </span>
                            <span className="text-xs text-fg-subtle">{marginPct}% margin</span>
                          </div>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>

                      {/* STOCK */}
                      <td className="text-right">
                        {isSvc ? (
                          <span className="text-xs italic text-fg-subtle">Unlimited</span>
                        ) : (
                          <StatusBadge tone={product.stock > 0 ? "success" : "danger"}>{product.stock} pcs</StatusBadge>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="text-right">
                        <RowActions label={`Actions for ${product.product_name}`} actions={productActions(product)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          <MobileList>
            {pageItems.map((product) => {
              const isSvc = isServiceItem(product);
              return (
                <ListCard
                  key={product.id}
                  title={product.product_name}
                  subtitle={[product.product_code, product.category].filter(Boolean).join(" · ") || undefined}
                  value={formatRupiah(Number(product.price || 0))}
                  meta={
                    isSvc ? (
                      <StatusBadge tone="purple" icon={<Wrench size={12} aria-hidden />}>
                        Service
                      </StatusBadge>
                    ) : (
                      <>
                        <StatusBadge tone="success" icon={<Box size={12} aria-hidden />}>
                          Goods
                        </StatusBadge>
                        <StatusBadge tone={product.stock > 0 ? "success" : "danger"}>{product.stock} pcs</StatusBadge>
                        {Number(product.cost || 0) > 0 && (
                          <span className="tabular-nums">Cost {formatRupiah(Number(product.cost || 0))}</span>
                        )}
                      </>
                    )
                  }
                  actions={<RowActions label={`Actions for ${product.product_name}`} actions={productActions(product)} />}
                />
              );
            })}
          </MobileList>
          </>
        )}
        {!loading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Panel>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? "Edit Catalog Item" : "New Catalog Item"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* TYPE TOGGLE BUTTONS */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Item Type<span className="ml-0.5 text-danger">*</span>
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={!form.is_service}
                onClick={() => setForm({ ...form, is_service: false, stock: form.stock === "-1" ? "10" : form.stock })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  !form.is_service
                    ? "border-success-border bg-success-bg text-success ring-1 ring-success"
                    : "border-line bg-inset text-fg-muted hover:bg-surface-hover hover:text-fg"
                )}
              >
                <Box size={16} aria-hidden /> Physical Goods
              </button>

              <button
                type="button"
                aria-pressed={form.is_service}
                onClick={() => setForm({ ...form, is_service: true, stock: "-1", cost: "0" })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  form.is_service
                    ? "border-purple-border bg-purple-bg text-purple ring-1 ring-purple"
                    : "border-line bg-inset text-fg-muted hover:bg-surface-hover hover:text-fg"
                )}
              >
                <Wrench size={16} aria-hidden /> Service Offering
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Item Code / SKU" htmlFor="product-code">
              <TextInput
                id="product-code"
                placeholder={form.is_service ? "SVC-001" : "PRD-001"}
                value={form.product_code}
                onChange={(e) => setForm({ ...form, product_code: e.target.value })}
              />
            </Field>
            <Field label="Category" htmlFor="product-category">
              <TextInput
                id="product-category"
                placeholder={form.is_service ? "e.g. Design, Video, Consulting" : "e.g. Electronics, Accessories"}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>

            <Field label="Item Name" htmlFor="product-name" required className="sm:col-span-2">
              <TextInput
                id="product-name"
                placeholder={form.is_service ? "e.g. Logo Design & Branding Package" : "e.g. Pro Aluminum Camera Tripod"}
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                required
              />
            </Field>

            {/* COST PRICE (GOODS ONLY) */}
            {!form.is_service && (
              <Field label="Cost Price / HPP (Rp)" htmlFor="product-cost">
                <TextInput
                  id="product-cost"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </Field>
            )}

            {/* SELLING PRICE */}
            <Field
              label="Selling Price (Rp)"
              htmlFor="product-price"
              required
              className={form.is_service ? "sm:col-span-2" : undefined}
            >
              <TextInput
                id="product-price"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>

            {/* STOCK (GOODS ONLY) */}
            {!form.is_service && (
              <Field label="Stock Quantity (pcs/units)" htmlFor="product-stock" required className="sm:col-span-2">
                <TextInput
                  id="product-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required
                />
              </Field>
            )}

            {/* DESCRIPTION / NOTES */}
            <Field label="Description / Scope (optional)" htmlFor="product-description" className="sm:col-span-2">
              <TextArea
                id="product-description"
                rows={2}
                className="min-h-16"
                placeholder={form.is_service ? "Scope of work (e.g., 3x revisions, source files included)" : "Item specifications or internal notes..."}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>

          {/* LIVE MARGIN PREVIEW FOR GOODS */}
          {!form.is_service && formPrice > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-success-border bg-success-bg px-3.5 py-2.5 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-success">
                <TrendingUp size={14} aria-hidden /> Est. profit per unit
              </div>
              <div className={cn("font-bold", formProfit >= 0 ? "text-success" : "text-danger")}>
                {formatRupiah(formProfit)} ({formMarginPct}% margin)
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowModal(false);
                setForm({ ...EMPTY_FORM });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : editingProduct ? (
                <Save size={16} aria-hidden />
              ) : (
                <Plus size={16} aria-hidden />
              )}
              {saving ? "Saving..." : editingProduct ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
