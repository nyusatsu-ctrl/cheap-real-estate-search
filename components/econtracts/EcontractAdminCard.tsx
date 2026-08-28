import Link from "next/link";
import {
  cancelEcontractAction,
  issuePurchaseIntentEcontractAction,
  issueVehicleConfirmationEcontractAction,
  resendEcontractAction
} from "@/app/admin/sales-contracts/econtract-actions";
import { getLatestEcontract } from "@/lib/econtracts/data";
import {
  ECONTRACT_STATUS_LABELS,
  getEcontractStatusClass
} from "@/lib/econtracts/rules";
import type { AdminEcontractSummary, SalesEcontract } from "@/lib/econtracts/types";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";

export function EcontractAdminCard({ detail, summary }: { detail: SalesContractDetail; summary: AdminEcontractSummary }) {
  const firstStage = getLatestEcontract(summary.contracts, "purchase_intent");
  const secondStage = getLatestEcontract(summary.contracts, "vehicle_confirmation");
  const loanApproved = detail.contract.contract_type === "loan" && detail.loan?.approval_status === "approved";
  const firstSigned = firstStage?.status === "signed";

  return (
    <section id="econtracts" className="scroll-mt-4 rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-teal-700">審査可決後フロー</p>
          <h2 className="mt-1 text-2xl font-black text-teal-950">二段階電子契約</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-teal-900">既存の販売契約ステータスとは分離し、送信・開封・本人認証・署名を証跡付きで管理します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StageBadge label="第1契約" contract={firstStage} />
          <StageBadge label="第2契約" contract={secondStage} />
        </div>
      </div>

      {summary.featureDisabled ? (
        <div className="mt-5 rounded border border-slate-300 bg-white p-4 text-sm font-bold leading-6 text-slate-800">
          電子契約機能は現在無効です
        </div>
      ) : summary.tableMissing ? (
        <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          {summary.errorMessage}
        </div>
      ) : summary.errorMessage ? (
        <div className="mt-5 rounded border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{summary.errorMessage}</div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <StagePanel
            stage="第1契約"
            title="購入手続継続確認"
            contract={firstStage}
            contractId={detail.contract.id}
          >
            {!firstStage || firstStage.status === "cancelled" ? (
              loanApproved ? (
                <form action={issuePurchaseIntentEcontractAction}>
                  <input type="hidden" name="contract_id" value={detail.contract.id} />
                  <button className="w-full rounded bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm focus-ring">第1契約をメール送信</button>
                </form>
              ) : (
                <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">ローン情報の審査結果を「可決」にすると送信できます。</p>
              )
            ) : null}
          </StagePanel>

          <StagePanel
            stage="第2契約"
            title="個別車両購入確認"
            contract={secondStage}
            contractId={detail.contract.id}
          >
            {!firstSigned ? (
              <p className="rounded border border-slate-200 bg-slate-100 p-3 text-sm font-bold leading-6 text-slate-700">第1契約の署名完了後に作成できます。</p>
            ) : !secondStage || secondStage.status === "cancelled" ? (
              <VehicleConfirmationForm detail={detail} />
            ) : null}
          </StagePanel>
        </div>
      )}
    </section>
  );
}

function StagePanel({
  stage,
  title,
  contract,
  contractId,
  children
}: {
  stage: string;
  title: string;
  contract: SalesEcontract | null;
  contractId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">{stage}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{title}</h3>
        </div>
        <StageBadge label={stage} contract={contract} compact />
      </div>
      {contract ? (
        <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <Info label="管理番号" value={contract.management_number} />
          <Info label="version" value={contract.document_version} />
          <Info label="送信" value={formatDateTime(contract.sent_at)} />
          <Info label="開封" value={formatDateTime(contract.opened_at)} />
          <Info label="本人認証" value={formatDateTime(contract.verified_at)} />
          <Info label="署名" value={formatDateTime(contract.signed_at)} />
        </dl>
      ) : <p className="mt-4 text-sm font-semibold text-slate-500">未作成です。</p>}

      <div className="mt-4 grid gap-3">
        {children}
        {contract ? <ContractActions contract={contract} contractId={contractId} /> : null}
      </div>
    </div>
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
            <button className="w-full rounded border border-teal-300 bg-white px-4 py-2 text-sm font-black text-teal-800 focus-ring">新しい専用URLで再送</button>
          </form>
          <form action={cancelEcontractAction} className="grid gap-2 rounded border border-rose-200 bg-rose-50 p-3">
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="econtract_id" value={contract.id} />
            <label className="grid gap-1 text-xs font-black text-rose-900">取消理由<input name="cancelled_reason" required className="rounded border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 focus-ring" /></label>
            <button className="rounded border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-800 focus-ring">未署名の契約を取消</button>
          </form>
        </>
      ) : null}
    </>
  );
}

