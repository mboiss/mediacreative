import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Shown only until settings are saved for the first time.
const DEFAULT_SETTINGS = {
  id: "default",
  company_name: "Media Creative Studio",
  email: "billing@mediacreative.co.id",
  phone: "+62 812-3456-7890",
  address: "Jl. Sudirman No. 88, Jakarta Selatan 12190",
  tax_id: "01.234.567.8-012.000",
  invoice_prefix: "INV-MC{YYYY}-",
  tax_rate: "11",
  currency: "IDR (Rp)",
  payment_terms_days: "14",
};

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("app_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return jsonNoCache(data ?? DEFAULT_SETTINGS);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load settings") }, 500);
  }
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

    const { data, error } = await getSupabaseAdmin().from("app_settings").upsert([payload]).select().single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Save settings failed") }, 500);
  }
}
