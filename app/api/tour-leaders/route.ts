import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonNoCache } from "@/lib/api-utils";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function GET() {
  try {
    const { data, error } = await supabase.from("tour_leaders").select("*").order("name");
    if (!error && data && data.length > 0) {
      writeJsonStore("tour_leaders.json", data);
      return jsonNoCache(data);
    }
  } catch (err) {
    console.warn("Supabase tour_leaders query skipped/failed, using local store:", err);
  }

  const localData = readJsonStore("tour_leaders.json", DEFAULT_TOUR_LEADERS);
  return jsonNoCache(localData);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, notes } = body;

    const payload = {
      id: id || `tl-${Date.now()}`,
      name: name || "New Tour Leader",
      phone: phone || null,
      notes: notes || null,
    };

    // Dual write local store
    const list = readJsonStore("tour_leaders.json", DEFAULT_TOUR_LEADERS);
    const existingIdx = list.findIndex((tl: any) => tl.id === payload.id);
    if (existingIdx >= 0) {
      list[existingIdx] = payload;
    } else {
      list.push(payload);
    }
    writeJsonStore("tour_leaders.json", list);

    // Try saving to Supabase
    try {
      await supabase.from("tour_leaders").insert([payload]);
    } catch (e) {
      console.warn("Supabase tour_leaders insert skipped:", e);
    }

    return jsonNoCache(payload);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Insert failed" }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "Leader ID is required" }, 400);
    }

    // Dual delete local store
    const list = readJsonStore("tour_leaders.json", DEFAULT_TOUR_LEADERS);
    const filtered = list.filter((tl: any) => tl.id !== id);
    writeJsonStore("tour_leaders.json", filtered);

    // Try deleting from Supabase
    try {
      await supabase.from("tour_leaders").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase tour_leaders delete skipped:", e);
    }

    return jsonNoCache({ success: true });
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Delete failed" }, 500);
  }
}
