import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { sortServicesByCategory } from "@/lib/services/sort-by-category";
import { ServicesView } from "./services-view";

export const metadata = {
  title: "Servicios",
};

export default async function ServicesPage() {
  await requirePageView("services");
  const supabase = await createClient();
  const [
    { data: services = [], error },
    { data: categories = [], error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, name, created_at, link, image_bucket, image_path, category_id, categories(id, name)"
      ),
    supabase.from("categories").select("id, name").order("name", { ascending: true }),
  ]);

  const fetchError =
    error?.message ?? categoriesError?.message ?? null;

  return (
    <ServicesView
      initialServices={error ? [] : sortServicesByCategory(services)}
      initialCategories={categoriesError ? [] : categories}
      fetchError={fetchError}
    />
  );
}
