// One-time migration: copy records from data/*.json into Supabase.
// Only inserts records that are missing in Supabase — existing rows are never overwritten.
//
//   node --env-file=.env.local scripts/migrate-json-to-supabase.mjs          (dry run, shows what would be inserted)
//   node --env-file=.env.local scripts/migrate-json-to-supabase.mjs --apply  (actually insert)

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const SOURCES = [
  { file: "data/modems.json", table: "modems", matchBy: ["id"] },
  { file: "data/tour_leaders.json", table: "tour_leaders", matchBy: ["id"] },
  { file: "data/tour_rentals.json", table: "tour_rental_logs", matchBy: ["id", "tourcode"] },
  { file: "data/esim.json", table: "esim_profiles", matchBy: ["id"] },
  { file: "data/payment_accounts.json", table: "payment_accounts", matchBy: ["id"] },
];

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

let failed = false;
console.log(apply ? "== APPLY MODE ==" : "== DRY RUN (add --apply to insert) ==");

for (const { file, table, matchBy } of SOURCES) {
  if (!existsSync(file)) continue;
  const local = JSON.parse(readFileSync(file, "utf8"));

  try {
    const remote = await fetchAll(table, matchBy.join(","));
    const known = matchBy.map((col) => new Set(remote.map((r) => r[col]).filter(Boolean)));
    const missing = local.filter((rec) => !matchBy.some((col, i) => rec[col] && known[i].has(rec[col])));

    console.log(`\n${table}: ${local.length} in JSON, ${remote.length} in Supabase, ${missing.length} missing`);
    for (const rec of missing.slice(0, 10)) {
      console.log("  +", rec.tourcode || rec.name || rec.device_name || rec.id);
    }
    if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more`);

    if (apply && missing.length > 0) {
      const { error } = await supabase.from(table).insert(missing);
      if (error) throw new Error(`${table} insert: ${error.message}`);
      console.log(`  ✓ inserted ${missing.length}`);
    }
  } catch (err) {
    failed = true;
    console.error(`  ✗ ${err.message}`);
  }
}

process.exit(failed ? 1 : 0);
