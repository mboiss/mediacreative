"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createClientRecord(formData: FormData) {
  const payload = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    address: formData.get("address"),
  };

  const { error } = await supabase
    .from("clients")
    .insert(payload)
    .select();

  if (error) console.error("Failed to create client:", error);

  revalidatePath("/clients");
}