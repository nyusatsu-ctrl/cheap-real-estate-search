import type { AdminAuthState, AdminIdentity } from "@/lib/admin";

export type GpsAdminPrincipal =
  | { status: "authorized"; admin: AdminIdentity }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export function resolveGpsAdminPrincipal(state: AdminAuthState): GpsAdminPrincipal {
  if (state.status === "authorized") return { status: "authorized", admin: state.admin };
  return { status: state.status };
}

export function createAuthorizedGpsAccess<T>(
  principal: GpsAdminPrincipal,
  demoMode: boolean,
  createClient: () => T
):
  | { status: "authorized"; admin: AdminIdentity; mode: "demo"; client: null }
  | { status: "authorized"; admin: AdminIdentity; mode: "database"; client: T }
  | Exclude<GpsAdminPrincipal, { status: "authorized" }> {
  if (principal.status !== "authorized") return principal;
  if (demoMode) return { status: "authorized", admin: principal.admin, mode: "demo", client: null };
  return {
    status: "authorized",
    admin: principal.admin,
    mode: "database",
    client: createClient()
  };
}
