import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("tour_rental_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return jsonNoCache(data ?? []);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load tour rentals") }, 500);
  }
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
      tourcode: (tourcode || `TOUR-${Date.now()}`).trim(),
      start_date: start_date || new Date().toISOString().split("T")[0],
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
    };
    if (typeof body.id === "string" && UUID_RE.test(body.id)) {
      payload.id = body.id;
    }

    const supabase = getSupabaseAdmin();

    // A tourcode identifies a tour: saving an existing one updates it instead of duplicating it.
    const { data: existing, error: findErr } = await supabase
      .from("tour_rental_logs")
      .select("id")
      .eq("tourcode", payload.tourcode)
      .limit(1)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      const { id: _ignored, ...updates } = payload;
      const { data, error } = await supabase
        .from("tour_rental_logs")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return jsonNoCache(data);
    }

    const { data, error } = await supabase.from("tour_rental_logs").insert([payload]).select().single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Insert failed") }, 500);
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

    let query = getSupabaseAdmin().from("tour_rental_logs").update(updates);
    query = id ? query.eq("id", id) : query.eq("tourcode", tourcode);
    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return jsonNoCache({ error: "Tour rental not found" }, 404);
    }
    return jsonNoCache(data[0]);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Update failed") }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, tourcode } = await request.json();

    if (!id && !tourcode) {
      return jsonNoCache({ error: "Rental ID or Tourcode is required" }, 400);
    }

    let query = getSupabaseAdmin().from("tour_rental_logs").delete();
    query = id ? query.eq("id", id) : query.eq("tourcode", tourcode);
    const { error } = await query;
    if (error) throw error;
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Delete failed") }, 500);
  }
}
