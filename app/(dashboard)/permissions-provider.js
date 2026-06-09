"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMyPermissionsAction } from "@/lib/auth/actions";
import { hasPermission, permissionKey } from "@/lib/auth/permission-catalog";

const PermissionsContext = createContext({
  permissions: /** @type {Set<string>} */ (new Set()),
  isLoading: true,
  can: () => false,
});

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getMyPermissionsAction();
      if (cancelled) return;
      setPermissions(new Set(result.permissions ?? []));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const can = useMemo(
    () => (resource, action) => hasPermission(permissions, resource, action),
    [permissions]
  );

  const value = useMemo(
    () => ({ permissions, isLoading, can }),
    [permissions, isLoading, can]
  );

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export { permissionKey };
