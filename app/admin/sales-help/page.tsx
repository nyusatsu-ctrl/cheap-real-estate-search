import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { LOAN_REVIEW_APP_URL } from "@/lib/sales-contracts/source";

export const metadata: Metadata = {
  title: "使い方 | 契約管理システム",
  description: "自社ローン審査管理アプリと契約管理システムの社内向け操作マニュアルです。"
};

const flowSteps = [
  "自社ローン審査管理で問い合わせ・仮審査を管理",
  "仮審査申込の顧客を「電子契約」で契約管理へ連携",
  "契約管理システムで顧客情報とメールアドレスを確認して電子契約を送信",
  "締結済み表示を確認してからローン審査へ進む",
  "審査後に契約条件を確認・補完",
  "契約を登録",
  "契約詳細で書類URL・対応履歴を管理",
  "リース契約は必要に応じてリース満期管理を作成"
];

const loanRules = [
  ["車ローン", "アプラス / プレミアファイナンス / アスト"],
  ["バイクローン", "プレミアファイナンス / アスト"],
  ["バイク", "アプラス不可、リース不可"],
  ["アスト", "ローンのみ"]
];

const leaseRules = [
  ["対象", "車のみ"],
  ["車リース", "アプラス / 昭和リース連携、プレミアファイナンス"],
  ["バイク", "リース不可"],
  ["満期管理", "満期が近いお客様だけ手動で作成"]
];

export default async function SalesHelpPage() {
  const admin = await requireAdmin();

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-brand-700">社内スタッフ向け</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">契約管理システム 使い方</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            自社ローン審査管理アプリから契約台帳へ送信し、契約条件・書類・対応履歴・リース満期を管理するための基本手順です。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={LOAN_REVIEW_APP_URL} target="_blank" rel="noopener noreferrer" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
              自社ローン審査管理を開く
            </a>
            <Link href="/admin/sales-contracts" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              契約台帳へ
            </Link>
            <Link href="/admin/sales-contracts/new" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              新規契約登録へ
            </Link>
            <Link href="/admin/sales-lease-maturities" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              リース満期一覧へ
            </Link>
          </div>
        </div>

        <Section title="基本の流れ">
          <ol className="grid gap-3 md:grid-cols-2">
            {flowSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs text-white">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="新規ローン契約の登録">
            <div className="space-y-3 text-sm font-semibold leading-6 text-slate-700">
              <p>審査管理アプリで顧客を選択し、「契約管理へ登録」を押すと、新規契約登録画面に顧客情報・電話番号・希望車種などが初期入力されます。</p>
              <p>手入力する場合は「新規契約登録」から登録します。保存前に契約金額、支払回数、信販会社を必ず確認してください。</p>
            </div>
            <RuleTable rows={loanRules} />
          </Section>

          <Section title="リース契約の登録">
            <div className="space-y-3 text-sm font-semibold leading-6 text-slate-700">
              <p>リース契約は車のみです。バイクではリースを選択しないでください。</p>
              <p>リース契約を登録した後、必要な場合は契約詳細の「リース満期管理を作成」から満期管理を開始します。</p>
            </div>
            <RuleTable rows={leaseRules} />
          </Section>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Section title="リース満期管理">
            <BulletList
              items={[
                "満期が近いお客様だけ手動で作成",
                "買取 / 再リース / 返却を管理",
                "残価、追加精算金、次回連絡予定日を管理",
                "既存450台を一括登録しない"
              ]}
            />
          </Section>

          <Section title="テストデータ">
            <BulletList
              items={[
                "テスト登録する場合は氏名・備考に「テスト」または「動作確認」を入れる",
                "テストデータだけ非表示にできる",
                "本物データは削除しない"
              ]}
            />
          </Section>

          <Section title="注意事項">
            <BulletList
              items={[
                "自動保存はされない",
                "GAS由来の申込情報は確認用であり、契約条件は必ず人間が最終確認する",
                "書類URLは必要書類だけ登録",
                "リース満期は作成済みのものだけ一覧に表示される"
              ]}
            />
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RuleTable({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-4 overflow-hidden rounded border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <tbody className="divide-y divide-slate-200">
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th className="w-32 bg-slate-50 px-3 py-2 text-left font-black text-slate-700">{label}</th>
              <td className="px-3 py-2 font-semibold text-slate-700">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm font-semibold leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
