import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { sortServicesByCategory } from "@/lib/services/sort-by-category";
import { HomeView, HomeViewSkeleton } from "./home-view";

export const metadata = {
  title: "Inicio",
};

async function HomePageContent() {
  const supabase = await createClient();
  const { data: services = [], error } = await supabase
    .from("services")
    .select("id, name, image_bucket, image_path, category_id, categories(id, name)");

  return (
    <HomeView
      services={error ? [] : sortServicesByCategory(services ?? [])}
      fetchError={error?.message ?? null}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeViewSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
