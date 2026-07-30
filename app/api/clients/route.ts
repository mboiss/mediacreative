import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET CRASH:", err);

    return NextResponse.json(
      [],
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("clients")
      .insert([
        {
          full_name: body.full_name,
          email: body.email,
          phone: body.phone,
          company: body.company,
          address: body.address,
        },
      ])
      .select();

    if (error) {
      console.error("POST ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST CRASH:", err);

    return NextResponse.json(
      { error: "Server crash" },
      { status: 500 }
    );
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, email, phone, company, address } = body;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("clients")
      .update({
        full_name,
        email,
        phone,
        company,
        address,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    // Delete associated invoices & invoice_items to prevent foreign key constraint block
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id")
      .eq("client_id", id);

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((inv) => inv.id);
      await supabase
        .from("invoice_items")
        .delete()
        .in("invoice_id", invoiceIds);

      await supabase
        .from("invoices")
        .delete()
        .eq("client_id", id);
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Delete failed" },
      { status: 500 }
    );
  }
}