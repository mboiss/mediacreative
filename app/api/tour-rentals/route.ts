import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonNoCache } from "@/lib/api-utils";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_TOUR_LOGS = [
  {
    tourcode: "SOO220528",
    start_date: "29-May-2022",
    end_date: "09-Jun-2022",
    days: 12,
    qty: 1,
    location: "Sri Phala Resort And Villa",
    tl: "Usman",
    status: "Finish",
    modems: "NET11",
    invoice_status: "Paid",
    remark: "Lombok",
  },
  {
    tourcode: "SOO220604S",
    start_date: "05-Jun-2022",
    end_date: "17-Jun-2022",
    days: 13,
    qty: 9,
    location: "Swastika Bungalow",
    tl: "Komang Karung",
    status: "Finish",
    modems: "NET01, NET02, NET03, NET04, NET05, NET06, NET07, NET08, NET09",
    invoice_status: "Paid",
    remark: "Pax 24",
  },
  {
    tourcode: "KIB220702",
    start_date: "03-Jul-2022",
    end_date: "15-Jul-2022",
    days: 13,
    qty: 1,
    location: "Bhuwana Ubud",
    tl: "Sofyan Manik",
    status: "Finish",
    modems: "MC1",
    invoice_status: "Paid",
    remark: "12345678990",
  },
  {
    tourcode: "BAT220702",
    start_date: "03-Jul-2022",
    end_date: "14-Jul-2022",
    days: 12,
    qty: 3,
    location: "Champlung Sari Ubud",
    tl: "Gede Suadnyana",
    status: "Finish",
    modems: "NET11",
    invoice_status: "Paid",
    remark: "1 modem extend smpe tgl 19, extra charge 300K",
  },
  {
    tourcode: "FID260730",
    start_date: "30-Jul-2026",
    end_date: "12-Aug-2026",
    days: 14,
    qty: 2,
    location: "Kuta, Bali",
    tl: "Sofyan",
    status: "Running",
    modems: "MC19, MC21",
    invoice_status: "Pending",
    remark: "Upcoming Group Tour",
  },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("tour_rental_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      writeJsonStore("tour_rentals.json", data);
      return jsonNoCache(data);
    }
  } catch (err) {
    console.warn("Supabase tour_rental_logs query skipped/failed, using local store:", err);
  }

  const localData = readJsonStore<any[]>("tour_rentals.json", MASTER_TOUR_LOGS);
  return jsonNoCache(localData);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tourcode,
      start_date,
      end_date,
      days,
      qty,
      location,
      tl,
      status,
      modems,
      invoice_status,
      remark,
      notes,
      device_pax,
    } = body;

    const payload: Record<string, any> = {
      id: body.id || `tour-${Date.now()}`,
      tourcode: tourcode || `TOUR-${Date.now()}`,
      start_date: start_date || "",
      end_date: end_date || "",
      days: Number(days || 1),
      qty: Number(qty || 1),
      location: location || null,
      tl: tl || null,
      status: status || "Upcoming",
      modems: modems || "",
      invoice_status: invoice_status || "Unpaid",
      remark: remark || null,
      notes: notes || null,
      device_pax: device_pax || {},
      created_at: new Date().toISOString(),
    };

    // Dual write local store
    const list = readJsonStore<any[]>("tour_rentals.json", MASTER_TOUR_LOGS);
    const existingIdx = list.findIndex((t: any) => t.tourcode === payload.tourcode || (t.id && t.id === payload.id));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...payload };
    } else {
      list.unshift(payload);
    }
    writeJsonStore("tour_rentals.json", list);

    // Try saving to Supabase if table exists
    try {
      await supabase.from("tour_rental_logs").insert([payload]);
    } catch (e) {
      console.warn("Supabase tour_rental_logs insert skipped:", e);
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
      tourcode,
      start_date,
      end_date,
      days,
      qty,
      location,
      tl,
      status,
      modems,
      invoice_status,
      remark,
      notes,
      device_pax,
    } = body;

    if (!id && !tourcode) {
      return jsonNoCache({ error: "Rental ID or Tourcode is required" }, 400);
    }

    const updates: Record<string, any> = {};
    if (tourcode !== undefined) updates.tourcode = tourcode;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (days !== undefined) updates.days = Number(days);
    if (qty !== undefined) updates.qty = Number(qty);
    if (location !== undefined) updates.location = location;
    if (tl !== undefined) updates.tl = tl;
    if (status !== undefined) updates.status = status;
    if (modems !== undefined) updates.modems = modems;
    if (invoice_status !== undefined) updates.invoice_status = invoice_status;
    if (remark !== undefined) updates.remark = remark;
    if (notes !== undefined) updates.notes = notes;
    if (device_pax !== undefined) updates.device_pax = device_pax;

    // Dual update local store
    const list = readJsonStore<any[]>("tour_rentals.json", MASTER_TOUR_LOGS);
    let updatedItem: any = { id, tourcode, ...updates };
    const existingIdx = list.findIndex((t: any) => (id && t.id === id) || (tourcode && t.tourcode === tourcode));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...updates };
      updatedItem = list[existingIdx];
    } else {
      list.unshift(updatedItem);
    }
    writeJsonStore("tour_rentals.json", list);

    // Try updating Supabase
    try {
      let q = supabase.from("tour_rental_logs").update(updates);
      if (id) await q.eq("id", id);
      else if (tourcode) await q.eq("tourcode", tourcode);
    } catch (e) {
      console.warn("Supabase tour_rental_logs update skipped:", e);
    }

    return jsonNoCache(updatedItem);
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Update failed" }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, tourcode } = await request.json();

    if (!id && !tourcode) {
      return jsonNoCache({ error: "Rental ID or Tourcode is required" }, 400);
    }

    // Dual delete local store
    const list = readJsonStore<any[]>("tour_rentals.json", MASTER_TOUR_LOGS);
    const filtered = list.filter((t: any) => {
      if (id && t.id === id) return false;
      if (tourcode && t.tourcode === tourcode) return false;
      return true;
    });
    writeJsonStore("tour_rentals.json", filtered);

    // Try deleting from Supabase
    try {
      let query = supabase.from("tour_rental_logs").delete();
      if (id) await query.eq("id", id);
      else if (tourcode) await query.eq("tourcode", tourcode);
    } catch (e) {
      console.warn("Supabase tour_rental_logs delete skipped:", e);
    }

    return jsonNoCache({ success: true });
  } catch (err: any) {
    return jsonNoCache({ error: err?.message || "Delete failed" }, 500);
  }
}
