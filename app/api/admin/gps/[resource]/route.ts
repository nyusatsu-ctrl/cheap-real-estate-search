import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { resolveGpsResource, sanitizeGpsPayload } from "@/lib/gps/resources";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ data: config.sampleRows, demo: true });

  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .order(config.orderColumn, { ascending: false })
    .limit(500);

  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ data: data ?? [], demo: false });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ message: "Supabase未設定のため保存できません。", demo: true }, { status: 503 });
  }

  const payload = sanitizeGpsPayload(config, (await request.json()) as Record<string, unknown>);
  const { data, error } = await supabase.from(config.table).insert(payload).select("*").single();

  if (error) return Response.json({ message: error.message }, { status: 400 });
  return Response.json({ data }, { status: 201 });
}

async function getGpsApiAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  if (!hasSupabaseEnv()) return { id: "local-preview", email: "local-preview@example.com" };
  return null;
}
