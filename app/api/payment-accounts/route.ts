import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return jsonNoCache(data ?? []);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Failed to load payment accounts") }, 500);
  }
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

    const supabase = getSupabaseAdmin();
    if (payload.is_default) {
      const { error: resetErr } = await supabase
        .from("payment_accounts")
        .update({ is_default: false })
        .neq("id", payload.id);
      if (resetErr) throw resetErr;
    }
    const { data, error } = await supabase.from("payment_accounts").upsert([payload]).select().single();
    if (error) throw error;
    return jsonNoCache(data);
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Operation failed") }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return jsonNoCache({ error: "Account ID is required" }, 400);
    }

    const { error } = await getSupabaseAdmin().from("payment_accounts").delete().eq("id", id);
    if (error) throw error;
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache({ error: errorMessage(err, "Delete failed") }, 500);
  }
}
