"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const ALLOWED_ADMIN_EMAIL = "diegomurillocorrea@gmail.com";

/**
 * Verifica que el usuario autenticado sea el administrador permitido.
 * @returns {Promise<{ error: string | null; currentUserId?: string }>}
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || user.email !== ALLOWED_ADMIN_EMAIL) {
    return { error: "No autorizado." };
  }
  return { error: null, currentUserId: user.id };
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeText(value) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * Lista los usuarios del sistema (Supabase Auth).
 * @returns {Promise<{ error: string | null; users?: { id: string; email: string | null; full_name: string | null; created_at: string | null; last_sign_in_at: string | null }[] }>}
 */
export async function getUsersAction() {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return { error: error.message };
  }

  const users = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
    created_at: u.created_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));

  return { error: null, users };
}

/**
 * @param {{ email: string; password: string; full_name?: string }} formData
 * @returns {Promise<{ error: string | null; data?: { id: string } }>}
 */
export async function createUserAction(formData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const email = normalizeText(formData.email)?.toLowerCase();
  const password = String(formData.password ?? "");
  const full_name = normalizeText(formData.full_name);

  if (!email) {
    return { error: "El correo es requerido." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : {},
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/users");
  return { error: null, data: { id: data.user.id } };
}

/**
 * @param {string} id
 * @param {{ email: string; full_name?: string; password?: string }} formData
 * @returns {Promise<{ error: string | null }>}
 */
export async function updateUserAction(id, formData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del usuario es requerido." };
  }

  const email = normalizeText(formData.email)?.toLowerCase();
  const full_name = normalizeText(formData.full_name);
  const password = String(formData.password ?? "");

  if (!email) {
    return { error: "El correo es requerido." };
  }
  if (password && password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  /** @type {{ email: string; user_metadata: Record<string, unknown>; password?: string }} */
  const updatePayload = {
    email,
    user_metadata: { full_name: full_name ?? null },
  };
  if (password) {
    updatePayload.password = password;
  }

  const { error } = await admin.auth.admin.updateUserById(id, updatePayload);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/users");
  return { error: null };
}

/**
 * @param {string} id
 * @returns {Promise<{ error: string | null }>}
 */
export async function deleteUserAction(id) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!id) {
    return { error: "El ID del usuario es requerido." };
  }
  if (id === auth.currentUserId) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/users");
  return { error: null };
}
