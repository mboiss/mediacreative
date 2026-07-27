import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
  }

  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select(`*, clients(*)`)
    .eq("id", id)
    .single();

  if (invError || !invoice) {
    const status = invError?.code === "PGRST116" || !invoice ? 404 : 500;
    return NextResponse.json(
      { error: invError?.message || "Invoice not found" },
      { status }
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select(`*, products(*)`)
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    invoice,
    items: items ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Build the update payload — only allow specific fields
  const updatePayload: Record<string, unknown> = {};
  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.total_amount !== undefined) updatePayload.total_amount = body.total_amount;
  if (body.notes !== undefined) updatePayload.notes = body.notes;
  if (body.due_date !== undefined) updatePayload.due_date = body.due_date;
  if (body.client_id !== undefined) updatePayload.client_id = body.client_id;
  if (body.invoice_date !== undefined) updatePayload.invoice_date = body.invoice_date;

  const { data, error } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", id)
    .select(`*, clients(*)`)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // First delete all invoice items
  await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", id);

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}