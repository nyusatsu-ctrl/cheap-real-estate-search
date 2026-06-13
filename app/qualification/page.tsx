import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function QualificationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-bold text-brand-700">エリア検索ガイド</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">エリア検索とは</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
        国の機関などが発注する物品の販売、役務の提供等の物件に参加する際、物件によって必要になる競争参加資格です。資格が必要な物件と不要な0円物件物件を分けて確認することで、初心者でも取り組みやすい物件を探しやすくなります。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["物品・役務物件で使う", "文具、消耗品、物件、清掃、点検、保守など、工事以外の物件でも資格が求められる場合があります。"],
          ["0円物件との違い", "0円物件は比較的小規模で見積参加しやすい物件が多く、資格不要の物件もあります。"],
          ["競争参加地域を確認", "資格には参加できる地域の考え方があります。全国か地域別かを物件ごとに確認します。"],
          ["エリア指定/不要で切替", "アプリ内ではエリア指定物件と資格不要物件をフィルターで切り替えられます。"]
        ].map(([title, body]) => (
          <section key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        申請条件、必要書類、審査内容は必ず公式サイトで確認してください。当アプリの情報は分かりやすく案内するための補助情報であり、資格取得、物件への参加、落札、契約を保証するものではありません。
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/qualification/how-to-apply" className="inline-flex items-center gap-2 rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">
          取得方法を見る
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/scrivener" className="rounded border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 focus-ring">取得代行を依頼する</Link>
      </div>
    </div>
  );
}
