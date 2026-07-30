import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonNoCache } from "@/lib/api-utils";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("esim_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      writeJsonStore("esim.json", data);
      return jsonNoCache(data);
    }
  } catch (err) {
    console.warn("Supabase esim_profiles query skipped/failed, using local store:", err);
  }

  const localData = readJsonStore("esim.json", INITIAL_PROFILES);
  return jsonNoCache(localData);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      iccid,
      package_name,
      region,
      data_gb,
      price,
      user_name,
      activation_code,
      status,
      expiry_date,
    } = body;

    const payload = {
      id: id || `esim-${Date.now()}`,
      iccid: iccid || `8988${Math.floor(1000000000 + Math.random() * 9000000000)}F`,
      package_name: package_name || "eSIM Package",
      region: region || "Global",
      data_gb: Number(data_gb || 10),
      price: Number(price || 0),
      user_name: user_name || "Unassigned",
      activation_code: activation_code || `LPA:1$rsp.esim.com$MC-${Math.floor(1000 + Math.random() * 9000)}`,
      status: status || "Active",
      expiry_date: expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };

    // Dual write local store
    const list = readJsonStore("esim.json", INITIAL_PROFILES);
    const existingIdx = list.findIndex((e: any) => e.id === payload.id);
    if (existingIdx >= 0) {
      list[existingIdx] = payload;
    } else {
      list.unshift(payload);
    }
    writeJsonStore("esim.json", list);

    // Try saving to Supabase
    try {
      await supabase.from("esim_profiles").insert([payload]);
    } catch (e) {
      console.warn("Supabase esim_profiles insert skipped:", e);
    }

    return jsonNoCache(payload);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Insert failed" }, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      iccid,
      package_name,
      region,
      data_gb,
      price,
      user_name,
      activation_code,
      status,
      expiry_date,
    } = body;

    if (!id) {
      return jsonNoCache({ error: "eSIM ID is required" }, 400);
    }

    const updates = {
      iccid,
      package_name,
      region,
      data_gb: Number(data_gb || 0),
      price: Number(price || 0),
      user_name,
      activation_code,
      status,
      expiry_date,
    };

    // Dual update local store
    const list = readJsonStore("esim.json", INITIAL_PROFILES);
    let updatedItem = { id, ...updates };
    const existingIdx = list.findIndex((e: any) => e.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...updates };
      updatedItem = list[existingIdx];
    } else {
      list.unshift(updatedItem);
    }
    writeJsonStore("esim.json", list);

    // Try updating Supabase
    try {
      await supabase.from("esim_profiles").update(updates).eq("id", id);
    } catch (e) {
      console.warn("Supabase esim_profiles update skipped:", e);
    }

    return jsonNoCache(updatedItem);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Update failed" }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "eSIM ID is required" }, 400);
    }

    // Dual delete local store
    const list = readJsonStore("esim.json", INITIAL_PROFILES);
    const filtered = list.filter((e: any) => e.id !== id);
    writeJsonStore("esim.json", filtered);

    // Try deleting from Supabase
    try {
      await supabase.from("esim_profiles").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase esim_profiles delete skipped:", e);
    }

    return jsonNoCache({ success: true });
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Delete failed" }, 500);
  }
}
