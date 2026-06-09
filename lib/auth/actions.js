"use server";

import { getCurrentUserPermissions } from "@/lib/auth/permissions";

/**
 * Devuelve los permisos del usuario autenticado para el cliente.
 * @returns {Promise<{ error: string | null; permissions?: string[] }>}
 */
export async function getMyPermissionsAction() {
  const { userId, permissions } = await getCurrentUserPermissions();
  if (!userId) {
    return { error: "No autorizado.", permissions: [] };
  }
  return { error: null, permissions: Array.from(permissions) };
}
