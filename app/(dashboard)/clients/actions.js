"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * @typedef {Object} ClientFormData
 * @property {string} name
 * @property {string} last_name
 * @property {string} [phone_number]
 * @property {string} [reference]
 */

/**
 * @typedef {Object} ExistingClient
 * @property {string} id
 * @property {string} name
 * @property {string} last_name
 * @property {string | null} phone_number
 * @property {string | null} reference
 */

/**
 * Find an existing client that uses the given phone number.
 * Optionally exclude a client id (used when editing).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} phoneNumber
 * @param {string} [excludeId]
 * @returns {Promise<{ error: string | null; client?: ExistingClient | null }>}
 */
async function findClientByPhone(supabase, phoneNumber, excludeId) {
  let query = supabase
    .from("clients")
    .select("id, name, last_name, phone_number, reference")
    .eq("phone_number", phoneNumber)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { error: error.message };
  }
  return { error: null, client: data ?? null };
}

/**
 * @param {ClientFormData} formData
 * @returns {Promise<{ error: string | null; data?: { id: string }; duplicate?: ExistingClient }>}
 */
export async function createClientAction(formData) {
  const name = formData.name?.trim();
  const last_name = formData.last_name?.trim();
  const phone_number = formData.phone_number?.trim() || null;

  if (!name || !last_name) {
    return { error: "El nombre y apellido son requeridos." };
  }

  const supabase = await createClient();

  if (phone_number) {
    const { error: lookupError, client: existing } = await findClientByPhone(
      supabase,
      phone_number
    );
    if (lookupError) {
      return { error: lookupError };
    }
    if (existing) {
      return {
        error: "Ya existe un contacto con ese número de teléfono.",
        duplicate: existing,
      };
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      last_name,
      phone_number,
      reference: formData.reference?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {ClientFormData} formData
 * @returns {Promise<{ error: string | null; duplicate?: ExistingClient }>}
 */
export async function updateClientAction(id, formData) {
  if (!id) {
    return { error: "El ID del cliente es requerido." };
  }

  const name = formData.name?.trim();
  const last_name = formData.last_name?.trim();
  const phone_number = formData.phone_number?.trim() || null;

  if (!name || !last_name) {
    return { error: "El nombre y apellido son requeridos." };
  }

  const supabase = await createClient();

  if (phone_number) {
    const { error: lookupError, client: existing } = await findClientByPhone(
      supabase,
      phone_number,
      id
    );
    if (lookupError) {
      return { error: lookupError };
    }
    if (existing) {
      return {
        error: "Ya existe un contacto con ese número de teléfono.",
        duplicate: existing,
      };
    }
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      last_name,
      phone_number,
      reference: formData.reference?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteClientAction(id) {
  if (!id) {
    return { error: "El ID del cliente es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

// --- Receipts (client–service links) ---

/**
 * @returns {Promise<{ error: string | null; services?: { id: string; name: string }[] }>}
 */
export async function getServicesListAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, image_bucket, image_path")
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message };
  }
  return { services: data ?? [] };
}

/**
 * @param {string} clientId
 * @returns {Promise<{ error: string | null; receipts?: { id: string; service_id: string; account_receipt_number: string }[] }>}
 */
export async function getClientReceiptsAction(clientId) {
  if (!clientId) {
    return { error: "El ID del cliente es requerido." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("id, service_id, account_receipt_number")
    .eq("client_id", clientId);

  if (error) {
    return { error: error.message };
  }
  return { receipts: data ?? [] };
}

/**
 * @param {{ client_id: string; service_id: string; account_receipt_number: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function createReceiptAction(payload) {
  const account_receipt_number = payload.account_receipt_number?.trim();
  if (!payload.client_id || !payload.service_id || !account_receipt_number) {
    return { error: "El cliente, servicio y número de cuenta/recibo son requeridos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("receipts").insert({
    client_id: payload.client_id,
    service_id: payload.service_id,
    account_receipt_number,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} clientId
 * @param {string} serviceId
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteReceiptAction(clientId, serviceId) {
  if (!clientId || !serviceId) {
    return { error: "El ID del cliente y el ID del servicio son requeridos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("client_id", clientId)
    .eq("service_id", serviceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/**
 * Delete a single receipt by id (allows multiple receipts per client+service).
 * @param {string} receiptId
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteReceiptByIdAction(receiptId) {
  if (!receiptId) {
    return { error: "El ID del recibo es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}
