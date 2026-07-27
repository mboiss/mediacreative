import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

function generateInvoiceNumber() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `INV-${year}${month}-${random}`;
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

export async function POST(request: Request) {
  const body = await request.json();

  const status = body.status || "Draft";
  const items = Array.isArray(body.items) ? body.items : [];

  // 1. Insert invoice using standard columns (guaranteed to exist in DB)
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .insert([
      {
        invoice_number: generateInvoiceNumber(),
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

  // 2. Insert items into invoice_items if provided
  let calculatedTotal = 0;
  if (items.length > 0) {
    const itemRows = items.map((it: { product_id?: string; description?: string; quantity?: number; unit_price?: number }) => {
      const q = Number(it.quantity) || 1;
      const p = Number(it.unit_price) || 0;
      const t = q * p;
      calculatedTotal += t;
      return {
        invoice_id: invoiceData.id,
        product_id: it.product_id || null,
        description: it.description || "Line Item",
        quantity: q,
        unit_price: p,
        total: t,
      };
    });

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