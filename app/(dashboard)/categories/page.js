import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { CategoriesView } from "./categories-view";

export const metadata = {
  title: "Categorías",
};

export default async function CategoriesPage() {
  await requirePageView("categories");
  const supabase = await createClient();
  const { data: categories = [], error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <CategoriesView
      initialCategories={categoriesError ? [] : categories}
      fetchError={categoriesError?.message ?? null}
    />
  );
}
