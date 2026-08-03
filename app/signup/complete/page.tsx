import Link from "next/link";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { propertyMetadata } from "@/lib/property-metadata";

export const metadata: Metadata = {
  ...propertyMetadata(
    "登録受付｜格安不動産サーチ",
    "格安不動産サーチの無料登録受付画面です。"
  ),
  robots: { index: false, follow: false }
};

export default function SignupCompletePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
        <MailCheck className="h-10 w-10 text-emerald-700" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-emerald-700">無料登録受付</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">確認メールを送信しました</h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          メール内の確認ボタンを押してください。確認すると登録が完了し、会員ログインできるようになります。
        </p>

        <div className="mt-5 grid gap-2 rounded border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <p className="font-bold">カード登録は行われていません。</p>
          <p>14日間の無料期間終了後も自動課金はされません。</p>
        </div>

        <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-bold text-slate-900">メールが届かない場合</p>
          <p className="mt-2">迷惑メール、プロモーション、受信拒否設定をご確認ください。到着まで数分かかる場合があります。</p>
          <p className="mt-2">登録済みのメールアドレスには新しい確認メールが送られない場合があります。その場合は会員ログインをお試しください。</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded bg-brand-700 px-4 py-3 text-sm font-bold text-white focus-ring">
            会員ログインへ
          </Link>
          <Link href="/properties" className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 focus-ring">
            物件検索トップへ
          </Link>
        </div>
      </section>
    </div>
  );
}
