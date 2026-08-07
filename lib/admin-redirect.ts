const DEFAULT_ADMIN_PATH = "/admin/sales-contracts";
const SAFE_ORIGIN = "https://admin.local";

export function sanitizeAdminRedirectPath(value: unknown, fallback = DEFAULT_ADMIN_PATH) {
  const candidate = String(value ?? "").trim();
  if (!candidate || candidate.includes("\\") || candidate.includes("\0")) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  try {
    const decodedPath = decodeURIComponent(candidate.split(/[?#]/, 1)[0]);
    if (decodedPath.startsWith("//") || decodedPath.includes("\\")) return fallback;

    const url = new URL(candidate, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) return fallback;
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return fallback;
    if (url.pathname === "/admin/login" || url.pathname.startsWith("/admin/login/")) return fallback;
    if (url.username || url.password) return fallback;

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function getAdminLoginPath(nextPath?: string) {
  const safePath = sanitizeAdminRedirectPath(nextPath, "");
  if (!safePath) return "/admin/login";
  return `/admin/login?${new URLSearchParams({ next: safePath }).toString()}`;
}
