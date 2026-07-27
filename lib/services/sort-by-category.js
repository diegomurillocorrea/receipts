/**
 * Ordena servicios por nombre de categoría y luego por nombre del servicio.
 * Los servicios sin categoría quedan al final.
 *
 * @param {Array<{ name?: string | null; categories?: { name?: string | null } | null }>} services
 * @returns {typeof services}
 */
export function sortServicesByCategory(services) {
  if (!Array.isArray(services)) return [];

  return [...services].sort((a, b) => {
    const categoryA = (a?.categories?.name ?? "").trim().toLowerCase();
    const categoryB = (b?.categories?.name ?? "").trim().toLowerCase();
    const isEmptyA = categoryA.length === 0;
    const isEmptyB = categoryB.length === 0;

    if (isEmptyA !== isEmptyB) return isEmptyA ? 1 : -1;
    if (categoryA !== categoryB) {
      return categoryA.localeCompare(categoryB, "es", { sensitivity: "base" });
    }

    const nameA = (a?.name ?? "").trim();
    const nameB = (b?.name ?? "").trim();
    return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
  });
}
