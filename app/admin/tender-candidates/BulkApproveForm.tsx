"use client";

import type { ComponentProps } from "react";

type BulkApproveFormProps = {
  action: ComponentProps<"form">["action"];
  candidateIds: string[];
  counts: Record<string, number | string | null>;
  status: string;
  page: number;
  perPage: number;
};

const buttons = [
  { scope: "visible", label: "表示中の案件だけ承認", scopeLabel: "画面表示中" },
  { scope: "defense", label: "防衛系案件を全件承認", scopeLabel: "条件一致全件" },
  { scope: "gsdf", label: "陸上自衛隊案件を全件承認", scopeLabel: "条件一致全件" },
  { scope: "msdf", label: "海上自衛隊案件を全件承認", scopeLabel: "条件一致全件" },
  { scope: "asdf", label: "航空自衛隊案件を全件承認", scopeLabel: "条件一致全件" },
  { scope: "open_counter", label: "オープンカウンターを全件承認", scopeLabel: "条件一致全件" },
  { scope: "goods_services", label: "物品・役務を全件承認", scopeLabel: "条件一致全件" },
  { scope: "kyushu_defense", label: "九州の防衛系を全件承認", scopeLabel: "条件一致全件" },
  { scope: "western_area", label: "西部方面会計隊を全件承認", scopeLabel: "条件一致全件" },
  { scope: "kyushu_goods_services", label: "九州の物品・役務を全件承認", scopeLabel: "条件一致全件" },
  { scope: "kyushu_open_counter", label: "九州のオープンカウンターを全件承認", scopeLabel: "条件一致全件" }
] as const;

export function BulkApproveForm({ action, candidateIds, counts, status, page, perPage }: BulkApproveFormProps) {
  return (
    <form
      action={action}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        const submitter = event.nativeEvent.submitter as HTMLButtonElement | null;
        const scope = submitter?.value ?? "visible";
        const count = Number(counts[scope] ?? 0);
        const target = scope === "visible" ? `この画面に表示中の${count}件だけ` : `現在の確認待ち候補から条件一致する最大${count}件`;
        if (!window.confirm(`${target}を公開案件に登録します。品質NG・重複・既存公開URLはスキップされます。よろしいですか？`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="perPage" value={perPage} />
      {candidateIds.map((id) => (
        <input key={id} type="hidden" name="candidate_id" value={id} />
      ))}
      <h3 className="font-black text-slate-950">一括承認</h3>
      <p className="mt-1 text-xs text-slate-500">
        「表示中」はこのページの候補だけを対象にします。「全件」は現在の確認待ち候補全体から条件一致分を対象にします。月だけ、日付だけ、分類名だけ、短すぎる案件名、重複、unknown、採用・広報・イベント系は自動的に除外します。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {buttons.map(({ scope, label, scopeLabel }) => (
          <button
            key={scope}
            name="scope"
            value={scope}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring hover:border-brand-400 hover:text-brand-700"
          >
            {label} ({scopeLabel}: {counts[scope] ?? 0})
          </button>
        ))}
      </div>
    </form>
  );
}
