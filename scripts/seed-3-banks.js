const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

const THREE_BANKS = [
  {
    id: "acc_bca",
    bank_name: "BCA",
    account_number: "0402434901",
    account_holder: "Mulyadi",
    is_default: true,
  },
  {
    id: "acc_mandiri",
    bank_name: "Bank Mandiri",
    account_number: "137-00-1234567-8",
    account_holder: "Media Creative",
    is_default: false,
  },
  {
    id: "acc_uob",
    bank_name: "Bank UOB",
    account_number: "301-301-123-4",
    account_holder: "Media Creative",
    is_default: false,
  },
];

async function seedBanks() {
  console.log("Seeding BCA, Mandiri, and UOB into Supabase payment_accounts...");
  
  // Clear old entries
  await supabase.from("payment_accounts").delete().neq("id", "dummy");

  const { data, error } = await supabase.from("payment_accounts").upsert(THREE_BANKS).select();
  console.log("Result:", { data, error });
}

seedBanks().catch(console.error);
