"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_RECEIPTS_LIMIT = 25;

/**
 * @param {string} query
 * @returns {string[]}
 */
function splitSearchTerms(query) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Client IDs where each search term matches name or last_name.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} query
 * @returns {Promise<{ error: string | null; ids: string[] }>}
 */
async function findClientIdsByNameQuery(supabase, query) {
  const terms = splitSearchTerms(query);
  if (terms.length === 0) {
    return { error: null, ids: [] };
  }

  let clientQuery = supabase.from("clients").select("id").limit(50);

  for (const term of terms) {
    const pattern = `%${term}%`;
    clientQuery = clientQuery.or(`name.ilike.${pattern},last_name.ilike.${pattern}`);
  }

  const { data, error } = await clientQuery;
  if (error) {
    return { error: error.message, ids: [] };
  }

  return { error: null, ids: (data ?? []).map((c) => c.id) };
}

/**
 * Search receipts for a fixed service on Home: client name/last name, account number,
 * and optionally the service name (still scoped to the selected service_id).
 * @param {string} serviceId
 * @param {string} query
 * @returns {Promise<{ error: string | null; receipts?: { id: string; account_receipt_number: string; clients: { name: string; last_name: string } | null; services: { id: string; name: string; image_bucket: string | null; image_path: string | null } | null }[] }>}
 */
export async function searchReceiptsForHomeAction(serviceId, query) {
  const auth = await requirePermission("payments", "view");
  if (auth.error) return { error: auth.error };

  const sid = (serviceId ?? "").trim();
  if (!sid) {
    return { error: "El servicio es requerido." };
  }

  const q = (query ?? "").trim();
  if (q.length < SEARCH_MIN_LENGTH) {
    return { receipts: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [clientsRes, serviceRes] = await Promise.all([
    findClientIdsByNameQuery(supabase, q),
    supabase.from("services").select("id, name").eq("id", sid).maybeSingle(),
  ]);

  if (clientsRes.error) {
    return { error: clientsRes.error };
  }

  if (serviceRes.error) {
    return { error: serviceRes.error };
  }

  if (!serviceRes.data) {
    return { error: "Servicio no encontrado." };
  }

  const clientIds = clientsRes.ids;
  const serviceNameMatches = (serviceRes.data.name ?? "")
    .toLowerCase()
    .includes(q.toLowerCase());

  const selectFields =
    "id, account_receipt_number, clients(name, last_name), services(id, name, image_bucket, image_path)";

  let receiptsQuery = supabase
    .from("receipts")
    .select(selectFields)
    .eq("service_id", sid)
    .order("created_at", { ascending: false })
    .limit(SEARCH_RECEIPTS_LIMIT);

  // If the query matches the service name, return accounts for that service.
  // Otherwise match account number and/or client name.
  if (!serviceNameMatches) {
    const receiptConditions = [`account_receipt_number.ilike.${pattern}`];
    if (clientIds.length > 0) {
      receiptConditions.push(
        `client_id.in.(${clientIds.map((id) => `"${id}"`).join(",")})`
      );
    }
    receiptsQuery = receiptsQuery.or(receiptConditions.join(","));
  }

  const { data: receipts, error } = await receiptsQuery;

  if (error) {
    return { error: error.message };
  }
  return { receipts: receipts ?? [] };
}
