const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

// Read MASTER_TOUR_LOGS from app/(dashboard)/rentals/page.tsx
const rentalsPath = path.join(__dirname, "../app/(dashboard)/rentals/page.tsx");
const rentalsContent = fs.readFileSync(rentalsPath, "utf8");

const match = rentalsContent.match(/const MASTER_TOUR_LOGS: TourRentalLog\[\] = (\[[\s\S]*?\]);\s*\/\//);
if (!match) {
  console.error("Could not find MASTER_TOUR_LOGS in rentals/page.tsx");
  process.exit(1);
}

const allLogs = JSON.parse(match[1]);
console.log(`Found ${allLogs.length} tour rental logs in page.tsx!`);

async function seed() {
  console.log("Seeding all tour logs into Supabase tour_rental_logs table...");

  // Batch insert into Supabase in chunks of 50
  for (let i = 0; i < allLogs.length; i += 50) {
    const batch = allLogs.slice(i, i + 50);
    const { data, error } = await supabase.from("tour_rental_logs").upsert(batch, { onConflict: "tourcode" }).select();
    if (error) {
      console.error(`Batch ${i / 50 + 1} error:`, error.message);
    } else {
      console.log(`Batch ${i / 50 + 1} (${batch.length} items) inserted successfully!`);
    }
  }

  // Also update app/api/tour-rentals/route.ts to include the complete array as fallback
  const apiRoutePath = path.join(__dirname, "../app/api/tour-rentals/route.ts");
  let apiContent = fs.readFileSync(apiRoutePath, "utf8");
  
  const apiMatch = apiContent.match(/const MASTER_TOUR_LOGS = \[[\s\S]*?\];/);
  if (apiMatch) {
    const newMasterCode = `const MASTER_TOUR_LOGS = ${JSON.stringify(allLogs, null, 2)};`;
    apiContent = apiContent.replace(apiMatch[0], newMasterCode);
    fs.writeFileSync(apiRoutePath, apiContent, "utf8");
    console.log("Updated app/api/tour-rentals/route.ts with full master logs array!");
  }
}

seed().catch(console.error);
