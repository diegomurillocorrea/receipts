"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  SERVICE_IMAGE_ALLOWED_TYPES,
  SERVICE_IMAGE_BUCKET,
  SERVICE_IMAGE_MAX_SIZE_BYTES,
} from "./constants";

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeLink(value) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * @param {{ name: string; link?: string }} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createServiceAction(formData) {
  const auth = await requirePermission("services", "create");
  if (auth.error) return { error: auth.error };

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre es requerido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({ name, link: normalizeLink(formData.link) })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { data: { id: data.id } };
}

/**
 * @param {string} id
 * @param {{ name: string; link?: string }} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updateServiceAction(id, formData) {
  const auth = await requirePermission("services", "edit");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del servicio es requerido." };
  }

  const name = formData.name?.trim();

  if (!name) {
    return { error: "El nombre es requerido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ name, link: normalizeLink(formData.link) })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteServiceAction(id) {
  const auth = await requirePermission("services", "delete");
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del servicio es requerido." };
  }

  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("image_bucket, image_path")
    .eq("id", id)
    .single();

  if (service?.image_bucket && service?.image_path) {
    await supabase.storage.from(service.image_bucket).remove([service.image_path]);
  }

  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null };
}

/**
 * Sube la imagen de un servicio a Supabase Storage y guarda la referencia en la fila.
 * @param {string} serviceId
 * @param {FormData} formData - debe contener un archivo bajo la clave "image"
 * @returns {Promise<{ error: string | null; image_bucket?: string; image_path?: string }>}
 */
export async function uploadServiceImageAction(serviceId, formData) {
  const auth = await requirePermission("services", "edit");
  if (auth.error) return { error: auth.error };

  if (!serviceId) {
    return { error: "El ID del servicio es requerido." };
  }

  const file = formData?.get("image");
  if (!file || !(file instanceof File)) {
    return { error: "Selecciona una imagen para subir." };
  }

  if (!SERVICE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return { error: "Formato no válido. Usa JPG, PNG, GIF o WebP." };
  }

  if (file.size > SERVICE_IMAGE_MAX_SIZE_BYTES) {
    return { error: "La imagen no debe superar 5 MB." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("services")
    .select("image_bucket, image_path")
    .eq("id", serviceId)
    .single();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${serviceId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SERVICE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("services")
    .update({ image_bucket: SERVICE_IMAGE_BUCKET, image_path: path })
    .eq("id", serviceId);

  if (updateError) {
    return { error: updateError.message };
  }

  if (existing?.image_bucket && existing?.image_path) {
    await supabase.storage.from(existing.image_bucket).remove([existing.image_path]);
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null, image_bucket: SERVICE_IMAGE_BUCKET, image_path: path };
}

/**
 * Quita la imagen de un servicio (borra de Storage y limpia la referencia).
 * @param {string} serviceId
 * @returns {Promise<{ error: string | null }>}
 */
export async function removeServiceImageAction(serviceId) {
  const auth = await requirePermission("services", "edit");
  if (auth.error) return { error: auth.error };

  if (!serviceId) {
    return { error: "El ID del servicio es requerido." };
  }

  const supabase = await createClient();
  const { data: service, error: fetchError } = await supabase
    .from("services")
    .select("image_bucket, image_path")
    .eq("id", serviceId)
    .single();

  if (fetchError || !service) {
    return { error: fetchError?.message ?? "Servicio no encontrado." };
  }

  if (service.image_bucket && service.image_path) {
    await supabase.storage.from(service.image_bucket).remove([service.image_path]);
  }

  const { error: updateError } = await supabase
    .from("services")
    .update({ image_bucket: null, image_path: null })
    .eq("id", serviceId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  return { error: null };
}
