import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { sampleGpsLatestPositions } from "@/lib/gps/sample-data";

export async function GET() {
  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ data: sampleGpsLatestPositions, demo: true });

  const { data, error } = await supabase
    .from("gps_latest_positions")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(500);

  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ data: data ?? [], demo: false });
}

async function getGpsApiAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  if (!hasSupabaseEnv()) return { id: "local-preview", email: "local-preview@example.com" };
  return null;
}
