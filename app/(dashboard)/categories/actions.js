"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";

/**
 * @typedef {Object} CategoryFormData
 * @property {string} name
 */

/**
 * @param {CategoryFormData} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createCategoryAction(formData) {
  const auth = await requirePermission("categories", "create");
  if (auth.error) return { error: auth.error };

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre de la categoría es requerido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una categoría con ese nombre." };
    }
    return { error: error.message };
  }

  revalidatePath("/categories");
  revalidatePath("/services");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {CategoryFormData} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updateCategoryAction(id, formData) {
  const auth = await requirePermission("categories", "edit");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID de la categoría es requerido." };
  }

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre de la categoría es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una categoría con ese nombre." };
    }
    return { error: error.message };
  }

  revalidatePath("/categories");
  revalidatePath("/services");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteCategoryAction(id) {
  const auth = await requirePermission("categories", "delete");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID de la categoría es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/categories");
  revalidatePath("/services");
  return { error: null };
}
