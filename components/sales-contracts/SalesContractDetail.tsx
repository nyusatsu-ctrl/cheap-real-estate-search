import Link from "next/link";
import {
  formatSalesDate,
  formatSalesDateTime,
  formatYen,
  getCounterpartyLabel,
  getMonthlyAmount,
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
  LEASE_MATURITY_CHOICE_LABELS,
  LEASE_MATURITY_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  getSalesContractMissingRequiredFields
} from "@/lib/sales-contracts/rules";
import { LOAN_REVIEW_APP_URL } from "@/lib/sales-contracts/source";
import type {
  SalesContactHistory,
  SalesContractDetail as SalesContractDetailType,
  SalesContractStatus,
  SalesContractType,
  SalesDocument
} from "@/lib/sales-contracts/types";

export function SalesContractDetail({
  detail,
  hideAction,
  showCreatedActions = false
}: {
  detail: SalesContractDetailType;
  hideAction?: (formData: FormData) => void | Promise<void>;
  showCreatedActions?: boolean;
}) {
  const item = detail;
  const canHideAsTestData = isTestSalesDetail(item);
  const vehicleName = [item.vehicle?.maker, item.vehicle?.model, item.vehicle?.grade].filter(Boolean).join(" ") || "車両情報未登録";
  const nextAction = getNextAction(item.contactHistories);
  const hasSourceInfo = Boolean(item.contract.source_system || item.contract.source_row_key || item.contract.source_row_number || item.contract.source_received_at);
  const isLoanReviewSource = item.contract.source_system === "gas_loan_review";
  const missingContractTerms = getMissingContractTerms(item);
  const shouldShowFormalContractCard =
    isFormalPendingStatus(item.contract.status) && (missingContractTerms.length > 0 || isLoanReviewSource);

  return (
    <div className="space-y-5">
      {showCreatedActions ? <ContractCreatedActions item={item} isLoanReviewSource={isLoanReviewSource} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{item.customer?.name ?? "顧客未登録"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{[vehicleName, item.vehicle?.registration_number].filter(Boolean).join(" / ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={getContractTypeClass(item.contract.contract_type)}>
              {CONTRACT_TYPE_LABELS[item.contract.contract_type]}
            </Badge>
            <Badge className={getStatusClass(item.contract.status)}>
              {CONTRACT_STATUS_LABELS[item.contract.status]}
            </Badge>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryItem label="車両区分" value={VEHICLE_TYPE_LABELS[item.contract.vehicle_type]} />
          <SummaryItem label="契約方法" value={CONTRACT_TYPE_LABELS[item.contract.contract_type]} />
          <SummaryItem label="信販会社" value={getCounterpartyLabel(item)} />
          <SummaryItem label="回数・期間" value={getTermLabel(item)} />
          <SummaryItem label="月額" value={formatYen(getMonthlyAmount(item))} />
          <SummaryItem label="次回対応日" value={nextAction ? formatSalesDate(nextAction.next_action_date) : "期限なし"} />
          <SummaryItem label="契約ステータス" value={CONTRACT_STATUS_LABELS[item.contract.status]} />
        </dl>
        <NextActionPanel history={nextAction} />
      </section>

      {item.contract.contract_type === "lease" ? <LeaseMaturityNavigationCard item={item} /> : null}

      {shouldShowFormalContractCard ? <FormalContractProgressCard item={item} fields={missingContractTerms} /> : null}

      {isLoanReviewSource ? <LoanReviewSourceCard item={item} /> : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="顧客情報">
          <InfoGrid>
            <Info label="顧客名" value={item.customer?.name} />
            <Info label="フリガナ" value={item.customer?.kana} />
            <Info label="電話番号" value={item.customer?.phone} />
            <Info label="メール" value={item.customer?.email} />
            <Info label="生年月日" value={formatSalesDate(item.customer?.birth_date)} />
            <Info label="勤務先" value={item.customer?.employer_name} />
            <Info label="勤務先電話" value={item.customer?.employer_phone} />
            <Info label="住所" value={item.customer?.address} className="md:col-span-2" />
            <Info label="備考" value={item.customer?.memo} className="md:col-span-2" multiline />
          </InfoGrid>
        </Section>

        <Section title="車両情報">
          <InfoGrid>
            <Info label="車両区分" value={VEHICLE_TYPE_LABELS[item.contract.vehicle_type]} />
            <Info label="車種" value={vehicleName} />
            <Info label="年式" value={item.vehicle?.model_year?.toString()} />
            <Info label="走行距離" value={formatMileage(item.vehicle?.mileage)} />
            <Info label="車台番号" value={item.vehicle?.chassis_number} />
            <Info label="ナンバー" value={item.vehicle?.registration_number} />
            <Info label="色" value={item.vehicle?.color} />
            <Info label="GPS装着" value={item.vehicle?.gps_installed ? "あり" : "なし"} />
          </InfoGrid>
        </Section>

        <Section title="契約概要">
          <InfoGrid>
            <Info label="契約方法" value={<Badge className={getContractTypeClass(item.contract.contract_type)}>{CONTRACT_TYPE_LABELS[item.contract.contract_type]}</Badge>} />
            <Info label="契約ステータス" value={<Badge className={getStatusClass(item.contract.status)}>{CONTRACT_STATUS_LABELS[item.contract.status]}</Badge>} />
            <Info label="契約日" value={formatSalesDate(item.contract.contract_date)} />
            <Info label="納車予定/納車日" value={formatSalesDate(item.contract.delivery_date)} />
            <Info label="契約金額" value={formatYen(item.contract.sale_price)} />
            <Info label="頭金" value={formatYen(item.contract.down_payment)} />
            <Info label="総支払額" value={formatYen(item.contract.total_price)} />
            <Info label="担当者" value={item.contract.staff_name} />
            <Info label="備考" value={item.contract.memo} className="md:col-span-2" multiline />
          </InfoGrid>
        </Section>
      </div>

      {item.contract.contract_type === "loan" ? (
        <Section title="ローン情報">
          {item.loan ? (
            <InfoGrid columns="md:grid-cols-4">
              <Info label="信販会社" value={FINANCE_COMPANY_LABELS[item.loan.finance_company]} />
              <Info label="支払回数" value={item.loan.installment_count ? `${item.loan.installment_count}回` : "-"} />
              <Info label="初回支払額" value={formatYen(item.loan.initial_payment_amount)} />
              <Info label="月額" value={formatYen(item.loan.monthly_payment)} />
              <Info label="最終支払額" value={formatYen(item.loan.final_payment_amount)} />
              <Info label="支払開始日" value={formatSalesDate(item.loan.first_payment_date)} />
              <Info label="支払終了日" value={formatSalesDate(item.loan.final_payment_date)} />
              <Info label="審査結果" value={item.loan.approval_status ? APPROVAL_STATUS_LABELS[item.loan.approval_status] : "-"} />
              <Info label="ローン元金" value={formatYen(item.loan.principal)} />
              <Info label="支払総額" value={formatYen(item.loan.total_payment_amount)} />
              <Info label="契約番号" value={item.loan.contract_number} />
              <Info label="所有権留保" value={item.loan.ownership_retention ? "あり" : "なし"} />
              <Info label="備考" value={item.loan.memo} className="md:col-span-4" multiline />
            </InfoGrid>
          ) : (
            <p className="text-sm font-semibold text-slate-500">ローン情報は未登録です。</p>
          )}
        </Section>
      ) : null}

      {item.contract.contract_type === "lease" ? (
        <Section title="リース情報">
          {item.lease ? (
            <InfoGrid columns="md:grid-cols-4">
              <Info label="リース会社" value={LEASE_COMPANY_LABELS[item.lease.lease_company]} />
              <Info label="リース期間" value={item.lease.lease_months ? `${item.lease.lease_months}か月` : "-"} />
              <Info label="初回支払額" value={formatYen(item.lease.initial_payment_amount)} />
              <Info label="月額" value={formatYen(item.lease.monthly_lease_fee)} />
              <Info label="最終支払額" value={formatYen(item.lease.final_payment_amount)} />
              <Info label="残価" value={formatYen(item.lease.residual_value_amount)} />
              <Info label="支払開始日" value={formatSalesDate(item.lease.lease_start_date)} />
              <Info label="支払終了日" value={formatSalesDate(item.lease.lease_end_date)} />
              <Info label="契約番号" value={item.lease.contract_number} />
              <Info label="メンテ込み" value={item.lease.maintenance_included ? "あり" : "なし"} />
              <Info label="所有者" value={item.lease.owner_name} />
              <Info label="使用者" value={item.lease.user_name} />
              <Info label="備考" value={item.lease.memo} className="md:col-span-4" multiline />
            </InfoGrid>
          ) : (
            <p className="text-sm font-semibold text-slate-500">リース情報は未登録です。</p>
          )}
        </Section>
      ) : null}

      {hasSourceInfo ? (
        <Section title="申込参照情報">
          <InfoGrid>
            <Info label="申込元" value={sourceSystemLabel(item.contract.source_system)} />
            <Info label="申込ID" value={item.contract.source_row_key ? "保存済み" : "-"} />
            <Info label="申込管理番号" value={item.contract.source_row_number?.toString()} />
            <Info label="受信日時" value={formatSalesDateTime(item.contract.source_received_at)} />
          </InfoGrid>
        </Section>
      ) : null}

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

      <DocumentLinksSection item={item} />

      <Section title="対応履歴">
        {item.contactHistories.length ? (
          <div className="divide-y divide-slate-200 rounded border border-slate-200">
            {item.contactHistories.map((history) => (
              <div key={history.id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">
                    {formatSalesDateTime(history.handled_at)} / {CONTACT_METHOD_LABELS[history.method]} / {CONTACT_STATUS_LABELS[history.status]}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">{history.handled_by ?? "-"}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{history.content}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {history.next_action_date ? <span>次回対応: {formatSalesDate(history.next_action_date)}</span> : null}
                  {history.memo ? <span>備考: {history.memo}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">対応履歴はまだありません。</p>
        )}
      </Section>

      {canHideAsTestData && hideAction ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <h3 className="text-lg font-black text-rose-950">テストデータ管理</h3>
          <p className="mt-2 text-sm font-semibold text-rose-900">
            顧客名または備考に「テスト」「動作確認」が含まれる契約だけ、論理削除で台帳から非表示にできます。
          </p>
          <form action={hideAction} className="mt-4">
            <input type="hidden" name="contract_id" value={item.contract.id} />
            <button className="rounded bg-rose-700 px-4 py-2 text-sm font-bold text-white focus-ring">
              この契約を非表示にする
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function ContractCreatedActions({
  item,
  isLoanReviewSource
}: {
  item: SalesContractDetailType;
  isLoanReviewSource: boolean;
}) {
  const isContractCandidate = isLoanReviewSource && getMissingContractTerms(item).length > 0;

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-emerald-700">登録完了</p>
          <h2 className="mt-1 text-2xl font-black text-emerald-950">{isContractCandidate ? "契約候補として保存しました" : "契約を登録しました"}</h2>
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            {isContractCandidate ? "正式契約前に契約条件を確定してください。" : "次に必要な確認や登録作業へ進めます。"}
          </p>
        </div>
        <Badge className={getStatusClass(item.contract.status)}>
          {CONTRACT_STATUS_LABELS[item.contract.status]}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/sales-contracts" className="rounded border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 focus-ring">
          契約台帳へ戻る
        </Link>
        <Link href="/admin/sales-contracts/new" className="rounded border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 focus-ring">
          新規契約を続けて登録
        </Link>
        <Link href={LOAN_REVIEW_APP_URL} target="_blank" rel="noopener noreferrer" className="rounded border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 focus-ring">
          自社ローン審査管理を開く
        </Link>
        {item.contract.contract_type === "lease" ? (
          <Link href="#lease-maturity" className="rounded bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm focus-ring">
            リース満期管理を作成
          </Link>
        ) : null}
        {isLoanReviewSource ? (
          <Link href={buildLoanReviewReturnUrl(item)} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-900 px-4 py-2 text-sm font-bold text-white shadow-sm focus-ring">
            自社ローン審査管理へ戻る
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function FormalContractProgressCard({
  item,
  fields
}: {
  item: SalesContractDetailType;
  fields: Array<{ key: string; message: string }>;
}) {
  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-violet-800">正式契約へ進める</p>
          <h3 className="mt-1 text-xl font-black text-violet-950">この契約はまだ契約候補です</h3>
          <p className="mt-2 text-sm font-semibold text-violet-900">
            車種、契約金額、支払回数、月額、支払開始日などを確定してください。
          </p>
        </div>
        <Badge className={getStatusClass(item.contract.status)}>
          {CONTRACT_STATUS_LABELS[item.contract.status]}
        </Badge>
      </div>
      <div className="mt-4 rounded border border-violet-100 bg-white px-4 py-3">
        <p className="text-sm font-black text-slate-950">未入力項目</p>
        {fields.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold text-violet-900">
            {fields.map((field) => <li key={field.key}>{field.message}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-600">
            必須項目は入力済みです。契約内容を確認し、契約ステータスを正式な状態へ変更してください。
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="#contract-edit" className="rounded bg-violet-700 px-4 py-2 text-sm font-bold text-white shadow-sm focus-ring">
          契約情報を編集して正式契約へ進める
        </Link>
        {item.contract.source_system === "gas_loan_review" ? (
          <Link href={buildLoanReviewReturnUrl(item)} target="_blank" rel="noopener noreferrer" className="rounded border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-800 focus-ring">
            自社ローン審査管理へ戻る
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function isFormalPendingStatus(value: SalesContractStatus) {
  return value === "contract_candidate" || value === "terms_pending";
}

function getMissingContractTerms(item: SalesContractDetailType) {
  return getSalesContractMissingRequiredFields({
    customerName: item.customer?.name,
    phone: item.customer?.phone,
    vehicleType: item.contract.vehicle_type,
    contractType: item.contract.contract_type,
    vehicleModel: item.vehicle?.model,
    salePrice: item.contract.sale_price,
    financeCompany: item.loan?.finance_company ?? "",
    leaseCompany: item.lease?.lease_company ?? "",
    installmentCount: item.loan?.installment_count,
    principal: item.loan?.principal ?? item.contract.financed_amount,
    monthlyPayment: item.loan?.monthly_payment,
    firstPaymentDate: item.loan?.first_payment_date,
    leaseMonths: item.lease?.lease_months,
    monthlyLeaseFee: item.lease?.monthly_lease_fee,
    leaseStartDate: item.lease?.lease_start_date,
    leaseEndDate: item.lease?.lease_end_date
  });
}

function LeaseMaturityNavigationCard({ item }: { item: SalesContractDetailType }) {
  const maturity = item.leaseMaturity;
  const maturityDate = maturity?.maturity_date ?? item.lease?.lease_end_date;
  const residualValueAmount = maturity?.residual_value_amount ?? item.lease?.residual_value_amount;
  const nextContactStatus = getNextContactStatus(maturity?.next_contact_date ?? null, maturity?.maturity_status ?? null);

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${maturity ? nextContactStatus.panelClass : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-600">リース契約</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">リース満期管理</h3>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            満期予定日: {formatSalesDate(maturityDate)} / 残価: {formatYen(residualValueAmount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {maturity ? (
            <>
              <Badge className={getLeaseMaturityStatusClass(maturity.maturity_status)}>{LEASE_MATURITY_STATUS_LABELS[maturity.maturity_status]}</Badge>
              <Badge className={getLeaseMaturityChoiceClass(maturity.customer_choice)}>{LEASE_MATURITY_CHOICE_LABELS[maturity.customer_choice]}</Badge>
              <Badge className={nextContactStatus.badgeClass}>{nextContactStatus.label}</Badge>
            </>
          ) : (
            <Badge className="bg-amber-100 text-amber-900">未作成</Badge>
          )}
        </div>
      </div>
      {maturity ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <SummaryItem label="満期ステータス" value={LEASE_MATURITY_STATUS_LABELS[maturity.maturity_status]} />
          <SummaryItem label="お客様の選択" value={LEASE_MATURITY_CHOICE_LABELS[maturity.customer_choice]} />
          <SummaryItem label="次回連絡予定日" value={formatSalesDate(maturity.next_contact_date)} />
        </dl>
      ) : (
        <p className="mt-3 text-sm font-semibold text-amber-900">
          満期管理を作成すると、満期ステータス、お客様の選択、次回連絡予定日を一覧で追えるようになります。
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="#lease-maturity" className={`rounded px-4 py-2 text-sm font-bold shadow-sm focus-ring ${maturity ? "bg-brand-700 text-white" : "bg-amber-700 text-white"}`}>
          {maturity ? "リース満期管理を編集" : "リース満期管理を作成"}
        </Link>
        {maturity ? (
          <Link href="/admin/sales-lease-maturities" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            リース満期一覧で見る
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function getNextContactStatus(value: string | null, maturityStatus: string | null) {
  if (maturityStatus === "completed") {
    return {
      label: "完了済み",
      panelClass: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-700"
    };
  }
  if (!value) {
    return {
      label: "次回連絡未設定",
      panelClass: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-700"
    };
  }
  const target = value.slice(0, 10);
  const today = getTodayYmd();
  if (target < today) {
    return {
      label: "連絡期限切れ",
      panelClass: "border-rose-200 bg-rose-50",
      badgeClass: "bg-rose-700 text-white"
    };
  }
  if (target <= today) {
    return {
      label: "今日まで",
      panelClass: "border-amber-200 bg-amber-50",
      badgeClass: "bg-amber-700 text-white"
    };
  }
  if (target <= addDaysYmd(today, 7)) {
    return {
      label: "7日以内",
      panelClass: "border-blue-200 bg-blue-50",
      badgeClass: "bg-blue-700 text-white"
    };
  }
  return {
    label: "予定あり",
    panelClass: "border-slate-200 bg-white",
    badgeClass: "bg-slate-900 text-white"
  };
}

function getLeaseMaturityStatusClass(value: string) {
  if (value === "completed") return "bg-slate-100 text-slate-700";
  if (value === "waiting_response") return "bg-amber-100 text-amber-900";
  if (value === "purchase_planned" || value === "renewal_planned" || value === "return_planned") return "bg-sky-100 text-sky-900";
  return "bg-emerald-50 text-emerald-800";
}

function getLeaseMaturityChoiceClass(value: string) {
  if (value === "undecided") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-900";
}

function DocumentLinksSection({ item }: { item: SalesContractDetailType }) {
  const documentByType = new Map<string, SalesDocument>();
  for (const document of item.documents) {
    if (!documentByType.has(document.document_type)) {
      documentByType.set(document.document_type, document);
    }
  }
  const registeredCount = DOCUMENT_TYPE_OPTIONS.filter((option) => Boolean(documentByType.get(option.value)?.file_url)).length;
  const importantMissingCount = DOCUMENT_TYPE_OPTIONS.filter((option) => {
    const document = documentByType.get(option.value);
    return isImportantDocument(option.value, item) && !document?.file_url;
  }).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">書類・添付URL</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            契約書類、審査書類、車両書類を種類ごとに確認できます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-slate-100 text-slate-700">登録済み {registeredCount}/{DOCUMENT_TYPE_OPTIONS.length}</Badge>
          {importantMissingCount ? <Badge className="bg-amber-100 text-amber-900">重要書類 未登録 {importantMissingCount}</Badge> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {DOCUMENT_GROUPS.map((group) => (
          <div key={group.title} className="rounded border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-sm font-black text-slate-950">{group.title}</h4>
            <div className="mt-3 grid gap-2">
              {group.types.map((type) => {
                const option = DOCUMENT_TYPE_OPTIONS.find((itemOption) => itemOption.value === type);
                if (!option) return null;
                return (
                  <DocumentLinkCard
                    key={type}
                    document={documentByType.get(type)}
                    item={item}
                    label={option.label}
                    type={type}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DocumentLinkCard({
  document,
  item,
  label,
  type
}: {
  document: SalesDocument | undefined;
  item: SalesContractDetailType;
  label: string;
  type: string;
}) {
  const hasUrl = Boolean(document?.file_url);
  const isImportant = isImportantDocument(type, item);
  const detailText = document?.title || (hasUrl && document ? DOCUMENT_VISIBILITY_LABELS[document.visibility] : "未登録");
  const cardClass = hasUrl
    ? "border-emerald-200 bg-white"
    : isImportant
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded border p-3 text-sm ${cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-950">{label}</p>
            {isImportant ? <Badge className="bg-amber-100 text-amber-900">要確認</Badge> : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {detailText}
          </p>
        </div>
        {document?.file_url ? (
          <Link
            href={document.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-brand-700 px-3 py-1.5 text-xs font-bold text-white focus-ring"
          >
            開く
          </Link>
        ) : (
          <span className={`rounded px-2.5 py-1 text-xs font-bold ${isImportant ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
            未登録
          </span>
        )}
      </div>
      {document?.memo ? <p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-slate-600">備考: {document.memo}</p> : null}
    </div>
  );
}

const DOCUMENT_GROUPS = [
  {
    title: "契約・審査書類",
    types: ["order_contract", "finance_contract", "lease_contract"]
  },
  {
    title: "本人確認・保証人",
    types: ["identity_document", "guarantor_document"]
  },
  {
    title: "車両・納車・GPS",
    types: ["vehicle_inspection_certificate", "compulsory_insurance", "delivery_confirmation", "vehicle_photo", "gps_consent"]
  }
] as const;

function isImportantDocument(type: string, item: SalesContractDetailType) {
  if (type === "finance_contract") return item.contract.contract_type === "loan";
  if (type === "lease_contract") return item.contract.contract_type === "lease";
  if (type === "gps_consent") return item.vehicle?.gps_installed === true;
  return type === "order_contract";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LoanReviewSourceCard({ item }: { item: SalesContractDetailType }) {
  const url = buildLoanReviewReturnUrl(item);
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-emerald-950">自社ローン審査管理</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold text-emerald-700">申込元</dt>
              <dd className="mt-1 font-black text-slate-950">自社ローン審査管理</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-emerald-700">申込管理番号</dt>
              <dd className="mt-1 font-black text-slate-950">{item.contract.source_row_number ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-emerald-700">受信日時</dt>
              <dd className="mt-1 font-black text-slate-950">{formatSalesDateTime(item.contract.source_received_at)}</dd>
            </div>
          </dl>
        </div>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm focus-ring"
        >
          自社ローン審査管理へ戻る
        </Link>
      </div>
      <p className="mt-3 text-xs font-semibold text-emerald-800">
        元の審査管理アプリを新しいタブで開きます。申込管理番号または申込IDが一致する場合は、GAS側で該当顧客を探しやすくします。
      </p>
    </section>
  );
}

function buildLoanReviewReturnUrl(item: SalesContractDetailType) {
  const params = new URLSearchParams();
  if (item.contract.source_row_number) {
    params.set("row", item.contract.source_row_number.toString());
    params.set("source_row_number", item.contract.source_row_number.toString());
  }
  if (item.contract.source_row_key) {
    params.set("source_row_key", item.contract.source_row_key);
  }
  const query = item.customer?.phone || item.customer?.name || "";
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `${LOAN_REVIEW_APP_URL}?${queryString}` : LOAN_REVIEW_APP_URL;
}

function sourceSystemLabel(value: string | null) {
  if (value === "gas_loan_review") return "自社ローン審査管理";
  return value || "-";
}

function InfoGrid({
  children,
  columns = "md:grid-cols-2"
}: {
  children: React.ReactNode;
  columns?: string;
}) {
  return <dl className={`grid gap-3 text-sm ${columns}`}>{children}</dl>;
}

function Info({
  label,
  value,
  className = "",
  multiline = false
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  multiline?: boolean;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className={className}>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 font-semibold text-slate-950 ${multiline ? "whitespace-pre-wrap" : ""}`}>{isEmpty ? "-" : value}</dd>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-black text-slate-950">{value || "-"}</dd>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function NextActionPanel({ history }: { history: SalesContactHistory | null }) {
  const status = getNextActionStatus(history?.next_action_date ?? null);
  return (
    <div className={`mt-5 rounded border px-4 py-3 ${status.panelClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black">次回やること</p>
        <Badge className={status.badgeClass}>{status.label}</Badge>
      </div>
      {history ? (
        <div className="mt-2 text-sm">
          <p className="font-bold text-slate-950">{formatSalesDate(history.next_action_date)} / {CONTACT_METHOD_LABELS[history.method]} / {CONTACT_STATUS_LABELS[history.status]}</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{history.content}</p>
          {history.memo ? <p className="mt-1 whitespace-pre-wrap text-xs font-semibold text-slate-500">備考: {history.memo}</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-slate-600">次回対応日は未設定です。</p>
      )}
    </div>
  );
}

function getNextAction(histories: SalesContactHistory[]) {
  return histories
    .filter((history) => Boolean(history.next_action_date))
    .sort((a, b) => {
      const dateCompare = String(a.next_action_date).localeCompare(String(b.next_action_date));
      if (dateCompare !== 0) return dateCompare;
      return String(b.handled_at ?? b.created_at).localeCompare(String(a.handled_at ?? a.created_at));
    })[0] ?? null;
}

function getNextActionStatus(value: string | null) {
  if (!value) {
    return {
      label: "期限なし",
      panelClass: "border-slate-200 bg-slate-50",
      badgeClass: "bg-slate-200 text-slate-700"
    };
  }

  const today = getTodayYmd();
  const target = value.slice(0, 10);
  if (target < today) {
    return {
      label: "期限切れ",
      panelClass: "border-rose-200 bg-rose-50",
      badgeClass: "bg-rose-700 text-white"
    };
  }
  if (target <= today) {
    return {
      label: "今日まで",
      panelClass: "border-amber-200 bg-amber-50",
      badgeClass: "bg-amber-700 text-white"
    };
  }
  if (target <= addDaysYmd(today, 7)) {
    return {
      label: "7日以内",
      panelClass: "border-blue-200 bg-blue-50",
      badgeClass: "bg-blue-700 text-white"
    };
  }
  return {
    label: "予定あり",
    panelClass: "border-slate-200 bg-white",
    badgeClass: "bg-slate-900 text-white"
  };
}

function getContractTypeClass(value: SalesContractType) {
  if (value === "loan") return "bg-indigo-50 text-indigo-800";
  if (value === "lease") return "bg-emerald-50 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function getStatusClass(value: SalesContractStatus) {
  if (value === "contract_candidate" || value === "negotiating" || value === "terms_pending") return "bg-violet-50 text-violet-800";
  if (value === "cancelled" || value === "trouble" || value === "payment_delay_contacted") return "bg-rose-50 text-rose-800";
  if (value === "waiting_delivery" || value === "payoff_scheduled") return "bg-amber-50 text-amber-800";
  if (value === "paid_off" || value === "lease_ended" || value === "delivered" || value === "completed") return "bg-slate-100 text-slate-700";
  return "bg-teal-50 text-teal-800";
}

function formatMileage(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("ja-JP")}km`;
}

function getTodayYmd() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDaysYmd(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isTestSalesDetail(item: SalesContractDetailType) {
  return [item.customer?.name, item.customer?.memo, item.contract.memo].some(containsTestMarker);
}

function containsTestMarker(value: unknown) {
  const text = String(value ?? "");
  return text.includes("テスト") || text.includes("動作確認");
}
