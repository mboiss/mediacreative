import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("tour_leaders").select("*").order("name");
    if (error) throw error;
    return jsonNoCache(data ?? []);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load tour leaders") }, 500);
  }
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

    const { data, error } = await getSupabaseAdmin().from("tour_leaders").upsert([payload]).select().single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Insert failed") }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "Leader ID is required" }, 400);
    }

    const { error } = await getSupabaseAdmin().from("tour_leaders").delete().eq("id", id);
    if (error) throw error;
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Delete failed") }, 500);
  }
}
