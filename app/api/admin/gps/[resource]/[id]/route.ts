import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { resolveGpsResource, sanitizeGpsPayload } from "@/lib/gps/resources";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const row = config.sampleRows.find((sample) => sample.id === id) ?? null;
    return Response.json({ data: row, demo: true }, { status: row ? 200 : 404 });
  }

  const { data, error } = await supabase.from(config.table).select("*").eq("id", id).maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ data }, { status: data ? 200 : 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ message: "Supabase未設定のため更新できません。", demo: true }, { status: 503 });
  }

  const payload = sanitizeGpsPayload(config, (await request.json()) as Record<string, unknown>);
  const { data, error } = await supabase.from(config.table).update(payload).eq("id", id).select("*").single();

  if (error) return Response.json({ message: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const admin = await getGpsApiAdmin();
  if (!admin) return Response.json({ message: "管理者ログインが必要です。" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ message: "Supabase未設定のため削除できません。", demo: true }, { status: 503 });
  }

  const { error } = await supabase.from(config.table).delete().eq("id", id);
  if (error) return Response.json({ message: error.message }, { status: 400 });
  return Response.json({ message: "削除しました。" });
}

async function getGpsApiAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  if (!hasSupabaseEnv()) return { id: "local-preview", email: "local-preview@example.com" };
  return null;
}
