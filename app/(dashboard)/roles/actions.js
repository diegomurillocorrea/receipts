"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  getAllPermissionEntries,
  permissionKey,
  requirePermission,
} from "@/lib/auth/permissions";

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeText(value) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * @param {{ resource: string; action: string }[]} permissions
 * @returns {{ resource: string; action: string }[]}
 */
function sanitizePermissions(permissions) {
  const valid = new Set(
    getAllPermissionEntries().map((p) => permissionKey(p.resource, p.action))
  );
  const seen = new Set();
  const result = [];
  for (const p of permissions ?? []) {
    const key = permissionKey(p.resource, p.action);
    if (!valid.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push({ resource: p.resource, action: p.action });
  }
  return result;
}

/**
 * @returns {Promise<{ error: string | null; roles?: { id: string; name: string; description: string | null; is_system: boolean; created_at: string; permissions: { resource: string; action: string }[] }[] }>}
 */
export async function getRolesAction() {
  const auth = await requirePermission("roles", "view");
  if (auth.error) return { error: auth.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data: roles, error } = await admin
    .from("roles")
    .select("id, name, description, is_system, created_at")
    .order("name", { ascending: true });

  if (error) return { error: error.message };

  const roleIds = (roles ?? []).map((r) => r.id);
  if (roleIds.length === 0) {
    return { error: null, roles: [] };
  }

  const { data: perms, error: permsError } = await admin
    .from("role_permissions")
    .select("role_id, resource, action")
    .in("role_id", roleIds);

  if (permsError) return { error: permsError.message };

  const permsByRole = {};
  for (const p of perms ?? []) {
    if (!permsByRole[p.role_id]) permsByRole[p.role_id] = [];
    permsByRole[p.role_id].push({ resource: p.resource, action: p.action });
  }

  return {
    error: null,
    roles: (roles ?? []).map((r) => ({
      ...r,
      permissions: permsByRole[r.id] ?? [],
    })),
  };
}

/**
 * @param {{ name: string; description?: string; permissions: { resource: string; action: string }[] }} formData
 */
export async function createRoleAction(formData) {
  const auth = await requirePermission("roles", "create");
  if (auth.error) return { error: auth.error };

  const name = normalizeText(formData.name);
  const description = normalizeText(formData.description);
  const permissions = sanitizePermissions(formData.permissions);

  if (!name) return { error: "El nombre del rol es requerido." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data: role, error } = await admin
    .from("roles")
    .insert({ name, description, is_system: false })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (permissions.length > 0) {
    const { error: permError } = await admin.from("role_permissions").insert(
      permissions.map((p) => ({
        role_id: role.id,
        resource: p.resource,
        action: p.action,
      }))
    );
    if (permError) return { error: permError.message };
  }

  revalidatePath("/roles");
  revalidatePath("/users");
  return { error: null, data: { id: role.id } };
}

/**
 * @param {string} id
 * @param {{ name: string; description?: string; permissions: { resource: string; action: string }[] }} formData
 */
export async function updateRoleAction(id, formData) {
  const auth = await requirePermission("roles", "edit");
  if (auth.error) return { error: auth.error };

  if (!id) return { error: "El ID del rol es requerido." };

  const name = normalizeText(formData.name);
  const description = normalizeText(formData.description);
  const permissions = sanitizePermissions(formData.permissions);

  if (!name) return { error: "El nombre del rol es requerido." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data: existing } = await admin
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (existing?.is_system) {
    return { error: "El rol de sistema Administrador no se puede modificar." };
  }

  const { error } = await admin
    .from("roles")
    .update({ name, description })
    .eq("id", id);

  if (error) return { error: error.message };

  await admin.from("role_permissions").delete().eq("role_id", id);

  if (permissions.length > 0) {
    const { error: permError } = await admin.from("role_permissions").insert(
      permissions.map((p) => ({
        role_id: id,
        resource: p.resource,
        action: p.action,
      }))
    );
    if (permError) return { error: permError.message };
  }

  revalidatePath("/roles");
  revalidatePath("/users");
  return { error: null };
}

/**
 * @param {string} id
 */
export async function deleteRoleAction(id) {
  const auth = await requirePermission("roles", "delete");
  if (auth.error) return { error: auth.error };

  if (!id) return { error: "El ID del rol es requerido." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de configuración." };
  }

  const { data: existing } = await admin
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (existing?.is_system) {
    return { error: "El rol de sistema Administrador no se puede eliminar." };
  }

  const { count } = await admin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role_id", id);

  if (count && count > 0) {
    return { error: "No se puede eliminar un rol asignado a usuarios." };
  }

  const { error } = await admin.from("roles").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/roles");
  return { error: null };
}
