import { UsersView } from "./users-view";
import { getUsersAction } from "./actions";

export const metadata = {
  title: "Usuarios",
};

export default async function UsersPage() {
  const result = await getUsersAction();

  return (
    <UsersView
      initialUsers={result.error ? [] : result.users ?? []}
      fetchError={result.error ?? null}
    />
  );
}
