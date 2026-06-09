import { UsersView } from "./users-view";
import { getUsersAction } from "./actions";
import { requirePageView } from "@/lib/auth/page-access";

export const metadata = {
  title: "Usuarios",
};

export default async function UsersPage() {
  await requirePageView("users");
  const result = await getUsersAction();

  return (
    <UsersView
      initialUsers={result.error ? [] : result.users ?? []}
      fetchError={result.error ?? null}
    />
  );
}
