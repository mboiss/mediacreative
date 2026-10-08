const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
