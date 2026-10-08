const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.from("app_settings").select("*");
  console.log("App Settings in Supabase:", { data, error });
}

check();
