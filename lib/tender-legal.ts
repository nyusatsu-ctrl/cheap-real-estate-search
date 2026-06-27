import { TENDER_MONTHLY_PRICE_TEXT, TENDER_SERVICE_NAME, TENDER_TRIAL_DAYS } from "@/lib/tender-billing";

export const TENDER_LEGAL_INFO = {
  companyName: "株式会社エコループ",
  representative: "嶋本耕力",
  address: "〒861-8038 熊本市東区長嶺東5-8-8",
  phone: "096-201-7191",
  businessHours: "9:30〜17:30",
  holidays: "日祝",
  serviceName: TENDER_SERVICE_NAME,
  monthlyPriceText: TENDER_MONTHLY_PRICE_TEXT,
  trialDaysText: `${TENDER_TRIAL_DAYS}日間`,
  paymentMethod: "クレジットカード決済、銀行振込",
  serviceAvailability: "申込・決済確認後、アカウントに利用権限を付与します。無料体験中は登録後すぐに利用できます。",
  cancellationMethod: "/tenders/billing の支払方法・解約管理から手続きできます。銀行振込の場合はお問い合わせください。",
  paymentTiming: "無料体験中に有料プランへ申し込んだ場合も、無料期間終了後から月額課金が開始し、解約するまで毎月自動更新されます。",
  trialBillingNote: "無料期間中はカード登録不要で、無料期間終了後に自動課金されることはありません。",
  refundPolicy: "デジタルサービスのため、提供開始後の返金は原則としてお受けできません。ただし法令上必要な場合を除きます。"
};
