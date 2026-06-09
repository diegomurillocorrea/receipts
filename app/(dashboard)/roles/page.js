import { getRolesAction } from "./actions";
import { requirePageView } from "@/lib/auth/page-access";
import { RolesView } from "./roles-view";

export const metadata = {
  title: "Roles",
};

export default async function RolesPage() {
  await requirePageView("roles");
  const result = await getRolesAction();

  return (
    <RolesView
      initialRoles={result.error ? [] : result.roles ?? []}
      fetchError={result.error ?? null}
    />
  );
}
