import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonNoCache } from "@/lib/api-utils";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SETTINGS = {
  id: "default",
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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "default")
      .single();

    if (!error && data) {
      writeJsonStore("settings.json", data);
      return jsonNoCache(data);
    }
  } catch (err) {
    console.warn("Supabase settings query skipped/failed, using local store:", err);
  }

  const localData = readJsonStore("settings.json", DEFAULT_SETTINGS);
  return jsonNoCache(localData);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payload = {
      id: "default",
      company_name: body.company_name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      tax_id: body.tax_id,
      invoice_prefix: body.invoice_prefix,
      tax_rate: body.tax_rate,
      currency: body.currency,
      payment_terms_days: body.payment_terms_days,
    };

    // Dual write to local store
    writeJsonStore("settings.json", payload);

    // Try saving to Supabase if table exists
    try {
      await supabase.from("app_settings").upsert([payload]);
    } catch (e) {
      console.warn("Supabase settings write skipped:", e);
    }

    return jsonNoCache(payload);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Save settings failed" }, 500);
  }
}
