import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { getCurrentAdmin } from "@/lib/admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnoses
} from "@/lib/construction-diagnosis";
import { Download, LogOut } from "lucide-react";

export default async function AdminDiagnosesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) return <LoginRequired />;

  const diagnoses = await getConstructionDiagnoses();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminHeader email={admin.email} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">診断者一覧</h1>
          <p className="mt-1 text-sm text-slate-600">建設業売上アップ診断の回答と診断タイプを確認できます。</p>
        </div>
        <Link href="/admin/diagnoses/export" className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Download className="h-4 w-4" />
          CSV出力
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-3 py-3">氏名</th>
                <th className="px-3 py-3">会社名</th>
                <th className="px-3 py-3">電話番号</th>
                <th className="px-3 py-3">メール</th>
                <th className="px-3 py-3">業種</th>
                <th className="px-3 py-3">月商</th>
                <th className="px-3 py-3">診断タイプ</th>
                <th className="px-3 py-3">相談意欲</th>
                <th className="px-3 py-3">診断日時</th>
                <th className="px-3 py-3">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {diagnoses.map((diagnosis) => (
                <tr key={diagnosis.id}>
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-950">{diagnosis.name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{diagnosis.company_name ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{diagnosis.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{diagnosis.email}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getAnswerLabel("business_type", diagnosis.business_type)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getAnswerLabel("monthly_sales", diagnosis.monthly_sales)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-950">{DIAGNOSIS_TYPES[diagnosis.main_type].name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatDiagnosisDate(diagnosis.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/admin/diagnoses/${diagnosis.id}`} className="font-bold text-brand-700">
                      表示
                    </Link>
                  </td>
                </tr>
              ))}
              {diagnoses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                    診断データはまだありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminHeader({ email }: { email: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-500">建設業売上アップ診断</p>
        <p className="mt-1 text-xs text-slate-500">{email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
          公開ページ
        </Link>
        <form action={signOutAction}>
          <button className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
        <p className="mt-2 text-slate-700">診断者一覧を見るには管理者ログインが必要です。</p>
        <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
          ログインへ
        </Link>
      </div>
    </div>
  );
}
