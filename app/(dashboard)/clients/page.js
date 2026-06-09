import { createClient } from "@/lib/supabase/server";
import { requirePageView } from "@/lib/auth/page-access";
import { ClientsView } from "./clients-view";

export const metadata = {
  title: "Clientes",
};

export default async function ClientsPage() {
  await requirePageView("clients");
  const supabase = await createClient();
  const { data: clients = [], error } = await supabase
    .from("clients")
    .select("id, name, last_name, phone_number, reference, created_at")
    .order("created_at", { ascending: false });

  return (
    <ClientsView
      initialClients={error ? [] : clients}
      fetchError={error?.message ?? null}
    />
  );
}
