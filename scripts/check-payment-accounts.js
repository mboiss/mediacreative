const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.from("payment_accounts").select("*");
  console.log("Payment Accounts in Supabase:", { data, error });
}

check().catch(console.error);
