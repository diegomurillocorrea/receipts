"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_RECEIPTS_LIMIT = 25;
const SEARCH_CLIENTS_LIMIT = 25;

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

/**
 * Search clients by name, last name, or phone number (for linking a new account).
 * @param {string} query
 * @returns {Promise<{ error: string | null; clients?: { id: string; name: string; last_name: string; phone_number: string | null }[] }>}
 */
export async function searchClientsForHomeAction(query) {
  const auth = await requirePermission("payments", "view");
  if (auth.error) return { error: auth.error };

  const q = (query ?? "").trim();
  if (q.length < SEARCH_MIN_LENGTH) {
    return { clients: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const conditions = [
    `name.ilike.${pattern}`,
    `last_name.ilike.${pattern}`,
    `phone_number.ilike.${pattern}`,
  ];
  if (digits.length >= 2) {
    conditions.push(`phone_number.ilike.%${digits}%`);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, last_name, phone_number")
    .or(conditions.join(","))
    .order("name", { ascending: true })
    .limit(SEARCH_CLIENTS_LIMIT);

  if (error) {
    return { error: error.message };
  }

  return { clients: data ?? [] };
}

/**
 * Link an account/bill number to an existing client for a service, then the UI
 * navigates to /[serviceId]/[billId] to register the payment.
 * @param {{ clientId: string; serviceId: string; accountReceiptNumber: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function linkAccountToClientAction(payload) {
  const auth = await requirePermission("payments", "create");
  if (auth.error) return { error: auth.error };

  const clientId = (payload?.clientId ?? "").trim();
  const serviceId = (payload?.serviceId ?? "").trim();
  const accountReceiptNumber = (payload?.accountReceiptNumber ?? "").trim();

  if (!clientId || !serviceId || !accountReceiptNumber) {
    return {
      error: "El cliente, servicio y número de cuenta son requeridos.",
    };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("receipts")
    .select("id")
    .eq("service_id", serviceId)
    .eq("account_receipt_number", accountReceiptNumber)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existing) {
    return { error: "Esta cuenta ya está vinculada a un cliente." };
  }

  const { error } = await supabase.from("receipts").insert({
    client_id: clientId,
    service_id: serviceId,
    account_receipt_number: accountReceiptNumber,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  revalidatePath(`/${serviceId}`);
  revalidatePath(`/${serviceId}/${encodeURIComponent(accountReceiptNumber)}`);
  return { error: null };
}
