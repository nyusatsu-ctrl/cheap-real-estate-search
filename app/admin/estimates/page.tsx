import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ESTIMATE_CATEGORIES } from "@/lib/estimate";
import { formatPrice } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { sampleContractorApplications, sampleEstimateRequests, sampleQuotes } from "@/lib/marketplace/sample-data";

const categoryLabels = Object.fromEntries(ESTIMATE_CATEGORIES.map((category) => [category.id, category.label]));

export default async function AdminEstimatesPage() {
  const admin = await getCurrentAdmin();
  const email = admin?.email ?? "preview@example.com";

  return (
    <AdminShell email={email}>
      {!admin ? (
        <div className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Supabase 管理者ログイン前のため、デモデータを表示しています。実運用では管理者だけが見られる画面です。
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">問い合わせ管理</h2>
          <p className="mt-1 text-sm text-slate-600">
            物件購入前後の相談内容、対応状況、提携先からの回答を運営者側で管理します。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/partners/register" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-ring">
            業者登録
          </Link>
          <Link href="/partners/quotes/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            回答入力
          </Link>
        </div>
      </div>

      <section className="grid gap-4">
        {sampleEstimateRequests.map((request) => {
          const quotes = sampleQuotes.filter((quote) => quote.estimate_request_id === request.id);
          return (
            <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">{request.id}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{request.property_title}</h3>
                  <p className="mt-1 text-sm text-slate-700">
                    {request.requester_name} / {request.requester_email} / {request.requester_phone}
                  </p>
                </div>
                <span className="rounded bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{request.status}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {request.categories.map((category) => (
                  <span key={category} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {categoryLabels[category] ?? category}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-700">{request.message}</p>

              <div className="mt-4 overflow-hidden rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">業者</th>
                      <th className="px-3 py-2">回答概要</th>
                      <th className="px-3 py-2">顧客表示金額</th>
                      <th className="px-3 py-2">手数料</th>
                      <th className="px-3 py-2">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {quotes.length > 0 ? (
                      quotes.map((quote) => (
                        <tr key={quote.id}>
                          <td className="px-3 py-3 font-semibold text-slate-800">{quote.contractor_name}</td>
                          <td className="px-3 py-3 text-slate-700">{quote.work_summary}</td>
                          <td className="px-3 py-3 font-black text-brand-700">{formatPrice(quote.customer_visible_amount_yen)}</td>
                          <td className="px-3 py-3 text-slate-700">
                            {quote.platform_fee_rate}% / {formatPrice(quote.platform_fee_yen)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{quote.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                          まだ回答は提出されていません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">登録業者</h2>
        <div className="mt-4 overflow-hidden rounded border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-3 py-2">会社名</th>
                <th className="px-3 py-2">対応業務</th>
                <th className="px-3 py-2">対応エリア</th>
                <th className="px-3 py-2">手数料率</th>
                <th className="px-3 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sampleContractorApplications.map((contractor) => (
                <tr key={contractor.id}>
                  <td className="px-3 py-3 font-semibold text-slate-800">{contractor.company_name}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {contractor.service_categories.map((category) => categoryLabels[category] ?? category).join("、")}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{contractor.service_areas.join("、")}</td>
                  <td className="px-3 py-3 font-bold text-brand-700">{contractor.commission_rate}%</td>
                  <td className="px-3 py-3 text-slate-700">{contractor.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
