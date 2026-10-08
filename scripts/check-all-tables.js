const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
