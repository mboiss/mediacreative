const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

const parseScriptPath = path.join(__dirname, "parse-tour-logs.js");
const parseContent = fs.readFileSync(parseScriptPath, "utf8");

const match = parseContent.match(/const tourLines = (\[[\s\S]*?\]);\s*console/);
if (!match) {
  console.error("Could not find tourLines in parse-tour-logs.js");
  process.exit(1);
}

const tourLogs = eval(match[1]);
console.log(`Successfully extracted ${tourLogs.length} tour logs from parse-tour-logs.js!`);

async function seed() {
  console.log("Seeding all 257 tour logs into Supabase tour_rental_logs table...");

  // First delete any existing logs in table to avoid duplicates
  await supabase.from("tour_rental_logs").delete().neq("tourcode", "EMPTY_DUMMY_KEY");

  // Batch insert into Supabase in chunks of 50
  for (let i = 0; i < tourLogs.length; i += 50) {
    const batch = tourLogs.slice(i, i + 50);
    const { data, error } = await supabase.from("tour_rental_logs").insert(batch).select();
    if (error) {
      console.error(`Batch ${i / 50 + 1} error:`, error.message);
    } else {
      console.log(`Batch ${i / 50 + 1} (${data?.length || batch.length} items) inserted successfully!`);
    }
  }

  // Update app/api/tour-rentals/route.ts MASTER_TOUR_LOGS array
  const apiRoutePath = path.join(__dirname, "../app/api/tour-rentals/route.ts");
  let apiContent = fs.readFileSync(apiRoutePath, "utf8");

  const apiMatch = apiContent.match(/const MASTER_TOUR_LOGS = \[[\s\S]*?\];/);
  if (apiMatch) {
    const newMasterCode = `const MASTER_TOUR_LOGS = ${JSON.stringify(tourLogs, null, 2)};`;
    apiContent = apiContent.replace(apiMatch[0], newMasterCode);
    fs.writeFileSync(apiRoutePath, apiContent, "utf8");
    console.log("Updated app/api/tour-rentals/route.ts with all 257 tour logs!");
  }
}

seed().catch(console.error);
