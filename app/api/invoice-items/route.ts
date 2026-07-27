import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Recalculates and updates the invoice total_amount
 * based on current invoice_items.
 */
async function recalculateInvoiceTotal(invoiceId: string) {
  const { data: items } = await supabase
    .from("invoice_items")
    .select("total")
    .eq("invoice_id", invoiceId);

  const total = (items ?? []).reduce(
    (sum, item) => sum + (item.total ?? 0),
    0
  );

  try {
    await supabase
      .from("invoices")
      .update({ total_amount: total })
      .eq("id", invoiceId);
  } catch (e) {
    // total_amount column may not exist in DB schema; safe to ignore
    console.warn("Could not update total_amount on invoices table:", e);
  }

  return total;
}

export async function POST(request: Request) {
  const body = await request.json();

  const quantity = Number(body.quantity) || 0;
  const unitPrice = Number(body.unit_price) || 0;
  const total = quantity * unitPrice;
  const description = (body.description || "").trim();

  let productId = body.product_id || null;

  if (!productId && description) {
    try {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .ilike("product_name", description)
        .limit(1);

      if (existing && existing.length > 0) {
        productId = existing[0].id;
      } else {
        const code = "PRD-" + Math.floor(1000 + Math.random() * 9000);
        const { data: created } = await supabase
          .from("products")
          .insert([
            {
              product_code: code,
              product_name: description,
              category: "Invoice Item",
              price: unitPrice,
              cost: 0,
              stock: -1,
              description: "Auto-created from Invoice Item",
            },
          ])
          .select("id")
          .single();
        if (created) productId = created.id;
      }
    } catch (e) {
      console.error("Error auto-creating product in invoice-items route:", e);
    }
  }

  const { data, error } = await supabase
    .from("invoice_items")
    .insert([
      {
        invoice_id: body.invoice_id,
        product_id: productId,
        description: description || null,
        quantity,
        unit_price: unitPrice,
        total,
      },
    ])
    .select(`*, products(*)`)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Recalculate invoice total
  const newTotal = await recalculateInvoiceTotal(body.invoice_id);

  return NextResponse.json({ item: data, invoiceTotal: newTotal });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { id, invoice_id } = body;

  const { error } = await supabase
    .from("invoice_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Recalculate invoice total after deletion
  const newTotal = await recalculateInvoiceTotal(invoice_id);

  return NextResponse.json({ success: true, invoiceTotal: newTotal });
}