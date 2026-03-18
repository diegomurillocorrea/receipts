"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PAYMENT_PROOF_BUCKET, PAYMENT_STATUS_PAID, PAYMENT_STATUS_PENDING } from "./constants";

const SEARCH_DEBOUNCE_MIN_LENGTH = 2;
const SEARCH_RECEIPTS_LIMIT = 25;

/**
 * Commission by total_amount: $1 → $0.50; >$1 and <$50 → $1; >=$50 and <$100 → $2; >=$100 and <$150 → $3; etc.
 * @param {number} totalAmount
 * @returns {number}
 */
function computeCommission(totalAmount) {
  const n = Number(totalAmount);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n === 0) return 0;
  if (n === 1) return 0.5;
  if (n < 50) return 1;
  return Math.floor(n / 50) + 1;
}

/**
 * Search receipts by client name, last name, service name, or account/receipt number.
 * @param {string} query
 * @returns {Promise<{ error: string | null; receipts?: { id: string; account_receipt_number: string; clients: { name: string; last_name: string } | null; services: { name: string } | null }[] }>}
 */
export async function searchReceiptsForPaymentAction(query) {
  const q = (query ?? "").trim();
  if (q.length < SEARCH_DEBOUNCE_MIN_LENGTH) {
    return { receipts: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [clientsRes, servicesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .or(`name.ilike.${pattern},last_name.ilike.${pattern}`)
      .limit(50),
    supabase.from("services").select("id").ilike("name", pattern).limit(20),
  ]);

  const clientIds = (clientsRes.data ?? []).map((c) => c.id);
  const serviceIds = (servicesRes.data ?? []).map((s) => s.id);

  const receiptConditions = [`account_receipt_number.ilike.${pattern}`];
  if (clientIds.length > 0) {
    receiptConditions.push(`client_id.in.(${clientIds.map((id) => `"${id}"`).join(",")})`);
  }
  if (serviceIds.length > 0) {
    receiptConditions.push(`service_id.in.(${serviceIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, account_receipt_number, clients(name, last_name), services(name)")
    .or(receiptConditions.join(","))
    .order("created_at", { ascending: false })
    .limit(SEARCH_RECEIPTS_LIMIT);

  if (error) {
    return { error: error.message };
  }
  return { receipts: receipts ?? [] };
}

/**
 * @param {{ receipt_id: string; total_amount: number; payment_method_id: string; status?: number; created_at?: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function createPaymentAction(payload) {
  const receipt_id = payload.receipt_id?.trim();
  const total_amount = Number(payload.total_amount);
  const payment_method_id = payload.payment_method_id?.trim();
  const status =
    payload.status === PAYMENT_STATUS_PAID ? PAYMENT_STATUS_PAID : PAYMENT_STATUS_PENDING;
  const created_at = payload.created_at?.trim() || null;

  if (!receipt_id) {
    return { error: "El recibo es requerido." };
  }

  if (Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "El monto debe ser cero o mayor." };
  }

  if (!payment_method_id) {
    return { error: "El método de pago es requerido." };
  }

  const insertPayload = {
    receipt_id,
    total_amount,
    payment_method_id,
    status,
    commission: computeCommission(total_amount),
  };
  if (created_at) {
    insertPayload.created_at = created_at;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert(insertPayload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @param {{ receipt_id: string; total_amount: number; payment_method_id: string; status?: number; created_at?: string }} payload
 * @returns {Promise<{ error: string | null }>}
 */
export async function updatePaymentAction(id, payload) {
  if (!id) {
    return { error: "El ID del pago es requerido." };
  }

  const receipt_id = payload.receipt_id?.trim();
  const total_amount = Number(payload.total_amount);
  const payment_method_id = payload.payment_method_id?.trim();
  const status =
    payload.status === PAYMENT_STATUS_PAID ? PAYMENT_STATUS_PAID : PAYMENT_STATUS_PENDING;
  const created_at = payload.created_at?.trim() || null;

  if (!receipt_id) {
    return { error: "El recibo es requerido." };
  }

  if (Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "El monto debe ser cero o mayor." };
  }

  if (!payment_method_id) {
    return { error: "El método de pago es requerido." };
  }

  const updatePayload = {
    receipt_id,
    total_amount,
    payment_method_id,
    status,
    commission: computeCommission(total_amount),
  };
  if (created_at) {
    updatePayload.created_at = created_at;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deletePaymentAction(id) {
  if (!id) {
    return { error: "El ID del pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * Upload a proof image for a payment. File is stored in Supabase Storage; payment row stores path.
 * @param {string} paymentId
 * @param {FormData} formData - must contain a file under key "proof"
 * @returns {Promise<{ error: string | null; publicUrl?: string; proof_path?: string; proof_bucket?: string }>}
 */
export async function uploadPaymentProofAction(paymentId, formData) {
  if (!paymentId) {
    return { error: "El ID del pago es requerido." };
  }

  const file = formData?.get("proof");
  if (!file || !(file instanceof File)) {
    return { error: "Selecciona una imagen para subir." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato no válido. Usa JPG, PNG, GIF o WebP." };
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    return { error: "La imagen no debe superar 5 MB." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${paymentId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({ proof_bucket: PAYMENT_PROOF_BUCKET, proof_path: path })
    .eq("id", paymentId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { data: urlData } = supabase.storage.from(PAYMENT_PROOF_BUCKET).getPublicUrl(path);
  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null, publicUrl: urlData?.publicUrl, proof_path: path, proof_bucket: PAYMENT_PROOF_BUCKET };
}

/**
 * Remove the proof image from a payment (delete from storage and clear reference).
 * @param {string} paymentId
 * @returns {Promise<{ error: string | null }>}
 */
export async function removePaymentProofAction(paymentId) {
  if (!paymentId) {
    return { error: "El ID del pago es requerido." };
  }

  const supabase = await createClient();
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("proof_bucket, proof_path")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    return { error: fetchError?.message ?? "Pago no encontrado." };
  }

  if (payment.proof_bucket && payment.proof_path) {
    await supabase.storage.from(payment.proof_bucket).remove([payment.proof_path]);
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({ proof_bucket: null, proof_path: null })
    .eq("id", paymentId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/payments");
  revalidatePath("/");
  return { error: null };
}

/**
 * Get a signed URL for the payment proof image (works with public or private buckets).
 * @param {string} paymentId
 * @returns {Promise<{ error: string | null; url?: string }>}
 */
export async function getPaymentProofUrlAction(paymentId) {
  if (!paymentId) {
    return { error: "El ID del pago es requerido." };
  }

  const supabase = await createClient();
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("proof_bucket, proof_path")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment?.proof_bucket || !payment?.proof_path) {
    return { error: fetchError?.message ?? "No hay comprobante para este pago." };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(payment.proof_bucket)
    .createSignedUrl(payment.proof_path, 3600); // 1 hour

  if (signError) {
    return { error: signError.message };
  }
  if (!signed?.signedUrl) {
    return { error: "No se pudo generar el enlace de la imagen." };
  }
  return { error: null, url: signed.signedUrl };
}
