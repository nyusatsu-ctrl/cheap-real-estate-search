import Link from "next/link";
import {
  cancelEcontractAction,
  issueEcontractAction,
  resendEcontractAction
} from "@/app/admin/sales-contracts/econtract-actions";
import { sendAdminEcontractTestEmailAction } from "@/app/admin/sales-contracts/econtract-test-actions";
import { getLatestEcontract } from "@/lib/econtracts/data";
import {
  canIssueLoanEcontract,
  getEcontractStatusClass,
  getEcontractStatusLabel
} from "@/lib/econtracts/rules";
import type { AdminEcontractSummary, SalesEcontract } from "@/lib/econtracts/types";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";

export function EcontractAdminCard({
  detail,
  summary,
  adminEmail
}: {
  detail: SalesContractDetail;
  summary: AdminEcontractSummary;
  adminEmail: string;
}) {
  const current = getLatestEcontract(summary.contracts, "purchase_intent");
  const legacyContracts = summary.contracts.filter((contract) => contract.contract_kind === "vehicle_confirmation");
  const hasSigned = summary.contracts.some((contract) => contract.contract_kind === "purchase_intent" && contract.status === "signed");
  const eligible = canIssueLoanEcontract({
    contractType: detail.contract.contract_type,
    approvalStatus: detail.loan?.approval_status,
    financeCompany: detail.loan?.finance_company
  });

  return (
    <section id="econtracts" className="scroll-mt-4 rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-teal-700">審査可決後フロー</p>
          <h2 className="mt-1 text-2xl font-black text-teal-950">電子契約</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-teal-900">購入申込と手続継続の確認を、送信から本人認証・締結・証跡保存まで一つの契約で管理します。</p>
        </div>
        <ContractBadge contract={current} />
      </div>

      {summary.featureDisabled ? (
        <div className="mt-5 rounded border border-slate-300 bg-white p-4 text-sm font-bold leading-6 text-slate-800">電子契約機能は現在無効です</div>
      ) : summary.tableMissing ? (
        <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">{summary.errorMessage}</div>
      ) : summary.errorMessage ? (
        <div className="mt-5 rounded border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{summary.errorMessage}</div>
      ) : (
        <div className="mt-5 grid gap-5">
          <div className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-teal-700">今回の契約</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">自社ローン審査可決後 購入申込・手続継続確認契約書</h3>
              </div>
              <ContractBadge contract={current} compact />
            </div>

            {current ? (
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <Info label="管理番号" value={current.management_number} />
                <Info label="文書バージョン" value={current.document_version} />
                <Info label="送信" value={formatDateTime(current.sent_at)} />
                <Info label="開封" value={formatDateTime(current.opened_at)} />
                <Info label="本人認証" value={formatDateTime(current.verified_at)} />
                <Info label="締結" value={formatDateTime(current.signed_at)} />
              </dl>
            ) : <p className="mt-4 text-sm font-semibold text-slate-500">未送信です。内容と顧客のメールアドレスを確認してから送信してください。</p>}

            <div className="mt-4 grid gap-3">
              {!current || current.status === "cancelled" ? (
                hasSigned ? (
                  <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-900">締結済みの電子契約があるため、新しい契約は発行できません。</p>
                ) : eligible ? (
                  <form action={issueEcontractAction}>
                    <input type="hidden" name="contract_id" value={detail.contract.id} />
                    <button className="w-full rounded bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm focus-ring">電子契約をメール送信</button>
                  </form>
                ) : (
                  <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">電子契約はプレミアまたはアストで可決済みの自社ローン顧客だけに送信できます。</p>
                )
              ) : null}
              {current ? <ContractActions contract={current} contractId={detail.contract.id} /> : null}
            </div>
          </div>

          {eligible ? (
            <section aria-labelledby="econtract-test-send-title" className="rounded-lg border-2 border-violet-300 bg-violet-50 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-violet-700">管理者専用・正式送信とは別機能</p>
                  <h3 id="econtract-test-send-title" className="mt-1 text-lg font-black text-violet-950">管理者へテスト送信</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-violet-900">
                    実際のメール文面と契約内容を管理者だけで確認します。顧客メール、正式契約、電子契約ステータス、OTP・署名証跡は変更しません。
                  </p>
                </div>
                <Link
                  href={`/admin/econtracts/test-preview/${detail.contract.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-violet-300 bg-white px-3 py-2 text-xs font-black text-violet-800 focus-ring"
                >
                  テストプレビューだけ開く
                </Link>
              </div>
              <form action={sendAdminEcontractTestEmailAction} className="mt-4 grid gap-3">
                <input type="hidden" name="contract_id" value={detail.contract.id} />
                <label className="grid gap-1 text-sm font-black text-violet-950">
                  テスト送信先（管理者アカウント）
                  <input
                    type="email"
                    name="test_recipient"
                    defaultValue={adminEmail}
                    required
                    autoComplete="email"
                    className="rounded border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus-ring"
                  />
                </label>
                <label className="flex items-start gap-2 rounded border border-violet-200 bg-white p-3 text-xs font-bold leading-5 text-violet-950">
                  <input type="checkbox" name="test_send_confirm" value="confirmed" required className="mt-1" />
                  <span>顧客には送信せず、正式契約・OTP・署名証跡を作成しないテスト送信であることを確認しました。</span>
                </label>
                <button type="submit" className="w-full rounded border-2 border-violet-600 bg-white px-4 py-3 text-sm font-black text-violet-800 shadow-sm focus-ring">
                  管理者へテスト送信
                </button>
              </form>
            </section>
          ) : null}

          {legacyContracts.length ? (
            <details className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-slate-700">過去の電子契約証跡（{legacyContracts.length}件）</summary>
              <div className="mt-3 grid gap-2">
                {legacyContracts.map((contract) => (
                  <div key={contract.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-700">
                      <p className="font-black">{contract.document_title}</p>
                      <p className="mt-1 font-semibold">{contract.management_number}・{getEcontractStatusLabel(contract.status, contract.link_expires_at)}</p>
                    </div>
                    <Link href={`/admin/econtracts/${contract.id}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 focus-ring">証跡を見る</Link>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ContractActions({ contract, contractId }: { contract: SalesEcontract; contractId: string }) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/econtracts/${contract.id}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 focus-ring">契約・証跡を見る</Link>
        {contract.status === "signed" ? (
          <Link href={`/admin/econtracts/${contract.id}/print`} target="_blank" className="rounded bg-emerald-700 px-3 py-2 text-xs font-black text-white focus-ring">控えを印刷・PDF保存</Link>
        ) : null}
      </div>
      {contract.status !== "signed" && contract.status !== "cancelled" ? (
        <>
          <form action={resendEcontractAction}>
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="econtract_id" value={contract.id} />
            <button className="w-full rounded border border-teal-300 bg-white px-4 py-2 text-sm font-black text-teal-800 focus-ring">既存の電子契約を新しい専用URLで再送</button>
          </form>
          <form action={cancelEcontractAction} className="grid gap-2 rounded border border-rose-200 bg-rose-50 p-3">
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="econtract_id" value={contract.id} />
            <label className="grid gap-1 text-xs font-black text-rose-900">取消理由<input name="cancelled_reason" required className="rounded border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 focus-ring" /></label>
            <button className="rounded border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-800 focus-ring">未締結の契約を取消</button>
          </form>
        </>
      ) : null}
    </>
  );
}

function ContractBadge({ contract, compact = false }: { contract: SalesEcontract | null; compact?: boolean }) {
  const status = contract?.status;
  const label = status ? getEcontractStatusLabel(status, contract.link_expires_at) : "未送信";
  return <span className={`rounded px-2 py-1 text-xs font-black ${status ? getEcontractStatusClass(status) : "bg-white text-slate-500"}`}>{compact ? "" : "電子契約: "}{label}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-slate-50 p-2"><dt className="font-black text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd></div>;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}
