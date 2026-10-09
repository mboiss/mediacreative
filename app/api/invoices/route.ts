import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_INVOICE_PREFIX = "INV-MC{YYYY}-";

/**
 * Next invoice number: the "Invoice Prefix" from Settings followed by a 4-digit running number.
 * "{YYYY}" in the prefix is replaced by the current year, so "INV-MC{YYYY}-" gives INV-MC2026-0001,
 * INV-MC2026-0002, … and automatically INV-MC2027-0001 from 1 January 2027 (numbering restarts per prefix).
 */
async function generateInvoiceNumber(): Promise<string> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("invoice_prefix")
    .eq("id", "default")
    .maybeSingle();
  const template = (settings?.invoice_prefix || "").trim() || DEFAULT_INVOICE_PREFIX;
  const prefix = template.replaceAll("{YYYY}", String(new Date().getFullYear()));

  const { data: existing } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix.replace(/[%_]/g, "\$&")}%`);

  const highest = (existing ?? []).reduce((max, row) => {
    const n = Number.parseInt(String(row.invoice_number).slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

export async function GET() {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      clients (
        full_name,
        company
      ),
      invoice_items (
        total
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Calculate total_amount for each invoice from invoice_items if column isn't present
  const formatted = (data ?? []).map((inv) => {
    const calculated = (inv.invoice_items ?? []).reduce(
      (s: number, item: { total?: number }) => s + (item.total ?? 0),
      0
    );
    return {
      ...inv,
      total_amount: inv.total_amount ?? calculated,
    };
  });

  return NextResponse.json(formatted);
}

/**
 * Helper to ensure an item description exists as a product in the catalog.
 * If not present, automatically creates a new product catalog item.
 */
async function ensureProductExists(description: string, unitPrice: number): Promise<string | null> {
  const trimmed = (description || "").trim();
  if (!trimmed) return null;

  try {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .ilike("product_name", trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const code = "PRD-" + Math.floor(1000 + Math.random() * 9000);
    const { data: created, error } = await supabase
      .from("products")
      .insert([
        {
          product_code: code,
          product_name: trimmed,
          category: "Invoice Item",
          price: Number(unitPrice) || 0,
          cost: 0,
          stock: -1, // Unlimited stock / Service flexible item
          description: "Auto-created from Invoice",
        },
      ])
      .select("id")
      .single();

    if (error || !created) {
      console.error("Failed to auto-create product from invoice item:", error);
      return null;
    }

    return created.id;
  } catch (err) {
    console.error("Error in ensureProductExists:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  const status = body.status || "Draft";
  const items = Array.isArray(body.items) ? body.items : [];

  // 1. Insert invoice using standard columns (guaranteed to exist in DB)
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .insert([
      {
        invoice_number: await generateInvoiceNumber(),
        client_id: body.client_id,
        invoice_date: body.invoice_date,
        due_date: body.due_date || null,
        notes: body.notes || null,
        status: status,
      },
    ])
    .select()
    .single();

  if (invoiceError || !invoiceData) {
    return NextResponse.json(
      { error: invoiceError?.message || "Failed to create invoice" },
      { status: 500 }
    );
  }

  // 2. Insert items into invoice_items if provided and auto-register in Products catalog
  let calculatedTotal = 0;
  if (items.length > 0) {
    const itemRows = [];

    for (const it of items) {
      const q = Number(it.quantity) || 1;
      const p = Number(it.unit_price) || 0;
      const t = q * p;
      calculatedTotal += t;

      const desc = it.description || "Line Item";
      const productId = it.product_id || (await ensureProductExists(desc, p));

      itemRows.push({
        invoice_id: invoiceData.id,
        product_id: productId,
        description: desc,
        quantity: q,
        unit_price: p,
        total: t,
      });
    }

    if (body.tax_percent) {
      calculatedTotal += calculatedTotal * (Number(body.tax_percent) / 100);
    }
    if (body.discount_amount) {
      calculatedTotal = Math.max(0, calculatedTotal - Number(body.discount_amount));
    }

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemRows);

    if (itemsError) {
      console.error("Error inserting invoice items:", itemsError);
    }

    // Try updating total_amount column if it exists in schema (ignore if missing)
    try {
      await supabase
        .from("invoices")
        .update({ total_amount: calculatedTotal })
        .eq("id", invoiceData.id);
    } catch (e) {
      console.warn("total_amount column not present on invoices table, skipping update");
    }
  }

  return NextResponse.json({ ...invoiceData, total_amount: calculatedTotal });
}