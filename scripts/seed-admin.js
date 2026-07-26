const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

const supabase = createClient(url, serviceKey);

async function main() {
  const email = "admin@mediacreative.com";
  const password = "admin123456";

  console.log("Checking users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("List users error:", error);
    return;
  }

  let existing = users.find(u => u.email === email || u.email === "mediacreative@aol.com");

  if (existing) {
    console.log("Updating password for existing user:", existing.email);
    const res = await supabase.auth.admin.updateUserById(existing.id, {
      email: email,
      password: password,
      email_confirm: true
    });
    if (res.error) console.error("Update error:", res.error);
    else console.log("Successfully updated user password!");
  } else {
    console.log("Creating new admin user...");
    const res = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (res.error) console.error("Create error:", res.error);
    else console.log("Successfully created admin user!");
  }
}

main().catch(console.error);
