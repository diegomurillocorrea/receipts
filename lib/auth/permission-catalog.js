/** Catálogo de permisos (sin dependencias de servidor). */

export const RESOURCES = [
  { id: "payments", label: "Pagos" },
  { id: "clients", label: "Clientes" },
  { id: "services", label: "Servicios" },
  { id: "payment_methods", label: "Métodos de pago" },
  { id: "users", label: "Usuarios" },
  { id: "roles", label: "Roles" },
];

export const BASE_ACTIONS = [
  { id: "view", label: "Ver" },
  { id: "create", label: "Crear" },
  { id: "edit", label: "Editar" },
  { id: "delete", label: "Eliminar" },
];

export const PAYMENTS_EXTRA_ACTIONS = [
  { id: "view_status", label: "Ver estado" },
  { id: "manage_proof", label: "Gestionar comprobante" },
  { id: "send_voucher", label: "Enviar comprobante" },
];

/**
 * @param {string} resource
 * @returns {{ id: string; label: string }[]}
 */
export function getActionsForResource(resource) {
  if (resource === "payments") {
    return [...BASE_ACTIONS, ...PAYMENTS_EXTRA_ACTIONS];
  }
  return BASE_ACTIONS;
}

/**
 * @returns {{ resource: string; action: string }[]}
 */
export function getAllPermissionEntries() {
  const entries = [];
  for (const resource of RESOURCES) {
    for (const action of getActionsForResource(resource.id)) {
      entries.push({ resource: resource.id, action: action.id });
    }
  }
  return entries;
}

/**
 * @param {string} resource
 * @param {string} action
 * @returns {string}
 */
export function permissionKey(resource, action) {
  return `${resource}:${action}`;
}

/**
 * @param {Set<string>} permissions
 * @param {string} resource
 * @param {string} action
 * @returns {boolean}
 */
export function hasPermission(permissions, resource, action) {
  return permissions.has(permissionKey(resource, action));
}
