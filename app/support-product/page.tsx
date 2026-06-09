import Link from "next/link";

export default function SupportProductPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-bold text-brand-700">会員向け追加サービス</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">全省庁統一資格 申請準備サポート</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
        申請手順、必要書類チェックリスト、公式申請ページへの案内、入力前の確認ポイント、取得後に見るべき案件の探し方をまとめて確認できる自社サービスです。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-brand-200 bg-brand-50 p-5">
          <p className="text-sm font-bold text-brand-700">価格</p>
          <p className="mt-3 text-3xl font-black text-slate-950">会員限定 19,800円</p>
          <p className="mt-2 text-sm text-slate-600">通常価格 29,800円</p>
          <Link href="/billing" className="mt-5 inline-block rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">会員プランを確認</Link>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">含まれる内容</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-700">
            {["申請手順の案内", "必要書類チェックリスト", "公式申請ページへの案内", "入力前の確認ポイント", "物品・役務案件への活用方法", "取得後に見るべき案件の探し方", "アプリ内の資格必要案件フィルターの使い方"].map((item) => (
              <li key={item}>・{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        このサービスは行政書士業務ではありません。官公署提出書類の代理作成、代理申請、法的判断を伴う個別相談は行いません。必要な場合は提携行政書士への相談導線を案内します。
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/qualification/how-to-apply" className="rounded border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 focus-ring">まず自分で手順を確認</Link>
        <Link href="/scrivener" className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">不安なら専門家へ相談</Link>
      </div>
    </div>
  );
}
