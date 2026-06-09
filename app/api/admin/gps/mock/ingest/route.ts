import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { ingestRawDeviceLog } from "@/lib/gps/ingest";
import { parseMv930gPacket } from "@/lib/gps/parser";
import { MV930G_SAMPLE_LOCATION_HEX } from "@/lib/gps/sample-data";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin && hasSupabaseEnv()) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    rawHex?: string;
    transport?: "tcp" | "udp";
  };
  const rawHex = body.rawHex ?? MV930G_SAMPLE_LOCATION_HEX;
  const transport = body.transport ?? "tcp";

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      message: "Supabase未設定のためrawログ保存はしていません。解析結果のみ返します。",
      demo: true,
      parsed: parseMv930gPacket(rawHex)
    });
  }

  const result = await ingestRawDeviceLog(supabase, {
    transport,
    raw: rawHex,
    remoteAddress: "mock-api",
    remotePort: null,
    localPort: 9300
  });
  return Response.json({ message: "モック受信データを保存しました。", result });
}
