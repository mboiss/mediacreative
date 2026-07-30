import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Run all queries in parallel
    const [
      clientsResult,
      invoicesResult,
      revenueResult,
      pendingResult,
    ] = await Promise.all([
      // Total clients
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true }),

      // Total invoices
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true }),

      // Total revenue (paid invoices)
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("status", "Paid"),

      // Pending amount (sent but not paid)
      supabase
        .from("invoices")
        .select("total_amount")
        .in("status", ["Sent", "Draft"]),
    ]);

    const totalRevenue = (revenueResult.data ?? []).reduce(
      (sum, inv) => sum + (inv.total_amount ?? 0),
      0
    );

    const pendingAmount = (pendingResult.data ?? []).reduce(
      (sum, inv) => sum + (inv.total_amount ?? 0),
      0
    );

    return NextResponse.json({
      totalClients: clientsResult.count ?? 0,
      totalInvoices: invoicesResult.count ?? 0,
      totalRevenue,
      pendingAmount,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
