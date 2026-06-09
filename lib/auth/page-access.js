import { redirect } from "next/navigation";
import { getCurrentUserPermissions, hasPermission } from "@/lib/auth/permissions";

/**
 * @param {string} resource
 * @returns {Promise<{ allowed: boolean; userId: string | null }>}
 */
export async function checkPageAccess(resource) {
  const { userId, permissions } = await getCurrentUserPermissions();
  if (!userId) {
    redirect("/login");
  }
  const allowed = hasPermission(permissions, resource, "view");
  return { allowed, userId };
}

/**
 * @param {string} resource
 */
export async function requirePageView(resource) {
  const { allowed } = await checkPageAccess(resource);
  if (!allowed) {
    redirect("/payments");
  }
}
