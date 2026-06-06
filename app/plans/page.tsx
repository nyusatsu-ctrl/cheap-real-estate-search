import Link from "next/link";
import { Bell, Bookmark, Check, Database, Search, ShieldCheck } from "lucide-react";

const features = [
  "公開中物件の一覧閲覧",
  "都道府県、価格、物件種別で検索",
  "0円物件、300万円以下の絞り込み",
  "物件詳細と元ページURLの確認",
  "保存リスト",
  "詳細条件検索",
  "新着、価格変更、成約済みの更新確認",
  "複数エリアの横断チェック",
  "情報元と掲載許諾状態の確認"
];

export default function PlansPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <ShieldCheck className="h-4 w-4" />
              14日間無料、その後は手動で有料登録
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              まずは全機能を試してから、継続利用へ。
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              格安不動産探しは、実際に検索、保存、比較してみないと価値が分かりにくいサービスです。無料期間中は全機能を開放し、15日目以降は必要な人だけ月額2,980円の有料プランに申し込む設計にします。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                14日間無料で始める
              </Link>
              <Link href="/billing" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                課金設定を見る
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5 shadow-soft">
            <p className="inline-block rounded bg-brand-700 px-2 py-1 text-xs font-bold text-white">おすすめ構成</p>
            <h2 className="mt-4 text-xl font-black text-slate-950">全機能プラン</h2>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-black text-brand-700">月額2,980円</p>
              <p className="pb-1 text-sm font-semibold text-slate-500">税込想定</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              登録から14日間は0円。無料期間終了後は自動課金されず、継続利用する場合だけ有料プランへ申し込みます。
            </p>
            <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              無料登録時にカード情報は不要です。有料プランに申し込む画面で、月額料金、解約方法、返金条件を明記します。
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">料金設計</h2>
            <dl className="mt-5 grid gap-4">
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">無料期間</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">14日間</dd>
                <p className="mt-2 text-sm leading-6 text-slate-700">登録直後から全機能を利用可能。</p>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">無料期間終了後</dt>
                <dd className="mt-1 text-2xl font-black text-brand-700">月額2,980円</dd>
                <p className="mt-2 text-sm leading-6 text-slate-700">15日目以降は利用を停止し、継続する人だけ有料登録。</p>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">プラン数</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">1種類</dd>
                <p className="mt-2 text-sm leading-6 text-slate-700">迷わせず登録しやすい単一プランで始めます。</p>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">使える機能</h2>
            <ul className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-xl font-black text-slate-950">情報収集を増やす運用イメージ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              [Search, "取得元を増やす", "自治体空き家バンク、県単位の空き家バンク、格安不動産サイトを順番に追加します。"],
              [Database, "下書きで取り込む", "自動取得した情報はすぐ公開せず、価格、住所、面積、成約状態を管理画面で確認します。"],
              [Bell, "有料価値を作る", "保存条件、新着通知、価格変更通知、詳細条件検索を月額2,980円の価値にします。"],
              [Bookmark, "比較しやすくする", "気になる物件の保存、閲覧履歴、元ページへの導線で検討を支援します。"]
            ].map(([Icon, title, text]) => (
              <div key={title as string} className="rounded-lg border border-slate-200 p-4">
                {/* TypeScript narrows tuple icons poorly in JSX without this local component shape. */}
                <Icon className="h-5 w-5 text-brand-700" />
                <h3 className="mt-3 font-bold text-slate-950">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
