import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("modems").select("*").order("id");
    if (error) throw error;
    return jsonNoCache(data ?? []);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load modems") }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, device_name, number, ssid, password, status, remark } = body;

    const payload = {
      id: id || `modem-${Date.now()}`,
      device_name: device_name || "Orbitmifi",
      number: number || "",
      ssid: ssid || "Media Creative",
      password: password || "MC#2026",
      status: status || "Available",
      remark: remark || null,
    };

    const { data, error } = await getSupabaseAdmin().from("modems").upsert([payload]).select().single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Insert failed") }, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, device_name, number, ssid, password, status, remark } = body;

    if (!id) {
      return jsonNoCache({ error: "Modem ID is required" }, 400);
    }

    const updates: Record<string, any> = {};
    if (device_name !== undefined) updates.device_name = device_name;
    if (number !== undefined) updates.number = number;
    if (ssid !== undefined) updates.ssid = ssid;
    if (password !== undefined) updates.password = password;
    if (status !== undefined) updates.status = status;
    if (remark !== undefined) updates.remark = remark;

    const { data, error } = await getSupabaseAdmin()
      .from("modems")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Update failed") }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "Modem ID is required" }, 400);
    }

    const { error } = await getSupabaseAdmin().from("modems").delete().eq("id", id);
    if (error) throw error;
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Delete failed") }, 500);
  }
}
