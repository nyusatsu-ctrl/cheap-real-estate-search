import { NextRequest } from "next/server";
import { authorizeGpsApiRequest } from "@/lib/gps/api-auth";
import { parseGpsJsonObject, validateGpsApiMutationRequest } from "@/lib/gps/api-security";
import { parseMv930gPacket } from "@/lib/gps/parser";
import { MV930G_SAMPLE_LOCATION_HEX } from "@/lib/gps/sample-data";
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

  const rawHex =
    typeof parsedBody.data.rawHex === "string" && parsedBody.data.rawHex.trim()
      ? parsedBody.data.rawHex
      : MV930G_SAMPLE_LOCATION_HEX;

  try {
    return Response.json({
      message: "デモ受信データを解析しました。rawログ保存や端末通信は行っていません。",
      demo: true,
      parsed: parseMv930gPacket(rawHex)
    });
  } catch {
    return Response.json({ message: "MV930Gデモ受信データの形式が不正です。" }, { status: 400 });
  }
}
