import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { ServicesView } from "./services-view";

export const metadata = {
  title: "Servicios",
};

export default async function ServicesPage() {
  await requirePageView("services");
  const supabase = await createClient();
  const { data: services = [], error } = await supabase
    .from("services")
    .select("id, name, created_at, link, image_bucket, image_path")
    .order("created_at", { ascending: false });

  return (
    <ServicesView
      initialServices={error ? [] : services}
      fetchError={error?.message ?? null}
    />
  );
}
