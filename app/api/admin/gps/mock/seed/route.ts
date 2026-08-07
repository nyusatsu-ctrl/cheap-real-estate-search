import { NextRequest } from "next/server";
import { authorizeGpsApiRequest } from "@/lib/gps/api-auth";
import { parseGpsJsonObject, validateGpsApiMutationRequest } from "@/lib/gps/api-security";
import { sampleGpsAdminData } from "@/lib/gps/sample-data";
import { isGpsMockRouteAvailable } from "@/lib/gps/runtime";

export async function POST(request: NextRequest) {
  if (!isGpsMockRouteAvailable()) return Response.json({ message: "Not found" }, { status: 404 });

  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const requestError = validateGpsApiMutationRequest(request);
  if (requestError) {
    return Response.json({ message: requestError.message }, { status: requestError.status });
  }
  const parsedBody = await parseGpsJsonObject(request);
  if (!parsedBody.ok) {
    return Response.json({ message: parsedBody.error.message }, { status: parsedBody.error.status });
  }

  return Response.json({
    message: "デモデータを返しました。データベースへの保存は行っていません。",
    demo: true,
    data: sampleGpsAdminData
  });
}
