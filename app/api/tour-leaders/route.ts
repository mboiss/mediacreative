import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { data, error } = await supabase
      .from("tour_leaders")
      .select("*")
      .order("name");

    if (error) {
      console.error("GET Tour Leaders Error:", error);
      return NextResponse.json(DEFAULT_TOUR_LEADERS);
    }

    if (!data || data.length === 0) {
      // Auto-seed
      const { data: seeded } = await supabase
        .from("tour_leaders")
        .insert(DEFAULT_TOUR_LEADERS)
        .select();

      return NextResponse.json(seeded || DEFAULT_TOUR_LEADERS);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET Tour Leaders Crash:", err);
    return NextResponse.json(DEFAULT_TOUR_LEADERS);
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

    const { data, error } = await supabase
      .from("tour_leaders")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Insert failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Leader ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("tour_leaders")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
