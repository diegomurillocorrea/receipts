"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePermissions } from "../permissions-provider";
import {
  RESOURCES,
  getActionsForResource,
  permissionKey,
} from "@/lib/auth/permission-catalog";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
} from "./actions";

const EMPTY_FORM = {
  name: "",
  description: "",
};

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * @param {{ resource: string; action: string }[]} permissions
 * @returns {Set<string>}
 */
function permissionsToSet(permissions) {
  return new Set((permissions ?? []).map((p) => permissionKey(p.resource, p.action)));
}

/**
 * @param {Set<string>} set
 * @returns {{ resource: string; action: string }[]}
 */
function setToPermissions(set) {
  return Array.from(set).map((key) => {
    const [resource, action] = key.split(":");
    return { resource, action };
  });
}

function PermissionMatrix({ selected, onChange, disabled }) {
  const toggle = (resource, action) => {
    if (disabled) return;
    const key = permissionKey(resource, action);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <th className="px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-300">
              Sección
            </th>
            <th className="px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-300">
              Permisos
            </th>
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((resource) => {
            const actions = getActionsForResource(resource.id);
            return (
              <tr
                key={resource.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="whitespace-nowrap px-3 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {resource.label}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => {
                      const key = permissionKey(resource.id, action.id);
                      const checked = selected.has(key);
                      return (
                        <label
                          key={key}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            checked
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(resource.id, action.id)}
                            className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            aria-label={`${resource.label} — ${action.label}`}
                          />
                          {action.label}
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RolesView({ initialRoles, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const { can } = usePermissions();
  const roles = initialRoles;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isEditing = formOpen && formOpen !== "create";
  const isSystemRole = isEditing && formOpen?.is_system;
  const canCreate = can("roles", "create");
  const canEdit = can("roles", "edit");
  const canDelete = can("roles", "delete");

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.trim().toLowerCase();
    return roles.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setSelectedPermissions(new Set());
    setFormError(null);
  }, []);

  const openEdit = useCallback((role) => {
    setFormOpen(role);
    setFormData({
      name: role.name ?? "",
      description: role.description ?? "",
    });
    setSelectedPermissions(permissionsToSet(role.permissions));
    setFormError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormData(EMPTY_FORM);
    setSelectedPermissions(new Set());
    setFormError(null);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      ...formData,
      permissions: setToPermissions(selectedPermissions),
    };

    if (isEditing) {
      const result = await updateRoleAction(formOpen.id, payload);
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createRoleAction(payload);
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((role) => {
    setDeleteTarget(role);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteRoleAction(deleteTarget.id);
    setIsDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  };

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

  return (
    <div className="space-y-6 tablet:space-y-8">
      <header className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
            Roles
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
            Crear roles y configurar permisos por sección y acción.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 min-w-40 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
            aria-label="Agregar rol"
          >
            Agregar rol
          </button>
        )}
      </header>

      {fetchError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      {roles.length > 0 && (
        <div className="relative">
          <label htmlFor="role-search" className="sr-only">
            Buscar roles
          </label>
          <input
            id="role-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full rounded-full border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-500/50 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            aria-label="Buscar roles"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/30 tablet:px-6">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Lista de roles
          </h2>
        </div>

        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {fetchError
                ? "No se pudieron cargar los roles."
                : "Aún no hay roles configurados."}
            </p>
            {canCreate && !fetchError && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                aria-label="Agregar rol"
              >
                Agregar rol
              </button>
            )}
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se encontraron roles con ese criterio.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              aria-label="Limpiar búsqueda"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : isMobile ? (
          <ul className="divide-y divide-zinc-200/80 dark:divide-zinc-800" role="list">
            {filteredRoles.map((role, index) => (
              <li key={role.id} className="flex flex-col gap-2 px-4 py-4 tablet:px-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-hidden>
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {role.name}
                    {role.is_system && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                        Sistema
                      </span>
                    )}
                  </span>
                  {role.description && (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {role.description}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {(role.permissions ?? []).length} permiso(s) · {formatDate(role.created_at)}
                  </span>
                </div>
                <div className="flex gap-3 pt-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEdit(role)}
                      className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                      aria-label={`Editar ${role.name}`}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && !role.is_system && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(role)}
                      className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      aria-label={`Eliminar ${role.name}`}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th className="w-12 px-2 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-4" scope="col">
                    #
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Nombre
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Descripción
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Permisos
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Creado
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role, index) => (
                  <tr
                    key={role.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                  >
                    <td className="w-12 px-2 py-3.5 text-zinc-500 dark:text-zinc-400 tablet:px-4">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50 tablet:px-6">
                      {role.name}
                      {role.is_system && (
                        <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          Sistema
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {role.description || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {(role.permissions ?? []).length}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 tablet:px-6">
                      {formatDate(role.created_at)}
                    </td>
                    <td className="px-4 py-3.5 tablet:px-6">
                      <div className="flex gap-3">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                            aria-label={`Editar ${role.name}`}
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && !role.is_system && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(role)}
                            className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                            aria-label={`Eliminar ${role.name}`}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm tablet:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-form-title"
        >
          <div
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2 id="role-form-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Editar rol" : "Agregar rol"}
            </h2>
            {isSystemRole && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                Este es un rol de sistema. Sus permisos no se pueden modificar desde aquí.
              </p>
            )}
            <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-5">
              <div>
                <label htmlFor="role-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  disabled={isSubmitting || isSystemRole}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="role-description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción
                </label>
                <input
                  id="role-description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  disabled={isSubmitting || isSystemRole}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permisos
                </span>
                <PermissionMatrix
                  selected={selectedPermissions}
                  onChange={setSelectedPermissions}
                  disabled={isSubmitting || isSystemRole}
                />
              </div>
              {formError && (
                <div role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {formError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                {!isSystemRole && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? "Guardando…" : isEditing ? "Guardar" : "Crear"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Eliminar rol
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar el rol <strong>{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50"
                aria-busy={isDeleting}
              >
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
