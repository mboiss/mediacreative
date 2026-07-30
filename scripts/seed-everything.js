const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

// 1. MODEMS
const INITIAL_MODEMS = [
  { id: "modem-1", device_name: "Orbitmifi_6DF6", number: "081329926886", ssid: "Media Creative 1", password: "MC1#2026", status: "Available" },
  { id: "modem-2", device_name: "Orbitmifi_6DE3", number: "081329926880", ssid: "Media Creative 2", password: "MC2#2026", status: "Available" },
  { id: "modem-3", device_name: "Orbitmifi_4F0A", number: "081264515945", ssid: "Media Creative 3", password: "MC3#2026", status: "Rented", remark: "AIL260716 (TL: Bram Idrus)" },
  { id: "modem-4", device_name: "Orbitmifi_47E7", number: "081398703478", ssid: "Media Creative 4", password: "MC4#2026", status: "Available" },
  { id: "modem-5", device_name: "Orbitmifi_56A5", number: "081398703256", ssid: "Media Creative 5", password: "MC5#2026", status: "Available" },
  { id: "modem-6", device_name: "Orbitmifi_7180", number: "081398733229", ssid: "Media Creative 6", password: "MC6#2026", status: "Available" },
  { id: "modem-7", device_name: "Orbitmifi_6A80", number: "081329924435", ssid: "Media Creative 7", password: "MC7#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-8", device_name: "Orbitmifi_6DF0", number: "081345343604", ssid: "Media Creative 8", password: "MC8#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-9", device_name: "Orbitmifi_6CC0", number: "081329924527", ssid: "Media Creative 9", password: "MC9#2026", status: "Available" },
  { id: "modem-10", device_name: "Orbitmifi_6A92", number: "081329924439", ssid: "Media Creative 10", password: "MC10#2026", status: "Available" },
  { id: "modem-11", device_name: "Orbitmifi_47D5", number: "081398703423", ssid: "Media Creative 11", password: "MC11#2026", status: "Available" },
  { id: "modem-12", device_name: "Orbitmifi_57FD", number: "081398703258", ssid: "Media Creative 12", password: "MC12#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-13", device_name: "Orbitmifi_58C5", number: "081264516147", ssid: "Media Creative 13", password: "MC13#2026", status: "Available" },
  { id: "modem-14", device_name: "Orbitmifi_58F4", number: "081264515938", ssid: "Media Creative 14", password: "MC14#2026", status: "Available" },
  { id: "modem-15", device_name: "Orbitmifi_7021", number: "081232919331", ssid: "Media Creative 15", password: "MC15#2026", status: "Available" },
  { id: "modem-16", device_name: "Orbitmifi_58D8", number: "081264515931", ssid: "Media Creative 16", password: "MC16#2026", status: "Available" },
  { id: "modem-17", device_name: "Orbitmifi_5976", number: "081264515948", ssid: "Media Creative 17", password: "MC17#2026", status: "Available" },
  { id: "modem-18", device_name: "Orbitmifi_588D", number: "081264515947", ssid: "Media Creative 18", password: "MC18#2026", status: "Available" },
  { id: "modem-19", device_name: "Orbitmifi_5A36", number: "081264515950", ssid: "Media Creative 19", password: "MC19#2026", status: "Rented", remark: "FID260730 (TL: Sofyan)" },
  { id: "modem-20", device_name: "Orbitmifi_587A", number: "081264515935", ssid: "Media Creative 20", password: "MC20#2026", status: "Available" },
  { id: "modem-21", device_name: "Orbitmifi_5941", number: "081264515971", ssid: "Media Creative 21", password: "MC21#2026", status: "Rented", remark: "FID260730 (TL: Sofyan)" },
  { id: "modem-22", device_name: "Orbitmifi_5946", number: "081264516146", ssid: "Media Creative 22", password: "MC22#2026", status: "Available" },
  { id: "modem-23", device_name: "Orbitmifi_5031", number: "081264515951", ssid: "Media Creative 23", password: "MC23#2026", status: "Available" },
  { id: "modem-24", device_name: "Orbitmifi_70A6", number: "081398733261", ssid: "Media Creative 24", password: "MC24#2026", status: "Available" },
  { id: "modem-25", device_name: "Orbitmifi_48C4", number: "081398734462", ssid: "Media Creative 25", password: "MC25#2026", status: "Available" },
  { id: "modem-26", device_name: "Orbitmifi_499B", number: "081232918904", ssid: "Media Creative 26", password: "MC26#2026", status: "Available" },
  { id: "modem-27", device_name: "Orbitmifi_4A10", number: "081232918901", ssid: "Media Creative 27", password: "MC27#2026", status: "Available" },
  { id: "modem-28", device_name: "Orbitmifi_4947", number: "081398734440", ssid: "Media Creative 28", password: "MC28#2026", status: "Available" },
  { id: "modem-29", device_name: "Orbitmifi_4987", number: "081232918902", ssid: "Media Creative 29", password: "MC29#2026", status: "Available" },
  { id: "modem-30", device_name: "Orbitmifi_48DC", number: "081398734437", ssid: "Media Creative 30", password: "MC30#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-31", device_name: "Orbitmifi_4959", number: "081398734447", ssid: "Media Creative 31", password: "MC31#2026", status: "Available" },
  { id: "modem-32", device_name: "Orbitmifi_925B", number: "082310327205", ssid: "Media Creative 32", password: "MC32#2026", status: "Rented", remark: "SOJ260730 (TL: Empong)" },
  { id: "modem-33", device_name: "Orbitmifi_8D50", number: "082310302160", ssid: "Media Creative 33", password: "MC33#2026", status: "Rented", remark: "BAJ260723 (TL: Sugiarto)" },
  { id: "modem-34", device_name: "Orbitmifi_8D4B", number: "082310302178", ssid: "Media Creative 34", password: "MC34#2026", status: "Available" },
  { id: "modem-35", device_name: "Orbitmifi_9725", number: "082310371109", ssid: "Media Creative 35", password: "MC35#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-36", device_name: "Orbitmifi_8D6B", number: "082310302248", ssid: "Media Creative 36", password: "MC36#2026", status: "Rented", remark: "FIS260717 (TL: Linda Samosir)" },
  { id: "modem-37", device_name: "Orbitmifi_8E02", number: "082310302384", ssid: "Media Creative 37", password: "MC37#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-38", device_name: "Orbitmifi_8EC0", number: "082310371129", ssid: "Media Creative 38", password: "MC38#2026", status: "Available" },
  { id: "modem-39", device_name: "Orbitmifi_9726", number: "082310371088", ssid: "Media Creative 39", password: "MC39#2026", status: "Rented", remark: "FIO260715 (TL: I Ketut Sentosa)" },
  { id: "modem-40", device_name: "Orbitmifi_56BD", number: "082130431824", ssid: "Media Creative 40", password: "MC40#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-41", device_name: "Orbitmifi_C823", number: "085313428403", ssid: "Media Creative 41", password: "MC41#2026", status: "Rented", remark: "KIS260710 (TL: Nurdin Nasution)" },
  { id: "modem-42", device_name: "Orbitmifi_C2DA", number: "085313428598", ssid: "Media Creative 42", password: "MC42#2026", status: "Available" },
];

