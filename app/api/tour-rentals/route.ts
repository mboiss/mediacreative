import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    if (error) {
      console.error("GET Tour Rentals Error:", error);
      return NextResponse.json(MASTER_TOUR_LOGS);
    }

    if (!data || data.length === 0) {
      // Auto-seed initial tour logs
      const { data: seeded } = await supabase
        .from("tour_rental_logs")
        .insert(MASTER_TOUR_LOGS)
        .select();

      return NextResponse.json(seeded || MASTER_TOUR_LOGS);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET Tour Rentals Crash:", err);
    return NextResponse.json(MASTER_TOUR_LOGS);
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

    const payload = {
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
    };

    const { data, error } = await supabase
      .from("tour_rental_logs")
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
      return NextResponse.json({ error: "Rental ID or Tourcode is required" }, { status: 400 });
    }

    let query = supabase.from("tour_rental_logs").update({
      tourcode,
      start_date,
      end_date,
      days: Number(days || 1),
      qty: Number(qty || 1),
      location,
      tl,
      status,
      modems,
      invoice_status,
      remark,
      notes,
      device_pax,
    });

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("tourcode", tourcode);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, tourcode } = await request.json();

    if (!id && !tourcode) {
      return NextResponse.json({ error: "Rental ID or Tourcode is required" }, { status: 400 });
    }

    let query = supabase.from("tour_rental_logs").delete();
    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("tourcode", tourcode);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
