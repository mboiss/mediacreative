const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

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
