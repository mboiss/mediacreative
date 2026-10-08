const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
