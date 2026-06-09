import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { seedGpsMockData } from "@/lib/gps/mock-seed";
import { sampleGpsAdminData } from "@/lib/gps/sample-data";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin && hasSupabaseEnv()) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      message: "Supabase未設定のためDB保存はしていません。画面はデモデータで確認できます。",
      demo: true,
      data: sampleGpsAdminData
    });
  }

  const result = await seedGpsMockData(supabase, admin?.id ?? null);
  return Response.json({ message: "MV930Gモックデータを投入しました。", result });
}
