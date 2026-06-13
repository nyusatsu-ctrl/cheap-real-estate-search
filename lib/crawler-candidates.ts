import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getPriceRangeBounds, firstString, getRegionPrefectures } from "@/lib/property-filters";
import type { PropertyLocationOption } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

export type CrawlerCandidateSearchParams = {
  source?: SearchParamValue;
  status?: SearchParamValue;
  permission?: SearchParamValue;
  crawlStatus?: SearchParamValue;
  region?: SearchParamValue;
  prefecture?: SearchParamValue;
  city?: SearchParamValue;
  priceRange?: SearchParamValue;
  keyword?: SearchParamValue;
};

export type CrawlerCandidateFilters = {
  source?: string;
  status?: string;
  permission?: string;
  crawlStatus?: string;
  region?: string;
  prefecture?: string;
  city?: string;
  priceRange?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type CrawlerSourceOption = {
  source_key: string;
  name: string;
};

export type CrawlerCandidate = {
  id: string;
  title: string;
  price_yen: number;
  raw_price_text: string | null;
  prefecture: string;
  city: string;
  address_display: string;
  property_type: string;
  property_category: string | null;
  land_area_m2: number | null;
  building_area_m2: number | null;
  source_url: string;
  status: string;
  publication_permission: string;
  crawl_status: string | null;
  crawler_source_id: string | null;
  first_detected_at: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  has_updates: boolean | null;
  duplicate_key: string | null;
  content_hash: string | null;
  changed_fields: string[] | null;
  risk_tags: string[] | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  property_crawl_sources?: {
    source_key: string | null;
    name: string | null;
  } | null;
  property_sources?: {
    name: string | null;
    website_url: string | null;
  } | null;
};

const CRAWLER_REVIEW_STATUSES = new Set(["candidate", "checked", "test_reverted", "rejected"]);

export const CRAWLER_SOURCE_FALLBACKS: CrawlerSourceOption[] = [
  { source_key: "zero-estate", name: "みんなの0円物件" },
  { source_key: "akisol-zero", name: "アキソル 0円物件" },
  { source_key: "zenkoku-zero-fudosan", name: "全国0円不動産" },
  { source_key: "kumamoto-akiya", name: "熊本県空き家バンク" }
];

export function normalizeCrawlerCandidateFilters(params: CrawlerCandidateSearchParams): CrawlerCandidateFilters {
  const priceRange = firstString(params.priceRange);
  const priceBounds = getPriceRangeBounds(priceRange);

  return {
    source: firstString(params.source),
    status: firstString(params.status),
    permission: firstString(params.permission),
    crawlStatus: firstString(params.crawlStatus),
    region: firstString(params.region),
    prefecture: firstString(params.prefecture),
    city: firstString(params.city),
    priceRange,
    keyword: firstString(params.keyword),
    minPrice: priceBounds.minPrice,
    maxPrice: priceBounds.maxPrice
  };
}

export async function getCrawlerCandidateSources(): Promise<CrawlerSourceOption[]> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return CRAWLER_SOURCE_FALLBACKS;

  const { data, error } = await supabase
    .from("property_crawl_sources")
    .select("source_key, name")
    .order("source_key", { ascending: true });

  if (error) return CRAWLER_SOURCE_FALLBACKS;

  const sources = (data ?? [])
    .filter((source) => source.source_key && source.name)
    .map((source) => ({ source_key: source.source_key as string, name: source.name as string }));

  return sources.length ? sources : CRAWLER_SOURCE_FALLBACKS;
}

export async function getCrawlerCandidateLocations(): Promise<PropertyLocationOption[]> {
  const candidates = await getRawCrawlerCandidates();
  return uniqueLocations(candidates);
}

export async function getCrawlerCandidates(filters: CrawlerCandidateFilters): Promise<CrawlerCandidate[]> {
  const candidates = await getRawCrawlerCandidates();
  return candidates
    .filter((candidate) => matchesFilters(candidate, filters))
    .sort(sortCandidates);
}

async function getRawCrawlerCandidates(): Promise<CrawlerCandidate[]> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("properties")
    .select(
      [
        "id",
        "title",
        "price_yen",
        "raw_price_text",
        "prefecture",
        "city",
        "address_display",
        "property_type",
        "property_category",
        "land_area_m2",
        "building_area_m2",
        "source_url",
        "status",
        "publication_permission",
        "crawl_status",
        "crawler_source_id",
        "first_detected_at",
        "last_checked_at",
        "last_changed_at",
        "has_updates",
        "duplicate_key",
        "content_hash",
        "changed_fields",
        "risk_tags",
        "remarks",
        "created_at",
        "updated_at",
        "property_crawl_sources(source_key, name)",
        "property_sources(name, website_url)"
      ].join(",")
    )
    .order("updated_at", { ascending: false })
    .limit(3000);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as CrawlerCandidate[]).filter(isCrawlerCandidate);
}

function isCrawlerCandidate(candidate: CrawlerCandidate) {
  return Boolean(candidate.crawler_source_id || candidate.property_crawl_sources?.source_key || (candidate.crawl_status && CRAWLER_REVIEW_STATUSES.has(candidate.crawl_status)));
}

function matchesFilters(candidate: CrawlerCandidate, filters: CrawlerCandidateFilters) {
  if (filters.source && candidate.property_crawl_sources?.source_key !== filters.source) return false;
  if (filters.status && candidate.status !== filters.status) return false;
  if (filters.permission && !matchesPermission(candidate.publication_permission, filters.permission)) return false;
  if (filters.crawlStatus && candidate.crawl_status !== filters.crawlStatus) return false;
  if (filters.region && !getRegionPrefectures(filters.region).includes(candidate.prefecture)) return false;
  if (filters.prefecture && candidate.prefecture !== filters.prefecture) return false;
  if (filters.city && candidate.city !== filters.city) return false;
  if (filters.minPrice !== undefined && candidate.price_yen < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && candidate.price_yen > filters.maxPrice) return false;
  if (filters.keyword && !matchesKeyword(candidate, filters.keyword)) return false;
  return true;
}

function matchesPermission(current: string, filter: string) {
  if (filter === "approved") return current === "approved" || current === "permitted";
  if (filter === "rejected") return current === "rejected" || current === "denied";
  return current === filter;
}

function matchesKeyword(candidate: CrawlerCandidate, keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  return [
    candidate.title,
    candidate.prefecture,
    candidate.city,
    candidate.address_display,
    candidate.property_type,
    candidate.property_category,
    candidate.property_crawl_sources?.source_key,
    candidate.property_crawl_sources?.name,
    candidate.source_url,
    candidate.duplicate_key,
    candidate.content_hash,
    candidate.remarks
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
}

function sortCandidates(a: CrawlerCandidate, b: CrawlerCandidate) {
  const priorityDiff = candidatePriority(a) - candidatePriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

function candidatePriority(candidate: CrawlerCandidate) {
  if (candidate.status === "draft" && candidate.publication_permission === "pending") return 0;
  if (candidate.publication_permission === "pending") return 1;
  if (candidate.has_updates) return 2;
  return 3;
}

function uniqueLocations(candidates: CrawlerCandidate[]) {
  const seen = new Set<string>();
  const locations: PropertyLocationOption[] = [];

  for (const candidate of candidates) {
    if (!candidate.prefecture || !candidate.city) continue;
    const key = `${candidate.prefecture}\n${candidate.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({ prefecture: candidate.prefecture, city: candidate.city });
  }

  return locations.sort((a, b) => `${a.prefecture}${a.city}`.localeCompare(`${b.prefecture}${b.city}`, "ja"));
}
