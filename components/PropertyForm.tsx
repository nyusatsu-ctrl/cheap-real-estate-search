import { savePropertyAction } from "@/app/admin/actions";
import { PERMISSION_LABELS, PREFECTURES, PROPERTY_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";

export function PropertyForm({ property }: { property?: Property | null }) {
  return (
    <form action={savePropertyAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="id" value={property?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="タイトル" name="title" defaultValue={property?.title} required className="md:col-span-2" />
        <Select label="物件種別" name="property_type" defaultValue={property?.property_type} options={PROPERTY_TYPE_LABELS} />
        <Field label="価格（円）" name="price_yen" type="number" min={0} max={30000000} defaultValue={property?.price_yen ?? 0} required />
        <Select label="都道府県" name="prefecture" defaultValue={property?.prefecture} options={Object.fromEntries(PREFECTURES.map((name) => [name, name]))} />
        <Field label="市区町村" name="city" defaultValue={property?.city} required />
        <Field label="表示住所" name="address_display" defaultValue={property?.address_display} required className="md:col-span-2" />
        <Field label="土地面積（㎡）" name="land_area_m2" type="number" step="0.01" defaultValue={property?.land_area_m2 ?? ""} />
        <Field label="建物面積（㎡）" name="building_area_m2" type="number" step="0.01" defaultValue={property?.building_area_m2 ?? ""} />
        <Field label="築年" name="construction_year" type="number" defaultValue={property?.construction_year ?? ""} />
        <Field label="緯度" name="latitude" type="number" step="0.000001" defaultValue={property?.latitude ?? ""} />
        <Field label="経度" name="longitude" type="number" step="0.000001" defaultValue={property?.longitude ?? ""} />
        <Field label="元ページURL" name="source_url" type="url" defaultValue={property?.source_url} required />
        <Field label="情報元名" name="source_name" defaultValue={property?.property_sources?.name ?? ""} required />
        <Field label="情報元サイトURL" name="source_website_url" type="url" defaultValue={property?.property_sources?.website_url ?? ""} />
        <Select label="掲載許諾状態" name="publication_permission" defaultValue={property?.publication_permission ?? "unknown"} options={PERMISSION_LABELS} />
        <Select label="公開状態" name="status" defaultValue={property?.status ?? "draft"} options={STATUS_LABELS} />
      </div>
      <div className="mt-6 flex justify-end">
        <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">保存する</button>
      </div>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  className?: string;
};

function Field({ label, name, className = "", ...props }: FieldProps) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" {...props} />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Record<string, string>;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue ?? Object.keys(options)[0]} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring">
        {Object.entries(options).map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
