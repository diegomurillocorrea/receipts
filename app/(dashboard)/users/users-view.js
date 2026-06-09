"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePermissions } from "../permissions-provider";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  getRolesForSelectAction,
} from "./actions";

const EMPTY_FORM = {
  email: "",
  full_name: "",
  password: "",
  role_id: "",
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

export function UsersView({ initialUsers, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const users = initialUsers;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roles, setRoles] = useState([]);
  const { can } = usePermissions();
  const canCreate = can("users", "create");
  const canEdit = can("users", "edit");
  const canDelete = can("users", "delete");

  useEffect(() => {
    getRolesForSelectAction().then((result) => {
      if (!result.error && result.roles) setRoles(result.roles);
    });
  }, []);

  const isEditing = formOpen && formOpen !== "create";

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const openEdit = useCallback((user) => {
    setFormOpen(user);
    setFormData({
      email: user.email ?? "",
      full_name: user.full_name ?? "",
      password: "",
      role_id: user.role_id ?? "",
    });
    setFormError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (isEditing) {
      const result = await updateUserAction(formOpen.id, formData);
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createUserAction(formData);
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((user) => {
    setDeleteTarget(user);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteUserAction(deleteTarget.id);
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
            Usuarios
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
            Gestionar los usuarios del sistema (acceso e inicio de sesión).
          </p>
        </div>
        {canCreate && (
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 min-w-40 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
          aria-label="Agregar usuario"
        >
          Agregar usuario
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

      {users.length > 0 && (
        <div className="relative">
          <label htmlFor="user-search" className="sr-only">
            Buscar por nombre o correo
          </label>
          <input
            id="user-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full rounded-full border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-500/50 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            aria-label="Buscar usuarios por nombre o correo"
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
            Lista de usuarios
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {fetchError
                ? "No se pudieron cargar los usuarios."
                : "Aún no hay usuarios. Agrega tu primer usuario para comenzar."}
            </p>
            {!fetchError && canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                aria-label="Agregar usuario"
              >
                Agregar usuario
              </button>
            )}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se encontraron usuarios con ese criterio de búsqueda.
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
            {filteredUsers.map((user, index) => (
              <li
                key={user.id}
                className="flex flex-col gap-2 px-4 py-4 first:pt-4 last:pb-4 tablet:px-6"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-hidden>
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {user.full_name || "—"}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    Rol: {user.role_name || "Sin rol"}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDate(user.created_at)}
                  </span>
                </div>
                {(canEdit || canDelete) && (
                <div className="flex gap-3 pt-2">
                  {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    aria-label={`Editar ${user.email}`}
                  >
                    Editar
                  </button>
                  )}
                  {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(user)}
                    className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                    aria-label={`Eliminar ${user.email}`}
                  >
                    Eliminar
                  </button>
                  )}
                </div>
                )}
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
                    Correo
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Rol
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Creado
                  </th>
                  {(canEdit || canDelete) && (
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Acciones
                  </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                  >
                    <td className="w-12 px-2 py-3.5 text-zinc-500 dark:text-zinc-400 tablet:px-4" aria-label={`Fila ${index + 1}`}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50 tablet:px-6">
                      {user.full_name || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {user.email}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 tablet:px-6">
                      {user.role_name || "Sin rol"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-500 tablet:px-6">
                      {formatDate(user.created_at)}
                    </td>
                    {(canEdit || canDelete) && (
                    <td className="px-4 py-3.5 tablet:px-6">
                      <div className="flex gap-3">
                        {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                          aria-label={`Editar ${user.email}`}
                        >
                          Editar
                        </button>
                        )}
                        {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(user)}
                          className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                          aria-label={`Eliminar ${user.email}`}
                        >
                          Eliminar
                        </button>
                        )}
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm tablet:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-form-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2 id="user-form-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Editar usuario" : "Agregar usuario"}
            </h2>
            <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-5">
              <div>
                <label
                  htmlFor="user-full-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nombre
                </label>
                <input
                  id="user-full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  disabled={isSubmitting}
                  placeholder="Ej: Juan Pérez"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="user-email"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Correo <span className="text-red-500">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isSubmitting}
                  placeholder="correo@ejemplo.com"
                  className={inputClass}
                  aria-invalid={!!formError}
                />
              </div>
              <div>
                <label
                  htmlFor="user-password"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Contraseña {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  required={!isEditing}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={isSubmitting}
                  placeholder={isEditing ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
                  autoComplete="new-password"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing
                    ? "Escribe una nueva contraseña solo si deseas cambiarla."
                    : "Mínimo 6 caracteres."}
                </p>
              </div>
              <div>
                <label
                  htmlFor="user-role"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Rol
                </label>
                <select
                  id="user-role"
                  value={formData.role_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role_id: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className={inputClass}
                  aria-label="Seleccionar rol del usuario"
                >
                  <option value="">Sin rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label="Cancelar"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
                  aria-busy={isSubmitting}
                  aria-label={isEditing ? "Guardar cambios" : "Crear usuario"}
                >
                  {isSubmitting ? "Guardando…" : isEditing ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Eliminar usuario
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong>{deleteTarget.full_name || deleteTarget.email}</strong>
              ? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Cancelar"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-900"
                aria-busy={isDeleting}
                aria-label="Eliminar usuario"
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
