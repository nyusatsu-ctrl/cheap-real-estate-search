import Link from "next/link";
import { ExternalLink } from "lucide-react";

const officialLinks = [
  ["公式サイトでエリア検索を確認する", "https://www.p-portal.go.jp/pps-web-biz/geps-chotatujoho/resources/app/html/shikaku.html"],
  ["インターネット申請ページを開く", "https://www.p-portal.go.jp/pps-web-biz/geps-chotatujoho/resources/app/html/shinsei_internet.html"],
  ["受付・審査窓口を確認する", "https://www.p-portal.go.jp/pps-web-biz/geps-chotatujoho/resources/app/html/uketsuke.html"],
  ["有資格者名簿を確認する", "https://www.p-portal.go.jp/pps-web-biz/UZA01/OZA0101"]
];

export default function QualificationHowToApplyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-bold text-brand-700">申請準備</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">エリア検索の取得方法</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
        インターネット申請、郵送・持参申請、受付・審査窓口の確認、必要書類の準備までを公式情報で確認しながら進めます。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">申請の流れ</h2>
          <ol className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
            {["申請区分と競争参加地域を確認する", "必要書類と登記事項・納税証明等を準備する", "インターネット申請または郵送・持参申請を選ぶ", "受付・審査窓口を確認して提出する", "審査結果と有資格者名簿への登録を確認する"].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-brand-700 text-xs font-black text-white">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">申請前チェックリスト</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-700">
            {["会社情報・個人事業主情報に誤りがない", "必要書類の発行日が古すぎない", "物品の販売、役務の提供等の区分を確認した", "参加したい地域と物件条件を確認した", "公式ページで最新情報を確認した"].map((item) => (
              <li key={item}>・{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">公式リンク</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {officialLinks.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring">
              {label}
              <ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </div>
      </section>
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        申請前には必ず最新の公式情報を確認してください。取得代行を依頼する場合、行政書士業務は提携行政書士が行い、契約はユーザーと行政書士の直接契約になります。
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/scrivener" className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">
          エリア検索の取得代行を依頼する
        </Link>
      </div>
    </div>
  );
}
