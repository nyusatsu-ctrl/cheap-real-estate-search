"use client";

import type { ComponentProps } from "react";

type BulkApproveFormProps = {
  action: ComponentProps<"form">["action"];
  candidateIds: string[];
  counts: Record<string, number>;
};

const buttons = [
  ["visible", "表示中の案件を一括承認"],
  ["defense", "防衛省・自衛隊案件を一括承認"],
  ["gsdf", "陸上自衛隊案件を一括承認"],
  ["msdf", "海上自衛隊案件を一括承認"],
  ["asdf", "航空自衛隊案件を一括承認"],
  ["open_counter", "オープンカウンターだけ一括承認"],
  ["goods_services", "物品・役務だけ一括承認"],
  ["kyushu_defense", "九州の防衛省・自衛隊案件を一括承認"],
  ["western_area", "西部方面会計隊案件を一括承認"],
  ["kyushu_goods_services", "九州の物品・役務案件を一括承認"],
  ["kyushu_open_counter", "九州のオープンカウンター案件を一括承認"]
];

export function BulkApproveForm({ action, candidateIds, counts }: BulkApproveFormProps) {
  return (
    <form
      action={action}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        const submitter = event.nativeEvent.submitter as HTMLButtonElement | null;
        const scope = submitter?.value ?? "visible";
        const count = counts[scope] ?? 0;
        if (!window.confirm(`表示中の${count}件を公開案件に登録します。よろしいですか？`)) {
          event.preventDefault();
        }
      }}
    >
      {candidateIds.map((id) => (
        <input key={id} type="hidden" name="candidate_id" value={id} />
      ))}
      <h3 className="font-black text-slate-950">一括承認</h3>
      <p className="mt-1 text-xs text-slate-500">空タイトル、重複、unknown、採用・広報・イベント系は自動的に除外します。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {buttons.map(([scope, label]) => (
          <button
            key={scope}
            name="scope"
            value={scope}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring hover:border-brand-400 hover:text-brand-700"
          >
            {label} ({counts[scope] ?? 0})
          </button>
        ))}
      </div>
    </form>
  );
}