// 2. APP SETTINGS
const DEFAULT_SETTINGS = {
  id: "default",
  company_name: "Media Creative Studio",
  email: "billing@mediacreative.co.id",
  phone: "+62 812-3456-7890",
  address: "Jl. Sudirman No. 88, Jakarta Selatan 12190",
  tax_id: "01.234.567.8-012.000",
  invoice_prefix: "INV-2026-",
  tax_rate: "11",
  currency: "IDR (Rp)",
  payment_terms_days: "14",
};

// 3. TOUR LEADERS
const DEFAULT_TOUR_LEADERS = [
  { id: "tl-1", name: "Komang Sudira" },
  { id: "tl-2", name: "Empong Kuswoyo" },
  { id: "tl-3", name: "Pendot" },
  { id: "tl-4", name: "Gede Suadnyana" },
  { id: "tl-5", name: "Chairul Effendi" },
  { id: "tl-6", name: "Bram Idrus" },
  { id: "tl-7", name: "Komang Karung" },
  { id: "tl-8", name: "Nurdin Nasution" },
  { id: "tl-9", name: "Nino" },
  { id: "tl-10", name: "Sofyan" },
  { id: "tl-11", name: "Linda Samosir" },
  { id: "tl-12", name: "I Ketut Sentosa" },
  { id: "tl-13", name: "Usman" },
  { id: "tl-14", name: "Agus Wiraman" },
  { id: "tl-15", name: "Sugiarto" },
  { id: "tl-16", name: "Ophan" },
  { id: "tl-17", name: "Ayu Putu" },
];

// 4. PAYMENT ACCOUNTS
const DEFAULT_PAYMENT_ACCOUNTS = [
  { id: "acc_bca", bank_name: "BCA", account_number: "0402434901", account_holder: "Mulyadi", is_default: true },
  { id: "acc_mandiri", bank_name: "Bank Mandiri", account_number: "137-00-1234567-8", account_holder: "Media Creative", is_default: false },
  { id: "acc_bsi", bank_name: "BSI", account_number: "7123456789", account_holder: "Mulyadi", is_default: false },
];

async function seedAll() {
  console.log("Starting full seed into Supabase...");

  // Seed Modems
  const { error: mErr } = await supabase.from("modems").upsert(INITIAL_MODEMS);
  console.log("1. Modems seeded:", mErr ? mErr.message : "SUCCESS (42 modems)");

  // Seed Settings
  const { error: sErr } = await supabase.from("app_settings").upsert([DEFAULT_SETTINGS]);
  console.log("2. Settings seeded:", sErr ? sErr.message : "SUCCESS");

  // Seed Tour Leaders
  const { error: tlErr } = await supabase.from("tour_leaders").upsert(DEFAULT_TOUR_LEADERS);
  console.log("3. Tour Leaders seeded:", tlErr ? tlErr.message : "SUCCESS");

  // Seed Payment Accounts
  const { error: paErr } = await supabase.from("payment_accounts").upsert(DEFAULT_PAYMENT_ACCOUNTS);
  console.log("4. Payment Accounts seeded:", paErr ? paErr.message : "SUCCESS");

  // Seed Tour Rental Logs
  const parseLogs = require("./parse-tour-logs.js");
  const fs = require('fs');
  const rentalsCode = fs.readFileSync("./app/(dashboard)/rentals/page.tsx", "utf8");
  const match = rentalsCode.match(/const MASTER_TOUR_LOGS: TourRentalLog\[\] = (\[[\s\S]*?\]);/);
  if (match) {
    const logs = JSON.parse(match[1]);
    console.log(`Found ${logs.length} tour logs in rentals page. Seeding to Supabase...`);
    // Upsert in batches of 50
    for (let i = 0; i < logs.length; i += 50) {
      const batch = logs.slice(i, i + 50);
      const { error: trErr } = await supabase.from("tour_rental_logs").upsert(batch, { onConflict: "tourcode" });
      if (trErr) console.error("Batch seed error:", trErr.message);
    }
    console.log("5. Tour Rental Logs seeded: SUCCESS");
  }
}

seedAll().catch(console.error);
