import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeSearchView, HomeSearchViewSkeleton } from "../home-view";

export async function generateMetadata({ params }) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();

  const name = service?.name?.trim();
  return {
    title: name ? `${name} · Búsqueda` : "Búsqueda",
  };
}

async function ServiceSearchPageContent({ serviceId }) {
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, link, image_bucket, image_path")
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !service) notFound();

  return <HomeSearchView service={service} />;
}

export default async function ServiceSearchPage({ params }) {
  const { serviceId } = await params;

  return (
    <Suspense fallback={<HomeSearchViewSkeleton />}>
      <ServiceSearchPageContent serviceId={serviceId} />
    </Suspense>
  );
}
