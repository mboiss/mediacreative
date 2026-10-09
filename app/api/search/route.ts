import type { NextRequest } from "next/server";
import { jsonNoCache } from "@/lib/api-utils";
import { getSupabaseAdmin, errorMessage } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIMIT = 5;
const MIN_QUERY = 2;

type ClientRef = { full_name: string | null; company: string | null };
type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string | null;
  clients: ClientRef | ClientRef[] | null;
};

function clientLabel(c: InvoiceRow["clients"]): string | null {
  const client = Array.isArray(c) ? c[0] : c;
  if (!client) return null;
  return client.company || client.full_name || null;
}

/** GET /api/search?q=… — grouped quick-search for the command palette. */
export async function GET(request: NextRequest) {
  // PostgREST `or()` filters use commas/parentheses as syntax and %/_ as wildcards: strip them.
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const q = raw.replace(/[,()%_*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 64);

  if (q.length < MIN_QUERY) {
    return jsonNoCache({ query: q, clients: [], invoices: [], tours: [] });
  }

  const like = `%${q}%`;

  try {
    const supabase = getSupabaseAdmin();

    const [clientsRes, invoicesByNumberRes, toursRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, company, email")
        .or(`full_name.ilike.${like},company.ilike.${like},email.ilike.${like}`)
        .order("full_name")
        .limit(LIMIT),
      supabase
        .from("invoices")
        .select("id, invoice_number, legacy_number, status, clients ( full_name, company )")
        .or(`invoice_number.ilike.${like},legacy_number.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("tour_rental_logs")
        .select("id, tourcode, tl, location, status")
        .or(`tourcode.ilike.${like},tl.ilike.${like},location.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
    ]);
    if (clientsRes.error) throw clientsRes.error;
    if (invoicesByNumberRes.error) throw invoicesByNumberRes.error;
    if (toursRes.error) throw toursRes.error;

    const clients = clientsRes.data ?? [];
    let invoiceRows = (invoicesByNumberRes.data ?? []) as unknown as InvoiceRow[];

    // Also match invoices by client name, using the clients that matched above.
    if (invoiceRows.length < LIMIT && clients.length > 0) {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, clients ( full_name, company )")
        .in(
          "client_id",
          clients.map((c) => c.id)
        )
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      const seen = new Set(invoiceRows.map((i) => i.id));
      for (const row of (data ?? []) as unknown as InvoiceRow[]) {
        if (invoiceRows.length >= LIMIT) break;
        if (!seen.has(row.id)) invoiceRows = [...invoiceRows, row];
      }
    }

    return jsonNoCache({
      query: q,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.full_name || c.company || "Unnamed client",
        company: c.company ?? null,
        email: c.email ?? null,
      })),
      invoices: invoiceRows.map((i) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        client: clientLabel(i.clients),
        status: i.status,
      })),
      tours: (toursRes.data ?? []).map((t) => ({
        id: t.id,
        tourcode: t.tourcode,
        tl: t.tl ?? null,
        location: t.location ?? null,
        status: t.status ?? null,
      })),
    });
  } catch (err) {
    console.error("Search API error:", err);
    return jsonNoCache({ error: errorMessage(err, "Search failed") }, 500);
  }
}
