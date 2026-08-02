"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { TableEditDeleteActions } from "@/components/table-edit-delete-actions";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { formatDateEsSv } from "@/lib/datetime";
import {
  tableHeadClass,
  tableMobileListAltClass,
  tableScrollBodyClass,
  tableViewRootClass,
  tableViewSectionClass,
  tableViewSectionTitleClass,
} from "@/lib/table-scroll-shell";
import { usePermissions } from "../permissions-provider";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./actions";

const EMPTY_FORM = {
  name: "",
};

export function CategoriesView({ initialCategories, fetchError }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const { can } = usePermissions();
  const canCreate = can("categories", "create");
  const canEdit = can("categories", "edit");
  const canDelete = can("categories", "delete");
  const categories = initialCategories;
  const [formOpen, setFormOpen] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isEditing = formOpen && formOpen !== "create";

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const openCreate = useCallback(() => {
    setFormOpen("create");
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const openEdit = useCallback((category) => {
    setFormOpen(category);
    setFormData({
      name: category.name ?? "",
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
      const result = await updateCategoryAction(formOpen.id, formData);
      setIsSubmitting(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      closeForm();
      router.refresh();
      return;
    }

    const result = await createCategoryAction(formData);
    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  };

  const handleDeleteClick = useCallback((category) => {
    setDeleteTarget(category);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteCategoryAction(deleteTarget.id);
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
    <div className={tableViewRootClass}>
      <header className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-10 w-1 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
              Categorías
            </h1>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
              aria-label="Agregar categoría"
            >
              Agregar categoría
            </button>
          )}
        </div>
        <p className="pl-4 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
          Agrupa servicios (ej. Juegos, Cosméticos) para organizar el catálogo.
          {categories.length > 0 ? (
            <>
              {" "}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {categories.length}{" "}
                {categories.length === 1 ? "categoría" : "categorías"}
              </span>
            </>
          ) : null}
        </p>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      {categories.length > 0 && (
        <div className="relative shrink-0">
          <label htmlFor="category-search" className="sr-only">
            Buscar por nombre de la categoría
          </label>
          <input
            id="category-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de la categoría..."
            className="w-full rounded-full border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-500/50 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            aria-label="Buscar categorías por nombre"
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

      <div className={tableViewSectionClass}>
        <div className={tableViewSectionTitleClass}>
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Lista de categorías
          </h2>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-hidden
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay categorías. Agrega tu primera categoría para comenzar.
            </p>
            {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              aria-label="Agregar categoría"
            >
              Agregar categoría
            </button>
            )}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se encontraron categorías con ese criterio de búsqueda.
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
          <ul className={tableMobileListAltClass} role="list">
            {filteredCategories.map((category, index) => (
              <li
                key={category.id}
                className="flex flex-col gap-2 px-4 py-4 first:pt-4 last:pb-4 transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 tablet:px-6"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-hidden>
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {category.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDateEsSv(category.created_at)}
                  </span>
                </div>
                <TableEditDeleteActions
                  canEdit={canEdit}
                  canDelete={canDelete}
                  editLabel={`Editar ${category.name}`}
                  deleteLabel={`Eliminar ${category.name}`}
                  onEdit={() => openEdit(category)}
                  onDelete={() => handleDeleteClick(category)}
                  className="flex items-center gap-1 pt-2"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={tableScrollBodyClass}>
            <table className="w-full text-left text-sm" role="grid">
              <thead className={tableHeadClass}>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
                  <th className="w-12 px-2 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-4" scope="col">
                    #
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 tablet:px-6">
                    Nombre
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
                {filteredCategories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-emerald-50/40 dark:border-zinc-800 dark:hover:bg-emerald-950/10"
                  >
                    <td className="w-12 px-2 py-3.5 text-zinc-500 dark:text-zinc-400 tablet:px-4" aria-label={`Fila ${index + 1}`}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50 tablet:px-6">
                      {category.name}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-500 tablet:px-6">
                      {formatDateEsSv(category.created_at)}
                    </td>
                    {(canEdit || canDelete) && (
                    <td className="px-4 py-3.5 tablet:px-6">
                      <TableEditDeleteActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        editLabel={`Editar ${category.name}`}
                        deleteLabel={`Eliminar ${category.name}`}
                        onEdit={() => openEdit(category)}
                        onDelete={() => handleDeleteClick(category)}
                      />
                    </td>
                    )}
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
          aria-labelledby="category-form-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 tablet:p-8"
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <h2 id="category-form-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Editar categoría" : "Agregar categoría"}
            </h2>
            <form
              onSubmit={handleFormSubmit}
              className="mt-6 flex flex-col gap-5"
            >
              <div>
                <label
                  htmlFor="category-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isSubmitting}
                  placeholder="Ej: Juegos, Cosméticos"
                  className={inputClass}
                  aria-invalid={!!formError}
                />
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
                  aria-label={isEditing ? "Guardar cambios" : "Crear categoría"}
                >
                  {isSubmitting
                    ? "Guardando…"
                    : isEditing
                      ? "Guardar"
                      : "Crear"}
                </button>
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
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Eliminar categoría
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>{deleteTarget.name}</strong>
              ? Los servicios asociados quedarán sin categoría. Esta acción no se
              puede deshacer.
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
                aria-label="Eliminar categoría"
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
