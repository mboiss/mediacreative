const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

const INITIAL_PROFILES = [
  {
    id: "esim-01",
    iccid: "8988211004928192831F",
    package_name: "Global Ultra 5G (50GB)",
    region: "Global (120+ Countries)",
    data_gb: 50,
    price: 650000,
    user_name: "Media Crew - Field Ops",
    activation_code: "LPA:1$rsp.global-esim.net$MC-8921-9921",
    status: "Active",
    expiry_date: "2026-08-30",
  },
  {
    id: "esim-02",
    iccid: "8988211004928192832F",
    package_name: "Asia-Pacific Unlimited (10GB)",
    region: "Asia Pacific",
    data_gb: 10,
    price: 250000,
    user_name: "Rizky Event Photographer",
    activation_code: "LPA:1$rsp.asia-esim.com$MC-4410-1092",
    status: "Active",
    expiry_date: "2026-08-15",
  },
  {
    id: "esim-03",
    iccid: "8988211004928192833F",
    package_name: "Indonesia Premier 5G (20GB)",
    region: "Indonesia Domestic",
    data_gb: 20,
    price: 180000,
    user_name: "Client Live Streamer",
    activation_code: "LPA:1$rsp.telkomsel-esim.id$MC-0012-9812",
    status: "Expired",
    expiry_date: "2026-07-20",
  },
];

async function seedEsim() {
  console.log("Seeding eSIM profiles into Supabase...");
  const { data, error } = await supabase.from("esim_profiles").upsert(INITIAL_PROFILES).select();
  console.log("eSIM seed result:", { data, error });
}

seedEsim().catch(console.error);
