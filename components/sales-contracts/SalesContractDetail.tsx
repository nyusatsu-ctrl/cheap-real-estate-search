import Link from "next/link";
import {
  formatSalesDate,
  formatSalesDateTime,
  formatYen,
  getCounterpartyLabel,
  getTermLabel
} from "@/lib/sales-contracts/data";
import {
  APPROVAL_STATUS_LABELS,
  CONTACT_METHOD_LABELS,
  CONTACT_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_VISIBILITY_LABELS,
  FINANCE_COMPANY_LABELS,
  LEASE_COMPANY_LABELS,
  VEHICLE_TYPE_LABELS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail as SalesContractDetailType } from "@/lib/sales-contracts/types";

export function SalesContractDetail({ detail }: { detail: SalesContractDetailType }) {
  const item = detail;
  const documentLabels = new Map<string, string>(DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.label]));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{item.customer?.name ?? "顧客未登録"}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {[item.vehicle?.maker, item.vehicle?.model, item.vehicle?.registration_number].filter(Boolean).join(" / ") || "車両情報未登録"}
            </p>
          </div>
          <span className="rounded bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">
            {CONTRACT_STATUS_LABELS[item.contract.status]}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <Info label="車・バイク" value={VEHICLE_TYPE_LABELS[item.contract.vehicle_type]} />
          <Info label="契約方法" value={CONTRACT_TYPE_LABELS[item.contract.contract_type]} />
          <Info label="信販・リース" value={getCounterpartyLabel(item)} />
          <Info label="回数・期間" value={getTermLabel(item)} />
        </dl>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="基本情報">
          <InfoGrid>
            <Info label="フリガナ" value={item.customer?.kana} />
            <Info label="電話番号" value={item.customer?.phone} />
            <Info label="メール" value={item.customer?.email} />
            <Info label="住所" value={item.customer?.address} />
            <Info label="生年月日" value={formatSalesDate(item.customer?.birth_date)} />
            <Info label="職業" value={item.customer?.occupation} />
            <Info label="勤務先" value={item.customer?.employer_name} />
            <Info label="勤務先電話" value={item.customer?.employer_phone} />
            <Info label="年収" value={item.customer?.annual_income ? `${item.customer.annual_income.toLocaleString("ja-JP")}円` : "-"} />
          </InfoGrid>
        </Section>

        <Section title="申込参照情報">
          <InfoGrid>
            <Info label="source_system" value={item.contract.source_system} />
            <Info label="source_row_key" value={item.contract.source_row_key ? "保存済み" : "-"} />
            <Info label="source_row_number" value={item.contract.source_row_number?.toString()} />
            <Info label="source_received_at" value={formatSalesDateTime(item.contract.source_received_at)} />
          </InfoGrid>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="契約情報">
          <InfoGrid>
            <Info label="契約日" value={formatSalesDate(item.contract.contract_date)} />
            <Info label="納車日" value={formatSalesDate(item.contract.delivery_date)} />
            <Info label="販売価格" value={formatYen(item.contract.sale_price)} />
            <Info label="諸費用" value={formatYen(item.contract.fees)} />
            <Info label="総支払額" value={formatYen(item.contract.total_price)} />
            <Info label="頭金" value={formatYen(item.contract.down_payment)} />
            <Info label="下取金額" value={formatYen(item.contract.trade_in_amount)} />
            <Info label="ローン元金" value={formatYen(item.contract.financed_amount)} />
            <Info label="担当者" value={item.contract.staff_name} />
          </InfoGrid>
        </Section>

        <Section title="車両情報">
          <InfoGrid>
            <Info label="メーカー" value={item.vehicle?.maker} />
            <Info label="車種" value={item.vehicle?.model} />
            <Info label="グレード" value={item.vehicle?.grade} />
            <Info label="年式" value={item.vehicle?.model_year?.toString()} />
            <Info label="走行距離" value={item.vehicle?.mileage ? `${item.vehicle.mileage.toLocaleString("ja-JP")}km` : "-"} />
            <Info label="色" value={item.vehicle?.color} />
            <Info label="車台番号" value={item.vehicle?.chassis_number} />
            <Info label="登録番号" value={item.vehicle?.registration_number} />
            <Info label="車検満了日" value={formatSalesDate(item.vehicle?.inspection_expiry_date)} />
            <Info label="自賠責満了日" value={formatSalesDate(item.vehicle?.compulsory_insurance_expiry_date)} />
            <Info label="GPS装着" value={item.vehicle?.gps_installed ? "あり" : "なし"} />
          </InfoGrid>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="ローン情報">
          {item.loan ? (
            <InfoGrid>
              <Info label="信販会社" value={FINANCE_COMPANY_LABELS[item.loan.finance_company]} />
              <Info label="信販申込番号" value={item.loan.application_number} />
              <Info label="契約番号" value={item.loan.contract_number} />
              <Info label="審査結果" value={item.loan.approval_status ? APPROVAL_STATUS_LABELS[item.loan.approval_status] : "-"} />
              <Info label="金利" value={item.loan.interest_rate === null ? "-" : `${item.loan.interest_rate}%`} />
              <Info label="ローン元金" value={formatYen(item.loan.principal)} />
              <Info label="支払回数" value={item.loan.installment_count ? `${item.loan.installment_count}回` : "-"} />
              <Info label="月々支払額" value={formatYen(item.loan.monthly_payment)} />
              <Info label="初回支払日" value={formatSalesDate(item.loan.first_payment_date)} />
              <Info label="最終支払日" value={formatSalesDate(item.loan.final_payment_date)} />
              <Info label="所有権留保" value={item.loan.ownership_retention ? "あり" : "なし"} />
            </InfoGrid>
          ) : (
            <p className="text-sm font-semibold text-slate-500">ローン情報はありません。</p>
          )}
        </Section>

        <Section title="リース情報">
          {item.lease ? (
            <InfoGrid>
              <Info label="リース会社" value={LEASE_COMPANY_LABELS[item.lease.lease_company]} />
              <Info label="契約番号" value={item.lease.contract_number} />
              <Info label="リース期間" value={item.lease.lease_months ? `${item.lease.lease_months}か月` : "-"} />
              <Info label="月額リース料" value={formatYen(item.lease.monthly_lease_fee)} />
              <Info label="開始日" value={formatSalesDate(item.lease.lease_start_date)} />
              <Info label="終了日" value={formatSalesDate(item.lease.lease_end_date)} />
              <Info label="残価設定" value={item.lease.residual_value_enabled ? "あり" : "なし"} />
              <Info label="残価金額" value={formatYen(item.lease.residual_value_amount)} />
              <Info label="メンテ込み" value={item.lease.maintenance_included ? "あり" : "なし"} />
              <Info label="所有者" value={item.lease.owner_name} />
              <Info label="使用者" value={item.lease.user_name} />
            </InfoGrid>
          ) : (
            <p className="text-sm font-semibold text-slate-500">リース情報はありません。</p>
          )}
        </Section>
      </div>

      <Section title="保証人">
        {item.guarantors.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {item.guarantors.map((guarantor) => (
              <div key={guarantor.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-bold text-slate-950">{guarantor.name}</p>
                <p className="mt-1 text-slate-600">{[guarantor.relationship, guarantor.phone].filter(Boolean).join(" / ") || "-"}</p>
                {guarantor.identity_document_url ? (
                  <Link href={guarantor.identity_document_url} className="mt-2 inline-block font-bold text-brand-700">
                    本人確認書類
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">保証人は登録されていません。</p>
        )}
      </Section>

      <Section title="書類">
        {item.documents.length ? (
          <div className="divide-y divide-slate-200">
            {item.documents.map((document) => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold text-slate-950">{document.title || documentLabels.get(document.document_type) || document.document_type}</p>
                  <p className="mt-1 text-xs text-slate-500">{DOCUMENT_VISIBILITY_LABELS[document.visibility]}</p>
                </div>
                {document.file_url ? (
                  <Link href={document.file_url} className="font-bold text-brand-700">
                    開く
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-slate-500">{document.storage_path}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">書類は登録されていません。</p>
        )}
      </Section>

      <Section title="対応履歴">
        {item.contactHistories.length ? (
          <div className="divide-y divide-slate-200">
            {item.contactHistories.map((history) => (
              <div key={history.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">
                    {formatSalesDateTime(history.handled_at)} / {CONTACT_METHOD_LABELS[history.method]} / {CONTACT_STATUS_LABELS[history.status]}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">{history.handled_by ?? "-"}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{history.content}</p>
                {history.next_action_date ? <p className="mt-2 text-xs font-semibold text-slate-500">次回対応: {formatSalesDate(history.next_action_date)}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">対応履歴はまだありません。</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 text-sm md:grid-cols-2">{children}</dl>;
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || "-"}</dd>
    </div>
  );
}
