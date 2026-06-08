import fs from "node:fs";
import path from "node:path";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { PastAwardResult, PastAwardReviewStatus, PastAwardStats, SimilarPastAwardResult, Tender } from "@/lib/types";

const pastAwardPath = path.join(process.cwd(), "data", "past-award-results.json");
export const PAST_AWARD_PER_PAGE_OPTIONS = [50, 100, 200] as const;

export type AdminPastAwardFilters = {
  status: PastAwardReviewStatus | "all";
  keyword: string;
  agencyName: string;
  region: string;
  prefecture: string;
  businessType: string;
  tenderType: string;
  openedFrom: string;
  openedTo: string;
  publishedFrom: string;
  publishedTo: string;
};

export type AdminPastAwardPageInput = Omit<Partial<AdminPastAwardFilters>, "status"> & {
  status?: string;
  page?: string | number;
  perPage?: string | number;
};

export type AdminPastAwardPageResult = {
  awards: PastAwardResult[];
  filters: AdminPastAwardFilters;
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  statusCounts: Record<PastAwardReviewStatus | "all", number>;
};

type FilterableQuery<T> = {
  eq(column: string, value: string): T;
  gte(column: string, value: string): T;
  ilike(column: string, value: string): T;
  lte(column: string, value: string): T;
  or(filters: string): T;
};

export async function getAdminPastAwardResults(status: string = "all") {
  const result = await getAdminPastAwardPage({ status, perPage: 1000 });
  return result.awards;
}

