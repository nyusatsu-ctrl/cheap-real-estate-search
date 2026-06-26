import { BUSINESS_INFO } from "@/lib/legal";
import { TENDER_MONTHLY_PRICE_TEXT, TENDER_SERVICE_NAME, TENDER_TRIAL_DAYS } from "@/lib/tender-billing";

export const TENDER_LEGAL_INFO = {
  ...BUSINESS_INFO,
  serviceName: TENDER_SERVICE_NAME,
  monthlyPriceText: TENDER_MONTHLY_PRICE_TEXT,
  trialDaysText: `${TENDER_TRIAL_DAYS}日間`,
  paymentTiming: "有料プラン申込み時から月額課金が開始し、解約するまで毎月自動更新されます。",
  trialBillingNote: "無料期間中はカード登録不要で、無料期間終了後に自動課金されることはありません。",
  refundPolicy: "サービスの性質上、申込み後の返金は法令上必要な場合を除き行いません。"
};
