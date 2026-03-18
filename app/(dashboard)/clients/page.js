import { createClient } from "@/lib/supabase/server";
import { ClientsView } from "./clients-view";

export const metadata = {
  title: "Clientes",
};

export default async function ClientsPage() {
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
