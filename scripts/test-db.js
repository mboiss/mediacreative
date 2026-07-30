const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

async function test() {
  console.log("=== MODEMS TABLE TEST ===");
  const { data: modems, error: mErr } = await supabase.from("modems").select("*").limit(5);
  console.log("Modems count:", modems?.length, "Error:", mErr);

  console.log("\n=== APP_SETTINGS TABLE TEST ===");
  const { data: settings, error: sErr } = await supabase.from("app_settings").select("*");
  console.log("Settings data:", settings, "Error:", sErr);
}

test().catch(console.error);
