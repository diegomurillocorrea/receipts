/** Routes whose list/table body scrolls inside the dashboard shell. */
export const TABLE_SCROLL_PATHS = [
  "/payments",
  "/clients",
  "/services",
  "/categories",
  "/payment-methods",
  "/users",
  "/roles",
];

export function usesTableScrollShell(pathname) {
  return TABLE_SCROLL_PATHS.includes(pathname);
}

export const tableViewRootClass =
  "flex min-h-0 flex-1 flex-col gap-6 tablet:gap-8";

export const tableViewSectionClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const tableViewSectionTitleClass =
  "shrink-0 border-b-2 border-emerald-500 bg-emerald-50/40 px-4 py-3.5 dark:bg-emerald-950/20 tablet:px-6";

export const tableScrollBodyClass = "min-h-0 flex-1 overflow-auto";

export const tableMobileListClass =
  "min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800";

export const tableMobileListAltClass =
  "min-h-0 flex-1 divide-y divide-zinc-200/80 overflow-y-auto dark:divide-zinc-800";

export const tableHeadClass =
  "sticky top-0 z-10 bg-white dark:bg-zinc-900";

export const tableHeadCellClass =
  "bg-white dark:bg-zinc-900";
