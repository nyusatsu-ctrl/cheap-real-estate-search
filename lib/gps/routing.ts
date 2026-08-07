export function isGpsAdminPath(pathname: string) {
  return pathname === "/admin/gps" || pathname.startsWith("/admin/gps/");
}
