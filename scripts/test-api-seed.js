const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function check() {
  console.log("Checking Supabase tables readiness...");
  const { data: mData, error: mErr } = await supabase.from("modems").select("count");
  console.log("Modems table status:", { count: mData, error: mErr });

  const { data: sData, error: sErr } = await supabase.from("app_settings").select("*");
  console.log("Settings table status:", { data: sData, error: sErr });
}

check().catch(console.error);
