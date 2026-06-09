import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAllPermissionEntries,
  hasPermission,
  permissionKey,
} from "@/lib/auth/permission-catalog";

export {
  RESOURCES,
  BASE_ACTIONS,
  PAYMENTS_EXTRA_ACTIONS,
  getActionsForResource,
  getAllPermissionEntries,
  permissionKey,
  hasPermission,
} from "@/lib/auth/permission-catalog";

export const SUPER_ADMIN_EMAIL = "diegomurillocorrea@gmail.com";

/**
 * @returns {Set<string>}
 */
export function getAllPermissionsSet() {
  return new Set(getAllPermissionEntries().map((p) => permissionKey(p.resource, p.action)));
}

/**
 * @returns {Promise<{ userId: string | null; email: string | null; permissions: Set<string> }>}
 */
export async function getCurrentUserPermissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, permissions: new Set() };
  }

  if (user.email === SUPER_ADMIN_EMAIL) {
    return {
      userId: user.id,
      email: user.email,
      permissions: getAllPermissionsSet(),
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { userId: user.id, email: user.email ?? null, permissions: new Set() };
  }

  const { data: userRole } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!userRole?.role_id) {
    return { userId: user.id, email: user.email ?? null, permissions: new Set() };
  }

  const { data: rolePerms } = await admin
    .from("role_permissions")
    .select("resource, action")
    .eq("role_id", userRole.role_id);

  const permissions = new Set(
    (rolePerms ?? []).map((p) => permissionKey(p.resource, p.action))
  );

  return { userId: user.id, email: user.email ?? null, permissions };
}

/**
 * @param {string} resource
 * @param {string} action
 * @returns {Promise<{ error: string | null; userId?: string; email?: string | null }>}
 */
export async function requirePermission(resource, action) {
  const { userId, email, permissions } = await getCurrentUserPermissions();

  if (!userId) {
    return { error: "No autorizado." };
  }

  if (!hasPermission(permissions, resource, action)) {
    return { error: "No autorizado." };
  }

  return { error: null, userId, email };
}
