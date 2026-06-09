"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeText(value) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * @returns {Promise<{ error: string | null; roles?: { id: string; name: string }[] }>}
 */
export async function getRolesForSelectAction() {
  const auth = await requirePermission("users", "view");
  if (auth.error) return { error: auth.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data, error } = await admin
    .from("roles")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) return { error: error.message };
  return { error: null, roles: data ?? [] };
}

/**
 * @returns {Promise<{ error: string | null; users?: { id: string; email: string | null; full_name: string | null; created_at: string | null; last_sign_in_at: string | null; role_id: string | null; role_name: string | null }[] }>}
 */
export async function getUsersAction() {
  const auth = await requirePermission("users", "view");
  if (auth.error) return { error: auth.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return { error: error.message };

  const userIds = (data?.users ?? []).map((u) => u.id);
  const { data: userRoles } = userIds.length
    ? await admin
        .from("user_roles")
        .select("user_id, role_id, roles(name)")
        .in("user_id", userIds)
    : { data: [] };

  const roleByUser = {};
  for (const ur of userRoles ?? []) {
    const roleName = Array.isArray(ur.roles) ? ur.roles[0]?.name : ur.roles?.name;
    roleByUser[ur.user_id] = { role_id: ur.role_id, role_name: roleName ?? null };
  }

  const users = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
    created_at: u.created_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    role_id: roleByUser[u.id]?.role_id ?? null,
    role_name: roleByUser[u.id]?.role_name ?? null,
  }));

  return { error: null, users };
}

/**
 * @param {string | null | undefined} userId
 * @param {string | null | undefined} roleId
 */
async function upsertUserRole(admin, userId, roleId) {
  if (!userId) return { error: "ID de usuario inválido." };

  if (!roleId) {
    await admin.from("user_roles").delete().eq("user_id", userId);
    return { error: null };
  }

  const { error } = await admin.from("user_roles").upsert(
    { user_id: userId, role_id: roleId },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * @param {{ email: string; password: string; full_name?: string; role_id?: string }} formData
 */
export async function createUserAction(formData) {
  const auth = await requirePermission("users", "create");
  if (auth.error) return { error: auth.error };

  const email = normalizeText(formData.email)?.toLowerCase();
  const password = String(formData.password ?? "");
  const full_name = normalizeText(formData.full_name);
  const role_id = normalizeText(formData.role_id);

  if (!email) return { error: "El correo es requerido." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

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

  if (error) return { error: error.message };

  if (role_id) {
    const roleResult = await upsertUserRole(admin, data.user.id, role_id);
    if (roleResult.error) return { error: roleResult.error };
  }

  revalidatePath("/users");
  return { error: null, data: { id: data.user.id } };
}

/**
 * @param {string} id
 * @param {{ email: string; full_name?: string; password?: string; role_id?: string }} formData
 */
export async function updateUserAction(id, formData) {
  const auth = await requirePermission("users", "edit");
  if (auth.error) return { error: auth.error };

  if (!id) return { error: "El ID del usuario es requerido." };

  const email = normalizeText(formData.email)?.toLowerCase();
  const full_name = normalizeText(formData.full_name);
  const password = String(formData.password ?? "");
  const role_id = formData.role_id === "" ? null : normalizeText(formData.role_id);

  if (!email) return { error: "El correo es requerido." };
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
  if (password) updatePayload.password = password;

  const { error } = await admin.auth.admin.updateUserById(id, updatePayload);
  if (error) return { error: error.message };

  if (formData.role_id !== undefined) {
    const roleResult = await upsertUserRole(admin, id, role_id);
    if (roleResult.error) return { error: roleResult.error };
  }

  revalidatePath("/users");
  return { error: null };
}

/**
 * @param {string} id
 */
export async function deleteUserAction(id) {
  const auth = await requirePermission("users", "delete");
  if (auth.error) return { error: auth.error };

  if (!id) return { error: "El ID del usuario es requerido." };
  if (id === auth.userId) return { error: "No puedes eliminar tu propia cuenta." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  await admin.from("user_roles").delete().eq("user_id", id);

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return { error: null };
}