export async function getAdminPastAwardPage(input: AdminPastAwardPageInput = {}): Promise<AdminPastAwardPageResult> {
  const filters = normalizeAdminPastAwardFilters(input);
  const requestedPage = positiveInt(input.page, 1);
  const perPage = normalizePerPage(input.perPage);
  const fallbackAwards = getFallbackPastAwardResults("all");
  const supabase = createSupabaseServiceRoleClient() ?? await createSupabaseServerClient();
  if (!supabase) return pageLocalPastAwards(fallbackAwards, filters, requestedPage, perPage);

  let query = supabase
    .from("past_award_results")
    .select("*", { count: "exact" })
    .order("opened_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  query = applyAdminPastAwardFilters(query, filters);

  const offset = (requestedPage - 1) * perPage;
  const { data, count, error } = await query.range(offset, offset + perPage - 1);
  if (error) return pageLocalPastAwards(fallbackAwards, filters, requestedPage, perPage);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const page = Math.min(requestedPage, totalPages);
  let awards = (data ?? []) as PastAwardResult[];

  if (requestedPage !== page && totalCount > 0) {
    let clampedQuery = supabase
      .from("past_award_results")
      .select("*", { count: "exact" })
      .order("opened_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    clampedQuery = applyAdminPastAwardFilters(clampedQuery, filters);
    const clampedOffset = (page - 1) * perPage;
    const { data: clampedData, error: clampedError } = await clampedQuery.range(clampedOffset, clampedOffset + perPage - 1);
    if (!clampedError) awards = (clampedData ?? []) as PastAwardResult[];
  }

  return {
    awards,
    filters,
    page,
    perPage,
    totalCount,
    totalPages,
    from: totalCount ? (page - 1) * perPage + 1 : 0,
    to: Math.min(page * perPage, totalCount),
    statusCounts: await getSupabasePastAwardStatusCounts(supabase, filters)
  };
}

export async function getSimilarPastAwardResults(tender: Tender, limit = 10) {
  const fallbackAwards = scoreSimilarAwards(getFallbackPastAwardResults("approved"), tender).slice(0, limit);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallbackAwards;

  const { data, error } = await supabase
    .from("past_award_results")
    .select("*")
    .eq("review_status", "approved")
    .or(`agency_name.eq.${escapeFilterValue(tender.agency_name)},region.eq.${escapeFilterValue(tender.region)},prefecture.eq.${escapeFilterValue(tender.prefecture)},tender_type.eq.${escapeFilterValue(tender.tender_type)}`)
    .order("opened_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) return fallbackAwards;
  return scoreSimilarAwards((data ?? []) as PastAwardResult[], tender).slice(0, limit);
}

export function summarizePastAwards(awards: PastAwardResult[]): PastAwardStats {
  const amounts = awards
    .map((award) => award.award_amount_yen)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const rates = awards
    .map((award) => award.win_rate)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    count: awards.length,
    averageAwardAmount: average(amounts),
    minAwardAmount: amounts.length ? Math.min(...amounts) : null,
    maxAwardAmount: amounts.length ? Math.max(...amounts) : null,
    averageWinRate: average(rates)
  };
}

export function getFallbackPastAwardResults(status: string = "all") {
  const awards = readJson<Partial<PastAwardResult>[]>(pastAwardPath, []).map(normalizeLocalPastAward);
  return status === "all" ? awards : awards.filter((award) => award.review_status === status);
}

export function scoreSimilarAwards(awards: PastAwardResult[], tender: Tender): SimilarPastAwardResult[] {
  const tenderKeywords = keywordSet(`${tender.title} ${tender.agency_name}`);
  return awards
    .map((award) => {
      const reasons: string[] = [];
      let score = 0;

      if (award.agency_name === tender.agency_name) {
        score += 35;
        reasons.push("発注機関一致");
      } else if (award.agency_name.includes(tender.agency_name) || tender.agency_name.includes(award.agency_name)) {
        score += 20;
        reasons.push("発注機関類似");
      }
      if (award.prefecture && award.prefecture === tender.prefecture) {
        score += 18;
        reasons.push("都道府県一致");
      } else if (award.region === tender.region) {
        score += 12;
        reasons.push("地域一致");
      }
      if (award.tender_type && award.tender_type === tender.tender_type) {
        score += 18;
        reasons.push("案件種別一致");
      }
      if (award.business_type && `${tender.title} ${tender.detail_memo ?? ""}`.includes(award.business_type)) {
        score += 10;
        reasons.push("業種一致");
      }

      const matchedKeywords = [...keywordSet(award.title)].filter((keyword) => tenderKeywords.has(keyword));
      if (matchedKeywords.length) {
        score += Math.min(25, matchedKeywords.length * 5);
        reasons.push(`キーワード一致: ${matchedKeywords.slice(0, 3).join(", ")}`);
      }

      return {
        ...award,
        similarity_score: score,
        similarity_reasons: reasons
      };
    })
    .filter((award) => award.similarity_score > 0)
    .sort((a, b) => {
      if (b.similarity_score !== a.similarity_score) return b.similarity_score - a.similarity_score;
      return new Date(b.opened_at ?? b.created_at).getTime() - new Date(a.opened_at ?? a.created_at).getTime();
    });
}

function normalizeLocalPastAward(award: Partial<PastAwardResult>, index: number): PastAwardResult {
  const now = new Date(0).toISOString();
  const dedupeKey = award.dedupe_key ?? stableHash(`${award.agency_name ?? ""}|${award.title ?? ""}|${award.opened_at ?? ""}|${award.source_url ?? ""}`);
  return {
    id: award.id ?? `past-award-${dedupeKey || index}`,
    agency_name: award.agency_name ?? "発注機関未設定",
    title: award.title ?? "",
    region: award.region ?? "全国",
    prefecture: award.prefecture ?? null,
    business_type: award.business_type ?? null,
    tender_type: award.tender_type ?? null,
    winner_name: award.winner_name ?? null,
    award_amount_yen: award.award_amount_yen ?? null,
    planned_price_yen: award.planned_price_yen ?? null,
    win_rate: award.win_rate ?? null,
    published_at: award.published_at ?? null,
    opened_at: award.opened_at ?? null,
    source_url: award.source_url ?? "",
    pdf_url: award.pdf_url ?? null,
    raw_text: award.raw_text ?? null,
    source_name: award.source_name ?? null,
    fetched_at: award.fetched_at ?? null,
    review_status: award.review_status ?? "approved",
    dedupe_key: dedupeKey,
    created_at: award.created_at ?? now,
    updated_at: award.updated_at ?? now
  };
}

function keywordSet(value: string) {
  const words = value
    .replace(/[()（）「」『』【】［］,、。・/]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !/^(公告|入札|一般|仕様書|一式|業務|購入|役務|物品)$/.test(word));
  return new Set(words);
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function escapeFilterValue(value: string) {
  return value.replace(/[,()]/g, " ");
}

function normalizeAdminPastAwardFilters(input: AdminPastAwardPageInput): AdminPastAwardFilters {
  const status = oneOf(input.status, ["all", "approved", "pending", "rejected"] as const, "all");
  return {
    status,
    keyword: normalizedText(input.keyword),
    agencyName: normalizedText(input.agencyName),
    region: normalizedText(input.region),
    prefecture: normalizedText(input.prefecture),
    businessType: normalizedText(input.businessType),
    tenderType: normalizedText(input.tenderType),
    openedFrom: normalizedDate(input.openedFrom),
    openedTo: normalizedDate(input.openedTo),
    publishedFrom: normalizedDate(input.publishedFrom),
    publishedTo: normalizedDate(input.publishedTo)
  };
}

function applyAdminPastAwardFilters<T extends FilterableQuery<T>>(query: T, filters: AdminPastAwardFilters): T {
  let filtered = query;
  const keyword = postgrestSearchText(filters.keyword);
  if (keyword) {
    filtered = filtered.or([
      `title.ilike.%${keyword}%`,
      `agency_name.ilike.%${keyword}%`,
      `winner_name.ilike.%${keyword}%`,
      `source_name.ilike.%${keyword}%`
    ].join(","));
  }
  if (filters.agencyName) filtered = filtered.ilike("agency_name", `%${filters.agencyName}%`);
  if (filters.region) filtered = filtered.eq("region", filters.region);
  if (filters.prefecture) filtered = filtered.eq("prefecture", filters.prefecture);
  if (filters.businessType) filtered = filtered.ilike("business_type", `%${filters.businessType}%`);
  if (filters.tenderType) filtered = filtered.eq("tender_type", filters.tenderType);
  if (filters.status !== "all") filtered = filtered.eq("review_status", filters.status);
  if (filters.openedFrom) filtered = filtered.gte("opened_at", filters.openedFrom);
  if (filters.openedTo) filtered = filtered.lte("opened_at", filters.openedTo);
  if (filters.publishedFrom) filtered = filtered.gte("published_at", filters.publishedFrom);
  if (filters.publishedTo) filtered = filtered.lte("published_at", filters.publishedTo);
  return filtered;
}

async function getSupabasePastAwardStatusCounts(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, filters: AdminPastAwardFilters) {
  if (!supabase) return { all: 0, approved: 0, pending: 0, rejected: 0 };

  const countFor = async (status: PastAwardReviewStatus | "all") => {
    let query = supabase.from("past_award_results").select("id", { count: "exact", head: true });
    query = applyAdminPastAwardFilters(query, { ...filters, status });
    const { count, error } = await query;
    return error ? 0 : count ?? 0;
  };

  const [all, approved, pending, rejected] = await Promise.all([
    countFor("all"),
    countFor("approved"),
    countFor("pending"),
    countFor("rejected")
  ]);

  return { all, approved, pending, rejected };
}

function pageLocalPastAwards(awards: PastAwardResult[], filters: AdminPastAwardFilters, requestedPage: number, perPage: number): AdminPastAwardPageResult {
  const statusCounts = {
    all: filterLocalPastAwards(awards, { ...filters, status: "all" }).length,
    approved: filterLocalPastAwards(awards, { ...filters, status: "approved" }).length,
    pending: filterLocalPastAwards(awards, { ...filters, status: "pending" }).length,
    rejected: filterLocalPastAwards(awards, { ...filters, status: "rejected" }).length
  };
  const totalCount = awards.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;
  return {
    awards: awards.slice(offset, offset + perPage),
    filters,
    page,
    perPage,
    totalCount,
    totalPages,
    from: totalCount ? offset + 1 : 0,
    to: Math.min(offset + perPage, totalCount),
    statusCounts
  };
}

function filterLocalPastAwards(awards: PastAwardResult[], filters: AdminPastAwardFilters) {
  const keyword = filters.keyword.toLowerCase();
  const agencyName = filters.agencyName.toLowerCase();
  const businessType = filters.businessType.toLowerCase();
  return awards.filter((award) => {
    if (filters.status !== "all" && award.review_status !== filters.status) return false;
    if (keyword && !`${award.title} ${award.agency_name} ${award.winner_name ?? ""} ${award.source_name ?? ""}`.toLowerCase().includes(keyword)) return false;
    if (agencyName && !award.agency_name.toLowerCase().includes(agencyName)) return false;
    if (filters.region && award.region !== filters.region) return false;
    if (filters.prefecture && award.prefecture !== filters.prefecture) return false;
    if (businessType && !(award.business_type ?? "").toLowerCase().includes(businessType)) return false;
    if (filters.tenderType && award.tender_type !== filters.tenderType) return false;
    if (filters.openedFrom && (!award.opened_at || award.opened_at < filters.openedFrom)) return false;
    if (filters.openedTo && (!award.opened_at || award.opened_at > filters.openedTo)) return false;
    if (filters.publishedFrom && (!award.published_at || award.published_at < filters.publishedFrom)) return false;
    if (filters.publishedTo && (!award.published_at || award.published_at > filters.publishedTo)) return false;
    return true;
  });
}

function normalizePerPage(value: string | number | undefined) {
  const perPage = positiveInt(value, 50);
  return PAST_AWARD_PER_PAGE_OPTIONS.includes(perPage as (typeof PAST_AWARD_PER_PAGE_OPTIONS)[number]) ? perPage : 50;
}

function positiveInt(value: string | number | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizedText(value: string | undefined) {
  return (value ?? "").trim();
}

function normalizedDate(value: string | undefined) {
  const text = normalizedText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function postgrestSearchText(value: string) {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

function oneOf<const T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(value ?? "") ? value as T[number] : fallback;
}

function readJson<T>(filePath: string, fallback: T) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
