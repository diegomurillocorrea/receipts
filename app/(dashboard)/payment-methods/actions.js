"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";

/**
 * @typedef {Object} PaymentMethodFormData
 * @property {string} name
 */

/**
 * @param {PaymentMethodFormData} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createPaymentMethodAction(formData) {
  const auth = await requirePermission("payment_methods", "create");
  if (auth.error) return { error: auth.error };

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre del método de pago es requerido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      name,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payment-methods");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {PaymentMethodFormData} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updatePaymentMethodAction(id, formData) {
  const auth = await requirePermission("payment_methods", "edit");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del método de pago es requerido." };
  }

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre del método de pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({
      name,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payment-methods");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deletePaymentMethodAction(id) {
  const auth = await requirePermission("payment_methods", "delete");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del método de pago es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payment-methods");
  return { error: null };
}
