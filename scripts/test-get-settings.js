const http = require('http');

async function testGet() {
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase.from("app_settings").select("*").single();
  console.log("Supabase returns Settings:", data);
}

testGet().catch(console.error);
