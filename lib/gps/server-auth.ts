import "server-only";
import { getAdminAuthState } from "@/lib/admin";
import { resolveGpsAdminPrincipal, createAuthorizedGpsAccess } from "@/lib/gps/access-policy";
import { isGpsDemoModeEnabled } from "@/lib/gps/runtime";
import {
  createGpsAdminServiceRoleClient,
  GpsAdminClientConfigurationError
} from "@/lib/gps/server-admin-client";

export async function getGpsAdminPrincipal() {
  return resolveGpsAdminPrincipal(await getAdminAuthState());
}

export async function getGpsAdminAccess() {
  const principal = await getGpsAdminPrincipal();
  return getGpsAdminAccessForPrincipal(principal);
}

export function getGpsAdminAccessForPrincipal(
  principal: Awaited<ReturnType<typeof getGpsAdminPrincipal>>
) {
  try {
    return createAuthorizedGpsAccess(
      principal,
      isGpsDemoModeEnabled(),
      createGpsAdminServiceRoleClient
    );
  } catch (error) {
    if (error instanceof GpsAdminClientConfigurationError) {
      return { status: "unavailable" as const };
    }
    throw error;
  }
}
