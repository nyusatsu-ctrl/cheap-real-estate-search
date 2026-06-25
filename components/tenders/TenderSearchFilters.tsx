import { PREFECTURES, REGIONS } from "@/lib/constants";

type Props = {
  region?: string;
  prefecture?: string;
  tenderType?: string;
  qualification?: string;
  deadlineStatus?: string;
  keyword?: string;
  sort?: string;
  defenseOnly?: string;
  openCounterOnly?: string;
};

export function TenderSearchFilters(props: Props) {
  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          キーワード
          <input name="keyword" defaultValue={props.keyword ?? ""} placeholder="清掃、警備、備品、修繕、草刈り、印刷など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <Select name="region" label="地域" defaultValue={props.region ?? ""} options={[["", "全国"], ...REGIONS.filter((region) => region !== "全国").map((region) => [region, region])]} />
        <Select name="prefecture" label="都道府県" defaultValue={props.prefecture ?? ""} options={[["", "指定なし"], ...PREFECTURES.map((name) => [name, name])]} />
        <Select
          name="tenderType"
          label="案件区分"
          defaultValue={props.tenderType ?? ""}
          options={[
            ["", "すべて"],
            ["goods", "物品"],
            ["service", "役務"]
          ]}
        />
        <Select
          name="qualification"
          label="参加条件"
          defaultValue={props.qualification ?? ""}
          options={[
            ["", "すべて"],
            ["not_required", "資格不要・オープンカウンター"],
            ["unified_qualification", "全省庁統一資格対象"],
            ["area_specified", "エリア指定"],
            ["other_conditions", "その他条件あり"]
          ]}
        />
        <Select
          name="deadlineStatus"
          label="期限"
          defaultValue={props.deadlineStatus ?? ""}
          options={[
            ["", "参加可能・期限不明"],
            ["available", "参加可能のみ"],
            ["closing_soon", "締切間近"],
            ["unknown", "期限不明"],
            ["all", "期限切れも表示"],
            ["expired", "期限切れのみ"]
          ]}
        />
        <Select
          name="defenseOnly"
          label="発注機関"
          defaultValue={props.defenseOnly ?? ""}
          options={[
            ["", "すべて"],
            ["1", "防衛省・自衛隊のみ"]
          ]}
        />
        <Select
          name="sort"
          label="並び順"
          defaultValue={props.sort ?? "recommended"}
          options={[
            ["recommended", "参加しやすい順"],
            ["new", "新着順"],
            ["deadline", "締切日順"]
          ]}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button className="rounded bg-brand-700 px-5 py-2.5 text-sm font-bold text-white focus-ring">検索する</button>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[][];
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
