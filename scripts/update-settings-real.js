const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function updateRealSettings() {
  const realSettings = {
    id: "default",
    company_name: "Media Creative Studio",
    email: "mediacreative@aol.com",
    phone: "081329924527",
    address: "Jln. Palapa XII No. 6 Sesetan Denpasar - Bali",
    tax_id: "01.234.567.8-012.000",
    invoice_prefix: "INV-2026-",
    tax_rate: "11",
    currency: "IDR (Rp)",
    payment_terms_days: "14"
  };

  console.log("Updating real settings in Supabase...");
  const { data, error } = await supabase.from("app_settings").upsert([realSettings]).select();
  console.log("Result:", { data, error });
}

updateRealSettings().catch(console.error);
