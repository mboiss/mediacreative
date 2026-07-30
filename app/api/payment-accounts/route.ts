import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonNoCache } from "@/lib/api-utils";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PAYMENT_ACCOUNTS = [
  {
    id: "acc_bca",
    bank_name: "BCA",
    account_number: "0402434901",
    account_holder: "Mulyadi",
    is_default: true,
  },
  {
    id: "acc_mandiri",
    bank_name: "Bank Mandiri",
    account_number: "137-00-1234567-8",
    account_holder: "Media Creative",
    is_default: false,
  },
  {
    id: "acc_uob",
    bank_name: "Bank UOB",
    account_number: "301-301-123-4",
    account_holder: "Media Creative",
    is_default: false,
  },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      writeJsonStore("payment_accounts.json", data);
      return jsonNoCache(data);
    }
  } catch (err) {
    console.warn("Supabase payment_accounts query skipped/failed, using local store:", err);
  }

  const localData = readJsonStore("payment_accounts.json", DEFAULT_PAYMENT_ACCOUNTS);
  return jsonNoCache(localData);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, bank_name, account_number, account_holder, is_default, notes } = body;

    const payload = {
      id: id || `acc_${Date.now()}`,
      bank_name: bank_name || "Bank",
      account_number: account_number || "",
      account_holder: account_holder || "",
      is_default: !!is_default,
      notes: notes || null,
    };

    // Dual write local store
    const list = readJsonStore("payment_accounts.json", DEFAULT_PAYMENT_ACCOUNTS);
    if (payload.is_default) {
      list.forEach((acc: any) => (acc.is_default = false));
    }
    const existingIdx = list.findIndex((acc: any) => acc.id === payload.id);
    if (existingIdx >= 0) {
      list[existingIdx] = payload;
    } else {
      list.push(payload);
    }
    writeJsonStore("payment_accounts.json", list);

    // Try saving to Supabase
    try {
      if (payload.is_default) {
        await supabase
          .from("payment_accounts")
          .update({ is_default: false })
          .neq("id", payload.id);
      }
      await supabase.from("payment_accounts").upsert([payload]);
    } catch (e) {
      console.warn("Supabase payment_accounts write skipped:", e);
    }

    return jsonNoCache(payload);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Operation failed" }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "Account ID is required" }, 400);
    }

    // Dual delete local store
    const list = readJsonStore("payment_accounts.json", DEFAULT_PAYMENT_ACCOUNTS);
    const filtered = list.filter((acc: any) => acc.id !== id);
    writeJsonStore("payment_accounts.json", filtered);

    // Try deleting from Supabase
    try {
      await supabase.from("payment_accounts").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase payment_accounts delete skipped:", e);
    }

    return jsonNoCache({ success: true });
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Delete failed" }, 500);
  }
}
