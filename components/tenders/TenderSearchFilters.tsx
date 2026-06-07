import { PREFECTURES, REGIONS, TENDER_TYPE_LABELS } from "@/lib/constants";

type Props = {
  region?: string;
  prefecture?: string;
  tenderType?: string;
  qualification?: string;
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
          <input name="keyword" defaultValue={props.keyword ?? ""} placeholder="清掃、車両、備品など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <Select name="region" label="地域" defaultValue={props.region ?? ""} options={[["", "全国"], ...REGIONS.filter((region) => region !== "全国").map((region) => [region, region])]} />
        <Select name="prefecture" label="都道府県" defaultValue={props.prefecture ?? ""} options={[["", "指定なし"], ...PREFECTURES.map((name) => [name, name])]} />
        <Select name="tenderType" label="案件種別" defaultValue={props.tenderType ?? ""} options={[["", "すべて"], ...Object.entries(TENDER_TYPE_LABELS)]} />
        <Select
          name="qualification"
          label="資格"
          defaultValue={props.qualification ?? ""}
          options={[
            ["", "すべて"],
            ["not_required", "資格不要"],
            ["required", "資格必要"]
          ]}
        />
        <Select
          name="sort"
          label="並び順"
          defaultValue={props.sort ?? "new"}
          options={[
            ["new", "新着順"],
            ["deadline", "締切日順"]
          ]}
        />
        <label className="flex items-center gap-2 self-end rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <input name="defenseOnly" value="1" type="checkbox" defaultChecked={props.defenseOnly === "1"} />
          防衛省・自衛隊のみ
        </label>
        <label className="flex items-center gap-2 self-end rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <input name="openCounterOnly" value="1" type="checkbox" defaultChecked={props.openCounterOnly === "1"} />
          オープンカウンターのみ
        </label>
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
