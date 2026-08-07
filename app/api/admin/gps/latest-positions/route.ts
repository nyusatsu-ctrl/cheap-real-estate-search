import { authorizeGpsApiRequest } from "@/lib/gps/api-auth";
import { sampleGpsLatestPositions } from "@/lib/gps/sample-data";
import { getGpsAdminAccessForPrincipal } from "@/lib/gps/server-auth";

export async function GET() {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const access = getGpsAdminAccessForPrincipal(authorization.principal);
  if (access.status !== "authorized") {
    return Response.json({ message: "GPSデータベースへ接続できません。" }, { status: 500 });
  }
  if (access.mode === "demo") {
    return Response.json({ data: sampleGpsLatestPositions, demo: true });
  }

  const { data, error } = await access.client
    .from("gps_latest_positions")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[gps-api] latest_positions_failed", { code: String(error.code || "unknown") });
    return Response.json({ message: "GPS最新位置を取得できませんでした。" }, { status: 500 });
  }
  return Response.json({ data: data ?? [], demo: false });
}
