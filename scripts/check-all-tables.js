const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

const tables = [
  "modems",
  "tour_rental_logs",
  "tour_leaders",
  "esim_profiles",
  "payment_accounts",
  "app_settings",
  "invoices",
  "invoice_items",
  "clients",
  "products"
];

async function check() {
  console.log("Checking all tables in Supabase...");
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`❌ Table '${t}':`, error.message);
    } else {
      console.log(`✅ Table '${t}': EXISTS (Rows: ${data?.length})`);
    }
  }
}

check().catch(console.error);
