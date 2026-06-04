export default function PremiumLoanFormPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-bold text-slate-500">プレミア申込書</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">顧客詳細画面から作成してください</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        申込書用の手入力フォームは使用しません。自社ローン審査管理アプリで顧客を選択し、顧客詳細画面の
        「プレミア申込書を作成」ボタンからPDFを作成します。
      </p>
      <a href="/loan/forms/premium/adjust" className="mt-5 inline-flex rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
        印字位置調整を開く
      </a>
    </div>
  );
}
