import { loanFormMachinePrintingPolicy } from "@/lib/loan-forms/policy";

export default function PremiumLoanFormPage() {
  const premiumPolicy = loanFormMachinePrintingPolicy.premium;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-bold text-slate-500">プレミア申込書</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">手書き運用です</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {premiumPolicy.message} プレミアからの回答に基づく運用です。申込書は承認済みの手書き手順で作成してください。
      </p>
      <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        プレミアの審査依頼、審査結果管理、否決メールなど、申込書印字以外の既存業務は引き続き利用できます。
      </p>
    </div>
  );
}