function VehicleConfirmationForm({ detail }: { detail: SalesContractDetail }) {
  const vehicle = detail.vehicle;
  const loan = detail.loan;
  return (
    <form action={issueVehicleConfirmationEcontractAction} className="grid gap-3 rounded border border-sky-200 bg-sky-50 p-4">
      <input type="hidden" name="contract_id" value={detail.contract.id} />
      <p className="text-sm font-black text-sky-950">個別車両・購入条件</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="maker" label="メーカー" defaultValue={vehicle?.maker} required />
        <Field name="model" label="車名" defaultValue={vehicle?.model} required />
        <Field name="grade" label="グレード" defaultValue={vehicle?.grade} />
        <Field name="model_code" label="型式" />
        <Field name="first_registration" label="初度登録／年式" defaultValue={vehicle?.model_year ? `${vehicle.model_year}年` : ""} required />
        <Field name="mileage" label="走行距離(km)" defaultValue={vehicle?.mileage} inputMode="numeric" required />
        <Field name="chassis_number" label="車台番号" defaultValue={vehicle?.chassis_number} />
        <label className="grid gap-1 text-xs font-black text-slate-700">車台番号の段階<select name="chassis_number_status" defaultValue={vehicle?.chassis_number ? "confirmed" : "pending"} className="rounded border border-sky-300 bg-white px-3 py-2 text-sm focus-ring"><option value="confirmed">確定済</option><option value="pending">判明後に記載</option></select></label>
        <Field name="vehicle_price" label="車両本体価格" defaultValue={detail.contract.sale_price} inputMode="numeric" required />
        <Field name="fees" label="諸費用" defaultValue={detail.contract.fees ?? 0} inputMode="numeric" required />
        <Field name="total_price" label="支払総額" defaultValue={detail.contract.total_price} inputMode="numeric" required />
        <Field name="down_payment" label="頭金" defaultValue={detail.contract.down_payment ?? 0} inputMode="numeric" required />
        <Field name="trade_in_amount" label="下取充当額" defaultValue={detail.contract.trade_in_amount ?? 0} inputMode="numeric" required />
        <Field name="financed_amount" label="ローン等申込額" defaultValue={detail.contract.financed_amount ?? loan?.principal} inputMode="numeric" required />
        <Field name="installment_count" label="支払回数" defaultValue={loan?.installment_count} inputMode="numeric" required />
        <Field name="first_payment_amount" label="第1回支払額" defaultValue={loan?.initial_payment_amount ?? 0} inputMode="numeric" required />
        <Field name="monthly_payment" label="2回目以降支払額" defaultValue={loan?.monthly_payment ?? 0} inputMode="numeric" required />
        <Field name="bonus_payment" label="ボーナス払い" defaultValue={loan?.bonus_payment_enabled ? `${loan.bonus_payment_amount ?? 0}円` : "なし"} />
        <Field name="delivery_method" label="納車方法" placeholder="例: 店頭納車" required />
        <Field name="delivery_estimate" label="納車予定" defaultValue={detail.contract.delivery_date} placeholder="例: 2026年10月上旬" required />
        <Field name="warranty" label="保証内容" defaultValue={vehicle?.warranty_period} />
      </div>
      <label className="grid gap-1 text-xs font-black text-slate-700">特記事項<textarea name="special_terms" rows={3} className="rounded border border-sky-300 bg-white px-3 py-2 text-sm focus-ring" /></label>
      <label className="flex items-start gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="auction_purchase" className="mt-1 h-4 w-4 accent-sky-700" />オークション仕入れに該当する</label>
      <button className="rounded bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm focus-ring">第2契約をメール送信</button>
    </form>
  );
}

function Field({ name, label, defaultValue, required, inputMode, placeholder }: { name: string; label: string; defaultValue?: string | number | null; required?: boolean; inputMode?: "numeric"; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-black text-slate-700">{label}<input name={name} defaultValue={defaultValue ?? ""} required={required} inputMode={inputMode} placeholder={placeholder} className="rounded border border-sky-300 bg-white px-3 py-2 text-sm focus-ring" /></label>;
}

function StageBadge({ label, contract, compact = false }: { label: string; contract: SalesEcontract | null; compact?: boolean }) {
  const status = contract?.status;
  return <span className={`rounded px-2 py-1 text-xs font-black ${status ? getEcontractStatusClass(status) : "bg-white text-slate-500"}`}>{compact ? "" : `${label}: `}{status ? ECONTRACT_STATUS_LABELS[status] : "未作成"}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-slate-50 p-2"><dt className="font-black text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd></div>;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}
