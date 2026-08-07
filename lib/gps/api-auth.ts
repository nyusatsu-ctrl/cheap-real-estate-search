import "server-only";
import { getGpsApiAuthError } from "@/lib/gps/api-security";
import { getGpsAdminPrincipal } from "@/lib/gps/server-auth";

export async function authorizeGpsApiRequest() {
  const principal = await getGpsAdminPrincipal();
  if (principal.status === "authorized") {
    return { ok: true as const, principal };
  }

  const authError = getGpsApiAuthError(principal.status);
  console.warn("[gps-api-auth]", principal.status);
  return {
    ok: false as const,
    response: Response.json({ message: authError.message }, { status: authError.status })
  };
}
