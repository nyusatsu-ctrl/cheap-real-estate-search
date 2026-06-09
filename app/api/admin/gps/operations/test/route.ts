import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin && hasSupabaseEnv()) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    deviceId?: string;
    vehicleId?: string | null;
    operationType?: "safe_cut" | "restore" | "arm" | "disarm";
    reason?: string;
  };

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ message: "Supabase未設定のため操作ログ保存はしていません。", demo: true }, { status: 503 });
  }

  const operationType = body.operationType ?? "safe_cut";
  const { data, error } = await supabase
    .from("operation_logs")
    .insert({
      actor_profile_id: admin?.id ?? null,
      device_id: body.deviceId ?? null,
      vehicle_id: body.vehicleId ?? null,
      operation_type: operationType,
      confirmation_text:
        "MVPでは遠隔制御送信を無効化しています。燃料カットは将来RELAY,2#相当の安全カットを基本にします。",
      reason: body.reason ?? "MVPテスト操作",
      request_payload: {
        disabled: true,
        requested_operation: operationType,
        safety_note: "remote_control_disabled_until_protocol_verified"
      },
      result_status: "cancelled",
      result_message: "実機未接続・プロトコル確認中のため送信していません。"
    })
    .select("*")
    .single();

  if (error) return Response.json({ message: error.message }, { status: 400 });
  return Response.json({ message: "テスト操作ログを保存しました。", data }, { status: 201 });
}
