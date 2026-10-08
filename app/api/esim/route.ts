import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("esim_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return jsonNoCache(data ?? []);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load eSIM profiles") }, 500);
  }
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

    const { data, error } = await getSupabaseAdmin().from("esim_profiles").upsert([payload]).select().single();
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

    const { data, error } = await getSupabaseAdmin()
      .from("esim_profiles")
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
      return jsonNoCache({ error: "eSIM ID is required" }, 400);
    }

    const { error } = await getSupabaseAdmin().from("esim_profiles").delete().eq("id", id);
    if (error) throw error;
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Delete failed") }, 500);
  }
}
