import Link from "next/link";
import type { Metadata } from "next";
import { signUpMemberAction } from "@/app/auth/actions";
import { propertyMetadata } from "@/lib/property-metadata";

export const metadata: Metadata = propertyMetadata(
  "無料登録｜格安不動産サーチ",
  "カード登録不要で、格安不動産サーチの全機能を14日間無料で利用できます。"
);

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">無料トライアル登録</h1>
        <div className="mt-3 grid gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          <p className="font-bold">登録後14日間、全機能を無料で利用できます。</p>
          <p>無料登録時のカード登録は不要で、無料期間終了後も自動課金されません。</p>
          <p>継続する場合は月額4,980円（税込）の有料プランへお申し込みください。申込み時に4,980円が即時決済され、以後毎月自動更新されます。</p>
          <p>有料プランはStripeの契約管理画面から解約でき、解約後も支払済み期間の終了日まで利用できます。</p>
        </div>
        {params.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{params.error}</p>
        ) : null}
        <form action={signUpMemberAction} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            メールアドレス
            <input name="email" type="email" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            パスワード
            <input name="password" type="password" minLength={8} required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <button className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">14日間無料で始める</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          登録済みの方は{" "}
          <Link href="/login" className="font-bold text-brand-700">
            ログイン
          </Link>
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          登録すると
          <Link href="/terms" className="mx-1 font-bold text-brand-700">利用規約</Link>
          と
          <Link href="/privacy" className="mx-1 font-bold text-brand-700">プライバシーポリシー</Link>
          に同意したものとみなします。
        </p>
      </div>
    </div>
  );
}
