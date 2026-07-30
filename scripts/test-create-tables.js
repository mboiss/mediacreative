const fs = require('fs');

const url = "https://gztjdvykaedcatnxeoxm.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGpkdnlrYWVkY2F0bnhlb3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxMzgxMywiZXhwIjoyMDk1Mjg5ODEzfQ.wTpM1_e0W34VqD90qoXaNDh6zfxcrT-jHsjnh2M7lo8";

async function tryExecSql() {
  const sql = fs.readFileSync('./supabase/schema.sql', 'utf8');

  // Try endpoint 1: /rest/v1/rpc/exec_sql
  try {
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    console.log("RPC exec_sql status:", res.status, await res.text());
  } catch (e) {
    console.log("RPC exec_sql error:", e.message);
  }
}

tryExecSql();
