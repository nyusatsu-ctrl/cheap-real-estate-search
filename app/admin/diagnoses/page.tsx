import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import { LeadStatusSelect } from "@/components/diagnoses/LeadStatusSelect";
import { getCurrentAdmin } from "@/lib/admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  SEMINAR_INTEREST_OPTIONS,
  type AdminDiagnosisFilters,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnoses,
  getLeadSourceLabel,
  getSeminarInterestLabel,
  normalizeLeadSource,
  normalizeLeadStatus,
  normalizeSeminarInterest,
  type DiagnosisTypeCode
} from "@/lib/construction-diagnosis";
import { Download, Filter, LogOut } from "lucide-react";

type AdminDiagnosesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminDiagnosesPage({ searchParams }: { searchParams: AdminDiagnosesSearchParams }) {
  const admin = await getCurrentAdmin();
  if (!admin) return <LoginRequired />;

  const params = await searchParams;
  const filters = getFilters(params);
  const diagnoses = await getConstructionDiagnoses(filters);
  const exportHref = `/admin/diagnoses/export${getFilterQuery(filters)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminHeader email={admin.email} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">診断者一覧</h1>
          <p className="mt-1 text-sm text-slate-600">公共工事参入支援の見込み客、診断タイプ、説明会意向、対応状況を確認できます。</p>
        </div>
        <Link href={exportHref} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Download className="h-4 w-4" />
          CSV出力
        </Link>
      </div>

      <form className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectFilter name="main_type" label="診断タイプ" defaultValue={filters.mainType ?? ""}>
            {Object.values(DIAGNOSIS_TYPES).map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter name="wants_consultation" label="相談意欲" defaultValue={filters.wantsConsultation ?? ""}>
            {Object.entries(CONSULTATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter name="seminar_interest" label="説明会意向" defaultValue={filters.seminarInterest ?? ""}>
            {SEMINAR_INTEREST_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter name="lead_source" label="流入元" defaultValue={filters.leadSource ?? ""}>
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter name="lead_status" label="対応ステータス" defaultValue={filters.leadStatus ?? ""}>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">
            <Filter className="h-4 w-4" />
            絞り込み
          </button>
          <Link href="/admin/diagnoses" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            クリア
          </Link>
        </div>
      </form>

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
                <th className="px-3 py-3">平均年商</th>
                <th className="px-3 py-3">診断タイプ</th>
                <th className="px-3 py-3">相談意欲</th>
                <th className="px-3 py-3">説明会意向</th>
                <th className="px-3 py-3">流入元</th>
                <th className="px-3 py-3">対応ステータス</th>
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
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getSeminarInterestLabel(diagnosis.seminar_interest)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getLeadSourceLabel(diagnosis.lead_source)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                    <LeadStatusSelect diagnosisId={diagnosis.id} currentStatus={diagnosis.lead_status} options={LEAD_STATUS_OPTIONS} />
                  </td>
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
                  <td colSpan={13} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
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

function SelectFilter({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-slate-600">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
        <option value="">すべて</option>
        {children}
      </select>
    </label>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): AdminDiagnosisFilters {
  return {
    mainType: normalizeDiagnosisType(firstParam(params.main_type)),
    wantsConsultation: normalizeConsultation(firstParam(params.wants_consultation)),
    seminarInterest: normalizeOptionalSeminarInterest(firstParam(params.seminar_interest)),
    leadSource: normalizeOptionalLeadSource(firstParam(params.lead_source)),
    leadStatus: normalizeOptionalLeadStatus(firstParam(params.lead_status))
  };
}

function getFilterQuery(filters: AdminDiagnosisFilters) {
  const params = new URLSearchParams();
  if (filters.mainType) params.set("main_type", filters.mainType);
  if (filters.wantsConsultation) params.set("wants_consultation", filters.wantsConsultation);
  if (filters.seminarInterest) params.set("seminar_interest", filters.seminarInterest);
  if (filters.leadSource) params.set("lead_source", filters.leadSource);
  if (filters.leadStatus) params.set("lead_status", filters.leadStatus);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeDiagnosisType(value: string): DiagnosisTypeCode | undefined {
  return value in DIAGNOSIS_TYPES ? (value as DiagnosisTypeCode) : undefined;
}

function normalizeConsultation(value: string) {
  return value && value in CONSULTATION_LABELS ? value : undefined;
}

function normalizeOptionalLeadSource(value: string) {
  if (!value) return undefined;
  const normalized = normalizeLeadSource(value);
  return normalized === "other" && value !== "other" ? undefined : normalized;
}

function normalizeOptionalSeminarInterest(value: string) {
  if (!value) return undefined;
  const normalized = normalizeSeminarInterest(value);
  return normalized === "undecided" && value !== "undecided" ? undefined : normalized;
}

function normalizeOptionalLeadStatus(value: string) {
  if (!value) return undefined;
  const normalized = normalizeLeadStatus(value);
  return normalized === "new" && value !== "new" ? undefined : normalized;
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
