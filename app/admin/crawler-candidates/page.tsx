import { Search } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { CrawlerCandidateActions } from "@/components/CrawlerCandidateActions";
import { PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS, PROPERTY_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import {
  getCrawlerCandidateLocations,
  getCrawlerCandidates,
  normalizeCrawlerCandidateFilters,
  type CrawlerCandidate,
  type CrawlerCandidateSearchParams
} from "@/lib/crawler-candidates";
import { formatArea, formatPrice } from "@/lib/format";
import { getCityOptions, getRegionPrefectures } from "@/lib/property-filters";
import { requireAdmin } from "@/lib/admin";

const STATUS_OPTIONS = [
  ["draft", "draft / 非公開"],
  ["published", "published / 公開中"],
  ["sold", "sold / 成約済み"]
] as const;

const PERMISSION_OPTIONS = [
  ["pending", "pending / 確認中"],
  ["approved", "approved / 承認済み"],
  ["rejected", "rejected / 却下"],
  ["unknown", "unknown / 未確認"]
] as const;

const CRAWL_STATUS_LABELS: Record<string, string> = {
  candidate: "取込候補",
  checked: "確認済み",
  rejected: "却下済み",
  test_reverted: "テスト戻し"
};

const CRAWL_STATUS_OPTIONS = [
  ["candidate", CRAWL_STATUS_LABELS.candidate],
  ["checked", CRAWL_STATUS_LABELS.checked],
  ["test_reverted", CRAWL_STATUS_LABELS.test_reverted],
  ["rejected", CRAWL_STATUS_LABELS.rejected]
] as const;

export default async function CrawlerCandidatesPage({ searchParams }: { searchParams: Promise<CrawlerCandidateSearchParams> }) {
  const admin = await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const filters = normalizeCrawlerCandidateFilters(resolvedSearchParams);
  const [candidates, locations] = await Promise.all([getCrawlerCandidates({ ...filters, source: undefined }), getCrawlerCandidateLocations()]);
  const prefectures = getRegionPrefectures(filters.region);
  const cities = getCityOptions(locations, filters.region, filters.prefecture);
  const returnTo = buildReturnTo(resolvedSearchParams);

  return (
    <AdminShell email={admin.email}>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">クローラー取込候補</h2>
        <p className="mt-1 text-sm text-slate-600">
          取込済みの候補物件を確認し、管理者判断で公開・非公開維持・却下を行います。自動公開はしません。
        </p>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/admin/crawler-candidates">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField name="status" label="公開状態" value={filters.status} options={STATUS_OPTIONS} />
            <SelectField name="permission" label="承認状態" value={filters.permission} options={PERMISSION_OPTIONS} />
            <SelectField name="crawlStatus" label="取込状態" value={filters.crawlStatus} options={CRAWL_STATUS_OPTIONS} />

            <SelectField name="region" label="地方ブロック" value={filters.region} emptyLabel="全国" options={PROPERTY_REGION_OPTIONS.map((region) => [region.value, region.label])} />
            <SelectField name="prefecture" label="都道府県" value={filters.prefecture} emptyLabel="全国" options={prefectures.map((prefecture) => [prefecture, prefecture])} />
            <SelectField name="city" label="市区町村" value={filters.city} options={cities.map((city) => [city, city])} />
            <SelectField name="priceRange" label="価格帯" value={filters.priceRange} emptyLabel="指定なし" options={PROPERTY_PRICE_RANGE_OPTIONS.map((range) => [range.value, range.label])} />

            <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2 xl:col-span-3">
              キーワード
              <input
                name="keyword"
                defaultValue={filters.keyword ?? ""}
                placeholder="物件名、所在地、情報元名、元URL、ハッシュなど"
                className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
              />
            </label>

            <button className="mt-1 flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring xl:mt-6">
              <Search className="h-4 w-4" />
              検索
            </button>
          </div>
        </form>
      </section>

      <p className="mb-3 text-sm font-semibold text-slate-700">{candidates.length}件</p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1900px] table-fixed divide-y divide-slate-200 text-sm">
            <colgroup>
              <col className="w-[24rem]" />
              <col className="w-[7rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[9rem]" />
              <col className="w-[10rem]" />
              <col className="w-[15rem]" />
              <col className="w-[9rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[15rem]" />
            </colgroup>
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">物件名</th>
                <th className="px-3 py-3 text-right">価格</th>
                <th className="px-3 py-3">都道府県</th>
                <th className="px-3 py-3">市区町村</th>
                <th className="px-3 py-3">種別</th>
                <th className="px-3 py-3">詳細種別</th>
                <th className="px-3 py-3">情報元</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">承認状態</th>
                <th className="px-3 py-3">取込状態</th>
                <th className="px-3 py-3">初回検知</th>
                <th className="px-3 py-3">最終確認</th>
                <th className="px-3 py-3">更新あり</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-bold leading-6 text-slate-950 line-clamp-2">{candidate.title}</div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-brand-700">詳細を確認</summary>
                      <CandidateDetails candidate={candidate} />
                    </details>
                  </td>
                  <td className="px-3 py-3 text-right align-top font-black text-brand-700 whitespace-nowrap">{formatPrice(candidate.price_yen)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{candidate.prefecture}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{candidate.city}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{propertyLabel(candidate.property_type)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{propertyLabel(candidate.property_category ?? candidate.property_type)}</td>
                  <td className="px-3 py-3 align-top text-xs font-semibold leading-5 text-slate-600">
                    {sourceName(candidate)}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{STATUS_LABELS[candidate.status as keyof typeof STATUS_LABELS] ?? candidate.status}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{permissionLabel(candidate.publication_permission)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{crawlStatusLabel(candidate.crawl_status)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{formatDateTime(candidate.first_detected_at)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{formatDateTime(candidate.last_checked_at)}</td>
                  <td className="px-3 py-3 align-top text-slate-700 whitespace-nowrap">{candidate.has_updates ? "あり" : "なし"}</td>
                  <td className="px-3 py-3 align-top">
                    <CrawlerCandidateActions id={candidate.id} title={candidate.title} sourceUrl={candidate.source_url} returnTo={returnTo} />
                  </td>
                </tr>
              ))}
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-slate-600">
                    条件に一致する取込候補はありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
  emptyLabel = "すべて"
}: {
  name: string;
  label: string;
  value?: string;
  options: readonly (readonly [string, string])[];
  emptyLabel?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={value ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring">
        <option value="">{emptyLabel}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function CandidateDetails({ candidate }: { candidate: CrawlerCandidate }) {
  const rows = [
    ["title", candidate.title],
    ["price_yen", formatPrice(candidate.price_yen)],
    ["raw_price_text", candidate.raw_price_text],
    ["prefecture", candidate.prefecture],
    ["city", candidate.city],
    ["address_display", candidate.address_display],
    ["property_type", candidate.property_type],
    ["property_category", candidate.property_category],
    ["land_area_m2", formatArea(candidate.land_area_m2)],
    ["building_area_m2", formatArea(candidate.building_area_m2)],
    ["source_name", sourceName(candidate)],
    ["source_key", candidate.property_crawl_sources?.source_key ?? "-"],
    ["source_url", candidate.source_url],
    ["duplicate_key", candidate.duplicate_key],
    ["content_hash", candidate.content_hash],
    ["changed_fields", formatList(candidate.changed_fields)],
    ["risk_tags", formatList(candidate.risk_tags)],
    ["remarks", candidate.remarks],
    ["created_at", formatDateTime(candidate.created_at)],
    ["updated_at", formatDateTime(candidate.updated_at)],
    ["last_changed_at", formatDateTime(candidate.last_changed_at)]
  ];

  return (
    <dl className="mt-3 grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 md:grid-cols-[8rem_1fr]">
          <dt className="font-mono font-bold text-slate-500">{label}</dt>
          <dd className="break-all text-slate-700">{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function propertyLabel(value: string) {
  return PROPERTY_TYPE_LABELS[value as keyof typeof PROPERTY_TYPE_LABELS] ?? value;
}

function permissionLabel(value: string) {
  if (value === "approved" || value === "permitted") return "approved / 承認済み";
  if (value === "rejected" || value === "denied") return "rejected / 却下";
  if (value === "pending") return "pending / 確認中";
  if (value === "unknown") return "unknown / 未確認";
  return value;
}

function crawlStatusLabel(value?: string | null) {
  if (!value) return "-";
  return CRAWL_STATUS_LABELS[value] ?? value;
}

function sourceName(candidate: CrawlerCandidate) {
  return candidate.property_crawl_sources?.name ?? candidate.property_sources?.name ?? "-";
}

function formatList(value?: string[] | null) {
  return value?.length ? value.join(", ") : "-";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildReturnTo(params: CrawlerCandidateSearchParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "source") continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first) search.set(key, first);
  }
  const query = search.toString();
  return query ? `/admin/crawler-candidates?${query}` : "/admin/crawler-candidates";
}
