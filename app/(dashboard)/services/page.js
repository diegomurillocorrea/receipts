import { createClient } from "@/lib/supabase/server";
import { ServicesView } from "./services-view";

export const metadata = {
  title: "Servicios",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services = [], error } = await supabase
    .from("services")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <ServicesView
      initialServices={error ? [] : services}
      fetchError={error?.message ?? null}
    />
  );
}
