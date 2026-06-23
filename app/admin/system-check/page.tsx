import { AdminShell } from "@/components/AdminShell";
import { getAdminSystemCheck } from "@/lib/admin-system-check";
import { requireAdmin } from "@/lib/admin";

export default async function AdminSystemCheckPage() {
  const admin = await requireAdmin("/admin/system-check");
  const check = await getAdminSystemCheck();

  return (
    <AdminShell email={admin.email}>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">システム確認</h2>
        <p className="mt-1 text-sm text-slate-600">
          本番環境の接続状態と物件件数を確認します。環境変数の値やキーは表示しません。
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-black text-slate-950">環境変数</h3>
          <dl className="mt-3 grid gap-2 text-sm">
            <CheckRow label="NEXT_PUBLIC_SUPABASE_URL" ok={check.env.nextPublicSupabaseUrl} />
            <CheckRow label="NEXT_PUBLIC_SUPABASE_ANON_KEY" ok={check.env.nextPublicSupabaseAnonKey} />
            <CheckRow label="SUPABASE_SERVICE_ROLE_KEY" ok={check.env.serviceRoleKey} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-black text-slate-950">Supabase接続テスト</h3>
          <p className={`mt-3 rounded px-3 py-2 text-sm font-bold ${check.connection.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {check.connection.message}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-black text-slate-950">件数確認</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <CountCard label="properties 全件数" value={check.counts.properties} />
          <CountCard label="crawler_candidates 件数" value={check.counts.crawlerCandidates} />
          <CountCard label="公開中 properties 件数" value={check.counts.publishedProperties} />
          <CountCard label="非公開 properties 件数" value={check.counts.nonPublishedProperties} />
          <CountCard label="直近7日取得件数" value={check.counts.recentDetectedProperties} />
        </div>
      </section>

      {check.errors.length ? (
        <section className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <h3 className="font-black text-rose-900">エラー内容</h3>
          <ul className="mt-3 grid gap-2 text-sm font-semibold text-rose-800">
            {check.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminShell>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="font-mono text-xs font-bold text-slate-600">{label}</dt>
      <dd className={`text-sm font-black ${ok ? "text-emerald-700" : "text-rose-700"}`}>{ok ? "はい" : "いいえ"}</dd>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value === null ? "-" : value.toLocaleString("ja-JP")}</p>
    </div>
  );
}
