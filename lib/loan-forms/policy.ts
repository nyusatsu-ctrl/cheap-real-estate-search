import type { LoanFormCompany } from "./types";

// プレミアは機械印字・自動印刷不可。書面による再許可と社内承認なしに true へ変更しない。
export const loanFormMachinePrintingPolicy = Object.freeze({
  premium: Object.freeze({
    allowed: false,
    message: "プレミア申込書は手書き運用です。機械印字・自動印刷は利用できません。",
  }),
}) satisfies Record<LoanFormCompany, { allowed: boolean; message: string }>;

export function getLoanFormMachinePrintingPolicy(company: LoanFormCompany) {
  return loanFormMachinePrintingPolicy[company];
}
