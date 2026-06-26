import fs from "node:fs";
import path from "node:path";
import { createTenderSupabaseServerClient, createTenderSupabaseServiceRoleClient, getTenderSupabaseConfigStatus } from "@/lib/supabase/tenders-server";
import { DEFENSE_ORGANIZATION_TYPES, isDefenseLike, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import { isHighConfidenceTenderCandidate, isPublishableTenderRecord } from "@/lib/tender-candidate-quality";
import { assessTenderDeadline, assessTenderSourceAvailability, tenderDisplaySortPriority } from "@/lib/tender-deadlines";
import { TENDER_SOURCE_SEEDS } from "@/lib/tender-source-seeds";
import { sampleFavorites, sampleTenderSources, sampleTenders } from "@/lib/tenders/sample-data";
import type { FavoriteTenderStatus, ScrivenerInquiry, Tender, TenderCandidate, TenderCrawlLog, TenderFilters, TenderNotificationRule, TenderSource, TenderType, UserFavoriteTender } from "@/lib/types";

export function canUseMemberFeatures(member: { role: string; subscriptionStatus: string; isTrialExpired: boolean } | null) {
  if (!member) return false;
  if (member.role === "admin") return true;
  if (member.subscriptionStatus === "active") return true;
  return member.subscriptionStatus === "trialing" && !member.isTrialExpired;
}

export type TenderDatabaseDiagnostics = {
  config: ReturnType<typeof getTenderSupabaseConfigStatus>;
  canUseServiceRole: boolean;
  counts: {
    sources: number | null;
    activeSources: number | null;
    crawlReadySources: number | null;
    tenders: number | null;
    publishedTenders: number | null;
    candidates: number | null;
    pendingCandidates: number | null;
    crawlLogs: number | null;
    sourceErrors: number | null;
  };
  latestLog: (Pick<
    TenderCrawlLog,
    "id" | "source_id" | "started_at" | "finished_at" | "status" | "fetched_count" | "created_count" | "duplicate_count" | "skipped_count" | "error_message" | "created_at"
  > & {
    updated_count?: number | null;
    error_count?: number | null;
  }) | null;
  latestSourceError: {
    id: string;
    source_url: string | null;
    error_type: string | null;
    error_message: string;
    status_code: number | null;
    occurred_at: string;
  } | null;
  errors: string[];
};

export type TenderCandidatePageResult = {
  candidates: TenderCandidate[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  error: string | null;
};

export type TenderCandidateMetrics = {
  defenseCandidates: number;
  defensePublished: number;
  kyushuDefenseCandidates: number;
  kyushuDefensePublished: number;
  westernCandidates: number;
  westernPublished: number;
  pending: number;
  approved: number;
  rejected: number;
  duplicate: number;
  totalCandidates: number;
  error: string | null;
};

export type TenderCandidateBulkCounts = Record<
  "visible" | "defense" | "gsdf" | "msdf" | "asdf" | "open_counter" | "goods_services" | "kyushu_defense" | "western_area" | "kyushu_goods_services" | "kyushu_open_counter",
  number
> & { error: string | null };

export async function getPublishedTenders(filters: TenderFilters = {}) {
  const supabase = await createTenderSupabaseServerClient();
  const fallbackTenders = getFallbackTenders(filters);

  if (!supabase) {
    return fallbackTenders;
  }

  let query = supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("status", "published");

  query = filters.sort === "deadline"
    ? query.order("deadline_at", { ascending: true, nullsFirst: false })
    : query.order("published_at", { ascending: false, nullsFirst: false });

  const { data, error } = await query;
  if (error) return fallbackTenders;
  return filterTenders(((data ?? []) as Tender[]).map(normalizeDefenseTender).filter(isPublishableTenderRecord), filters);
}

export async function getPublishedTender(id: string) {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) return getFallbackTenders().find((tender) => tender.id === id && tender.status === "published") ?? null;

  const { data, error } = await supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return getFallbackTenders().find((tender) => tender.id === id && tender.status === "published") ?? null;
  const tender = normalizeDefenseTender(data as Tender);
  return isPublishableTenderRecord(tender) ? tender : null;
}

export async function getAdminTenders() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return getFallbackTenders();

  const { data, error } = await supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .order("updated_at", { ascending: false });

  if (error) return getFallbackTenders();
  return (data ?? []) as Tender[];
}

export async function getAdminTender(id: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return getFallbackTenders().find((tender) => tender.id === id) ?? null;

  const { data, error } = await supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("id", id)
    .single();

  if (error) return getFallbackTenders().find((tender) => tender.id === id) ?? null;
  return data as Tender;
}

export async function getTenderSources() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return getFallbackTenderSources();

  const { data, error } = await supabase.from("tender_sources").select("*").order("crawl_priority", { ascending: true }).order("updated_at", { ascending: false });
  if (error) return getFallbackTenderSources();

  const sources = (data ?? []) as TenderSource[];
  const [tenderCounts, latestErrors] = await Promise.all([getTenderCountsBySource(), getLatestCrawlErrorsBySource()]);
  return sources.map((source) => ({
    ...source,
    tender_count: tenderCounts.get(source.id) ?? 0,
    latest_error: latestErrors.get(source.id) ?? null
  }));
}

export async function getTenderCandidates(status: string = "pending") {
  const supabase = createTenderSupabaseServiceRoleClient();
  const fallbackCandidates = getFallbackTenderCandidates(status);
  if (!supabase) return fallbackCandidates;

  let query = supabase
    .from("tender_candidates")
    .select("*, tender_sources(name, source_name, organization_type, base_url)")
    .order("fetched_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("review_status", status);

  const { data, error } = await query;
  if (error) return fallbackCandidates;
  return (data ?? []) as TenderCandidate[];
}

export async function getTenderCandidatesPage({
  status = "pending",
  page = 1,
  perPage = 50
}: {
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<TenderCandidatePageResult> {
  const normalizedStatus = normalizeCandidateStatus(status);
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPerPage = normalizePerPage(perPage);
  const fallbackCandidates = getFallbackTenderCandidates(normalizedStatus);
  const fallbackResult = paginateCandidates(fallbackCandidates, normalizedPage, normalizedPerPage, null);
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return fallbackResult;

  const fetchPage = async (targetPage: number) => {
    let query = supabase
      .from("tender_candidates")
      .select("*, tender_sources(name, source_name, organization_type, base_url)", { count: "exact" })
      .order("fetched_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (normalizedStatus !== "all") query = query.eq("review_status", normalizedStatus);

    const offset = (targetPage - 1) * normalizedPerPage;
    return query.range(offset, offset + normalizedPerPage - 1);
  };

  const firstResult = await fetchPage(normalizedPage);
  if (firstResult.error) {
    return paginateCandidates(fallbackCandidates, normalizedPage, normalizedPerPage, firstResult.error.message);
  }

  const total = firstResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPerPage));
  if (total > 0 && normalizedPage > totalPages) {
    const clampedResult = await fetchPage(totalPages);
    if (clampedResult.error) {
      return paginateCandidates(fallbackCandidates, totalPages, normalizedPerPage, clampedResult.error.message);
    }
    return {
      candidates: await attachPublishedTenderStatus(((clampedResult.data ?? []) as TenderCandidate[]).map(normalizeDefenseTender)),
      total,
      page: totalPages,
      perPage: normalizedPerPage,
      totalPages,
      error: null
    };
  }

  return {
    candidates: await attachPublishedTenderStatus(((firstResult.data ?? []) as TenderCandidate[]).map(normalizeDefenseTender)),
    total,
    page: normalizedPage,
    perPage: normalizedPerPage,
    totalPages,
    error: null
  };
}

export async function getTenderCandidateMetrics(): Promise<TenderCandidateMetrics> {
  const fallbackCandidates = getFallbackTenderCandidates("all");
  const fallbackTenders = getFallbackTenders();
  const fallbackMetrics = {
    ...countCandidateMetricsFromRows(fallbackCandidates, fallbackTenders),
    error: null
  };
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return fallbackMetrics;

  const errors: string[] = [];
  const [
    totalCandidates,
    pending,
    approved,
    rejected,
    duplicate,
    defenseCandidates,
    kyushuDefenseCandidates,
    westernCandidates,
    defensePublished,
    kyushuDefensePublished,
    westernPublished
  ] = await Promise.all([
    countCandidateRows(errors),
    countCandidateRows(errors, [{ op: "eq", column: "review_status", value: "pending" }]),
    countCandidateRows(errors, [{ op: "eq", column: "review_status", value: "approved" }]),
    countCandidateRows(errors, [{ op: "eq", column: "review_status", value: "rejected" }]),
    countCandidateRows(errors, [{ op: "eq", column: "review_status", value: "duplicate" }]),
    countCandidateRows(errors, [{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }]),
    countCandidateRows(errors, [{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }, { op: "eq", column: "region", value: "九州" }]),
    countCandidateRows(errors, [{ op: "or", expression: WESTERN_AREA_OR_FILTER }]),
    countTenderRows(errors, [{ op: "eq", column: "status", value: "published" }, { op: "eq", column: "is_defense", value: true }]),
    countTenderRows(errors, [{ op: "eq", column: "status", value: "published" }, { op: "eq", column: "is_defense", value: true }, { op: "eq", column: "region", value: "九州" }]),
    countTenderRows(errors, [{ op: "eq", column: "status", value: "published" }, { op: "or", expression: WESTERN_AREA_OR_FILTER }])
  ]);

  return {
    defenseCandidates,
    defensePublished,
    kyushuDefenseCandidates,
    kyushuDefensePublished,
    westernCandidates,
    westernPublished,
    pending,
    approved,
    rejected,
    duplicate,
    totalCandidates,
    error: errors.length ? errors.slice(0, 5).join(" / ") : null
  };
}

export async function getTenderCandidateBulkCounts(visibleCandidates: TenderCandidate[]): Promise<TenderCandidateBulkCounts> {
  const fallbackCounts = {
    ...emptyBulkCounts(),
    ...countBulkCandidatesFromRows(visibleCandidates, "visible"),
    error: null
  };
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return fallbackCounts;

  const errors: string[] = [];
  const [
    defense,
    gsdf,
    msdf,
    asdf,
    openCounter,
    goodsServices,
    kyushuDefense,
    westernArea,
    kyushuGoodsServices,
    kyushuOpenCounter
  ] = await Promise.all([
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "eq", column: "organization_type", value: "ground_self_defense_force" }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "eq", column: "organization_type", value: "maritime_self_defense_force" }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "eq", column: "organization_type", value: "air_self_defense_force" }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "tender_type", values: ["open_counter", "small_discretionary"] }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "tender_type", values: ["goods", "services"] }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }, { op: "eq", column: "region", value: "九州" }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "or", expression: WESTERN_AREA_OR_FILTER }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }, { op: "eq", column: "region", value: "九州" }, { op: "in", column: "tender_type", values: ["goods", "services"] }])),
    countCandidateRows(errors, pendingBulkFilters([{ op: "in", column: "organization_type", values: DEFENSE_ORGANIZATION_TYPE_VALUES }, { op: "eq", column: "region", value: "九州" }, { op: "in", column: "tender_type", values: ["open_counter", "small_discretionary"] }]))
  ]);

  return {
    visible: countBulkCandidatesFromRows(visibleCandidates, "visible").visible,
    defense,
    gsdf,
    msdf,
    asdf,
    open_counter: openCounter,
    goods_services: goodsServices,
    kyushu_defense: kyushuDefense,
    western_area: westernArea,
    kyushu_goods_services: kyushuGoodsServices,
    kyushu_open_counter: kyushuOpenCounter,
    error: errors.length ? errors.slice(0, 5).join(" / ") : null
  };
}

const DEFENSE_ORGANIZATION_TYPE_VALUES = Array.from(DEFENSE_ORGANIZATION_TYPES);
const WESTERN_AREA_OR_FILTER = "source_name.ilike.%西部方面%,agency_name.ilike.%西部方面%,title.ilike.%西部方面%,source_url.ilike.%/gsdf/wae/%";

type CountFilter =
  | { op: "eq"; column: string; value: string | boolean }
  | { op: "in"; column: string; values: string[] }
  | { op: "or"; expression: string };

function normalizeCandidateStatus(status: string) {
  return ["pending", "approved", "rejected", "duplicate", "all"].includes(status) ? status : "pending";
}

function normalizePerPage(perPage: number) {
  if (!Number.isFinite(perPage)) return 50;
  return Math.min(100, Math.max(1, Math.floor(perPage)));
}

function paginateCandidates(candidates: TenderCandidate[], page: number, perPage: number, error: string | null): TenderCandidatePageResult {
  const total = candidates.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const offset = (clampedPage - 1) * perPage;
  return {
    candidates: candidates.slice(offset, offset + perPage).map(normalizeDefenseTender),
    total,
    page: clampedPage,
    perPage,
    totalPages,
    error
  };
}

async function attachPublishedTenderStatus(candidates: TenderCandidate[]) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase || candidates.length === 0) return candidates;

  const sourceUrls = [...new Set(candidates.map((candidate) => candidate.source_url).filter(Boolean))];
  if (!sourceUrls.length) return candidates;

  const publishedByUrl = new Map<string, { id: string; status: string | null }>();
  for (const chunk of chunks(sourceUrls, 200)) {
    const { data, error } = await supabase.from("tenders").select("id, source_url, status").in("source_url", chunk);
    if (error) return candidates;
    for (const tender of data ?? []) {
      if (tender.source_url) publishedByUrl.set(String(tender.source_url), { id: String(tender.id), status: tender.status ?? null });
    }
  }

  return candidates.map((candidate) => {
    const published = publishedByUrl.get(candidate.source_url);
    return published ? {
      ...candidate,
      published_tender_id: published.id,
      published_tender_status: published.status
    } : candidate;
  });
}

function pendingBulkFilters(filters: CountFilter[]) {
  return [{ op: "eq" as const, column: "review_status", value: "pending" }, ...filters];
}

async function countCandidateRows(errors: string[], filters: CountFilter[] = []) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return 0;
  let query = supabase.from("tender_candidates").select("id", { count: "exact", head: true });
  for (const filter of filters) {
    if (filter.op === "eq") query = query.eq(filter.column, filter.value);
    if (filter.op === "in") query = query.in(filter.column, filter.values);
    if (filter.op === "or") query = query.or(filter.expression);
  }
  const { count, error } = await query;
  if (error) {
    errors.push(`tender_candidates: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function countTenderRows(errors: string[], filters: CountFilter[] = []) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return 0;
  let query = supabase.from("tenders").select("id", { count: "exact", head: true });
  for (const filter of filters) {
    if (filter.op === "eq") query = query.eq(filter.column, filter.value);
    if (filter.op === "in") query = query.in(filter.column, filter.values);
    if (filter.op === "or") query = query.or(filter.expression);
  }
  const { count, error } = await query;
  if (error) {
    errors.push(`tenders: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

function emptyBulkCounts(): TenderCandidateBulkCounts {
  return {
    visible: 0,
    defense: 0,
    gsdf: 0,
    msdf: 0,
    asdf: 0,
    open_counter: 0,
    goods_services: 0,
    kyushu_defense: 0,
    western_area: 0,
    kyushu_goods_services: 0,
    kyushu_open_counter: 0,
    error: null
  };
}

function countBulkCandidatesFromRows(candidates: TenderCandidate[], target: keyof Omit<TenderCandidateBulkCounts, "error">) {
  const counts = emptyBulkCounts();
  for (const candidate of candidates.map(normalizeDefenseTender)) {
    if (!isBulkApprovableCandidate(candidate)) continue;
    const isDefense = isDefenseLike(candidate);
    const isKyushu = tenderRegion(candidate) === "九州";
    const isOpenCounter = candidate.tender_type === "open_counter" || candidate.tender_type === "small_discretionary";
    const isGoodsServices = candidate.tender_type === "goods" || candidate.tender_type === "services";
    counts.visible += 1;
    if (isDefense) counts.defense += 1;
    if (candidate.organization_type === "ground_self_defense_force") counts.gsdf += 1;
    if (candidate.organization_type === "maritime_self_defense_force") counts.msdf += 1;
    if (candidate.organization_type === "air_self_defense_force") counts.asdf += 1;
    if (isOpenCounter) counts.open_counter += 1;
    if (isGoodsServices) counts.goods_services += 1;
    if (isDefense && isKyushu) counts.kyushu_defense += 1;
    if (isWesternAreaCandidate(candidate)) counts.western_area += 1;
    if (isDefense && isKyushu && isGoodsServices) counts.kyushu_goods_services += 1;
    if (isDefense && isKyushu && isOpenCounter) counts.kyushu_open_counter += 1;
  }
  return { [target]: counts[target] } as Pick<TenderCandidateBulkCounts, typeof target>;
}

function countCandidateMetricsFromRows(candidates: TenderCandidate[], tenders: Tender[]) {
  const normalizedCandidates = candidates.map(normalizeDefenseTender);
  const normalizedTenders = tenders.map(normalizeDefenseTender);
  return {
    defenseCandidates: normalizedCandidates.filter(isDefenseLike).length,
    defensePublished: normalizedTenders.filter(isDefenseLike).length,
    kyushuDefenseCandidates: normalizedCandidates.filter((candidate) => isDefenseLike(candidate) && tenderRegion(candidate) === "九州").length,
    kyushuDefensePublished: normalizedTenders.filter((tender) => isDefenseLike(tender) && tenderRegion(tender) === "九州").length,
    westernCandidates: normalizedCandidates.filter(isWesternAreaCandidate).length,
    westernPublished: normalizedTenders.filter(isWesternAreaCandidate).length,
    pending: normalizedCandidates.filter((candidate) => candidate.review_status === "pending").length,
    approved: normalizedCandidates.filter((candidate) => candidate.review_status === "approved").length,
    rejected: normalizedCandidates.filter((candidate) => candidate.review_status === "rejected").length,
    duplicate: normalizedCandidates.filter((candidate) => candidate.review_status === "duplicate").length,
    totalCandidates: normalizedCandidates.length
  };
}

function isBulkApprovableCandidate(candidate: TenderCandidate) {
  if (!candidate.title.trim()) return false;
  if (!candidate.source_url && !candidate.pdf_url) return false;
  if (!candidate.agency_name.trim()) return false;
  if (candidate.review_status !== "pending") return false;
  if (candidate.duplicate_candidate_id) return false;
  if (!isHighConfidenceTenderCandidate(candidate)) return false;
  return candidate.tender_type !== "unknown" && candidate.tender_type !== "construction";
}

function isWesternAreaCandidate(candidate: TenderCandidate | Tender) {
  const target = `${candidate.source_name ?? ""} ${candidate.agency_name} ${candidate.title} ${candidate.source_url}`;
  return target.includes("/gsdf/wae/") || target.includes("西部方面") || target.includes("西部方面会計隊");
}

export async function getTenderCrawlLogs(limit: number = 20) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return [] as TenderCrawlLog[];

  const { data, error } = await supabase
    .from("tender_crawl_logs")
    .select("*, tender_sources(name, source_name, url)")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) return [] as TenderCrawlLog[];
  return (data ?? []) as TenderCrawlLog[];
}

export async function getTenderDatabaseDiagnostics() {
  const diagnostics: TenderDatabaseDiagnostics = {
    config: getTenderSupabaseConfigStatus(),
    canUseServiceRole: false,
    counts: {
      sources: null,
      activeSources: null,
      crawlReadySources: null,
      tenders: null,
      publishedTenders: null,
      candidates: null,
      pendingCandidates: null,
      crawlLogs: null,
      sourceErrors: null
    },
    latestLog: null,
    latestSourceError: null,
    errors: []
  };

  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    diagnostics.errors.push("TENDER_SUPABASE_URL または TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。");
    return diagnostics;
  }

  diagnostics.canUseServiceRole = true;

  recordDiagnosticCount(diagnostics, "sources", await supabase.from("tender_sources").select("id", { count: "exact", head: true }));
  recordDiagnosticCount(diagnostics, "activeSources", await supabase.from("tender_sources").select("id", { count: "exact", head: true }).eq("is_active", true));
  recordDiagnosticCount(
    diagnostics,
    "crawlReadySources",
    await supabase
      .from("tender_sources")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("crawl_ready", true)
      .neq("crawler_type", "manual_only")
  );
  recordDiagnosticCount(diagnostics, "tenders", await supabase.from("tenders").select("id", { count: "exact", head: true }));
  recordDiagnosticCount(diagnostics, "publishedTenders", await supabase.from("tenders").select("id", { count: "exact", head: true }).eq("status", "published"));
  recordDiagnosticCount(diagnostics, "candidates", await supabase.from("tender_candidates").select("id", { count: "exact", head: true }));
  recordDiagnosticCount(diagnostics, "pendingCandidates", await supabase.from("tender_candidates").select("id", { count: "exact", head: true }).eq("review_status", "pending"));
  recordDiagnosticCount(diagnostics, "crawlLogs", await supabase.from("tender_crawl_logs").select("id", { count: "exact", head: true }));
  recordDiagnosticCount(diagnostics, "sourceErrors", await supabase.from("tender_source_errors").select("id", { count: "exact", head: true }));

  const latestLogResult = await supabase
    .from("tender_crawl_logs")
    .select("id, source_id, started_at, finished_at, status, fetched_count, created_count, updated_count, duplicate_count, skipped_count, error_count, error_message, created_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLogResult.error) {
    diagnostics.errors.push(`tender_crawl_logs latest: ${latestLogResult.error.message}`);
  } else {
    diagnostics.latestLog = latestLogResult.data as TenderDatabaseDiagnostics["latestLog"];
  }

  const latestErrorResult = await supabase
    .from("tender_source_errors")
    .select("id, source_url, error_type, error_message, status_code, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErrorResult.error) {
    diagnostics.errors.push(`tender_source_errors latest: ${latestErrorResult.error.message}`);
  } else {
    diagnostics.latestSourceError = latestErrorResult.data as TenderDatabaseDiagnostics["latestSourceError"];
  }

  return diagnostics;
}

function recordDiagnosticCount(
  diagnostics: TenderDatabaseDiagnostics,
  key: keyof TenderDatabaseDiagnostics["counts"],
  result: { count: number | null; error: { message: string } | null }
) {
  if (result.error) {
    diagnostics.errors.push(`${key}: ${result.error.message}`);
    return;
  }
  diagnostics.counts[key] = result.count ?? 0;
}

export async function getTenderCandidate(id: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tender_candidates")
    .select("*, tender_sources(name, source_name, organization_type, base_url)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as TenderCandidate;
}

async function getTenderCountsBySource() {
  const supabase = createTenderSupabaseServiceRoleClient();
  const counts = new Map<string, number>();
  if (!supabase) return counts;

  const { data } = await supabase.from("tenders").select("source_id").not("source_id", "is", null);
  for (const row of data ?? []) {
    const sourceId = String(row.source_id);
    counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
  }
  return counts;
}

async function getLatestCrawlErrorsBySource() {
  const supabase = createTenderSupabaseServiceRoleClient();
  const errors = new Map<string, string | null>();
  if (!supabase) return errors;

  const { data } = await supabase
    .from("tender_crawl_logs")
    .select("source_id, error_message, started_at")
    .not("source_id", "is", null)
    .order("started_at", { ascending: false });

  for (const row of data ?? []) {
    const sourceId = String(row.source_id);
    if (!errors.has(sourceId)) errors.set(sourceId, row.error_message ?? null);
  }
  return errors;
}

export async function getFavoriteTenders(userId: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return sampleFavorites.filter((favorite) => favorite.user_id === userId);

  const { data, error } = await supabase
    .from("tender_favorites")
    .select("*, tenders(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return sampleFavorites.filter((favorite) => favorite.user_id === userId);
  return (data ?? []) as UserFavoriteTender[];
}

export async function getScrivenerInquiries() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return [] as ScrivenerInquiry[];

  const { data, error } = await supabase.from("scrivener_inquiries").select("*").order("created_at", { ascending: false });
  if (error) return [] as ScrivenerInquiry[];
  return (data ?? []) as ScrivenerInquiry[];
}

export function parseTenderFilters(params: Record<string, string | undefined>): TenderFilters {
  const tenderType = params.tenderType === "services" ? "service" : params.tenderType;
  return {
    region: params.region || undefined,
    prefecture: params.prefecture || undefined,
    tenderType: (tenderType || undefined) as TenderType | undefined,
    qualification: normalizeParticipationCondition(params.qualification),
    deadlineStatus: normalizeDeadlineStatus(params.deadlineStatus),
    defenseOnly: params.defenseOnly === "1",
    openCounterOnly: params.openCounterOnly === "1",
    keyword: params.keyword || undefined,
    sort: normalizeTenderSort(params.sort)
  };
}

function filterTenders(tenders: Tender[], filters: TenderFilters) {
  const keyword = filters.keyword?.toLowerCase();
  const filtered = tenders.filter((tender) => {
    const normalized = normalizeDefenseTender(tender);
    return tenderMatchesFilters(normalized, { ...filters, keyword });
  });

  return [...filtered].sort((a, b) => {
    const aDeadline = assessTenderDeadline(a);
    const bDeadline = assessTenderDeadline(b);
    const aAvailability = assessTenderSourceAvailability(a);
    const bAvailability = assessTenderSourceAvailability(b);
    if (filters.sort === "deadline") {
      return tenderDisplaySortPriority(aDeadline.status, aAvailability.status) - tenderDisplaySortPriority(bDeadline.status, bAvailability.status)
        || new Date(aDeadline.deadlineAt ?? "9999-12-31").getTime() - new Date(bDeadline.deadlineAt ?? "9999-12-31").getTime()
        || compareDateDesc(a.published_at ?? a.created_at, b.published_at ?? b.created_at);
    }
    if (filters.sort === "new") {
      return compareDateDesc(a.published_at ?? a.created_at, b.published_at ?? b.created_at);
    }
    return tenderDisplaySortPriority(aDeadline.status, aAvailability.status) - tenderDisplaySortPriority(bDeadline.status, bAvailability.status)
      || compareDeadlineAsc(aDeadline.deadlineAt, bDeadline.deadlineAt)
      || compareDateDesc(a.published_at ?? a.created_at, b.published_at ?? b.created_at);
  });
}

export function tenderMatchesFilters(tender: Tender, filters: TenderFilters & { keyword?: string }) {
  const deadline = assessTenderDeadline(tender);
  const availability = assessTenderSourceAvailability(tender);
  if (!matchesDeadlineStatus(deadline.status, availability.status, filters.deadlineStatus)) return false;
  if (filters.region && filters.region !== "全国" && tenderRegion(tender) !== filters.region) return false;
  if (filters.prefecture && tender.prefecture !== filters.prefecture) return false;
  if (filters.tenderType && tender.tender_type !== filters.tenderType) return false;
  if (filters.qualification && !matchesParticipationCondition(tender, filters.qualification)) return false;
  if (filters.defenseOnly && !isDefenseLike(tender)) return false;
  if (filters.openCounterOnly && tender.tender_type !== "open_counter") return false;
  if (filters.keyword) {
    const haystack = tenderSearchHaystack(tender).toLowerCase();
    if (!haystack.includes(filters.keyword.toLowerCase())) return false;
  }
  return true;
}

export function tenderMatchesNotificationRule(tenderInput: Tender, rule: TenderNotificationRule, options: { ignoreActive?: boolean } = {}) {
  if (!options.ignoreActive && (!rule.is_active || rule.deleted_at)) return false;
  if (!rule.app_enabled && !rule.email_enabled) return false;

  const tender = normalizeDefenseTender(tenderInput);
  if (tender.status !== "published") return false;
  if (!isPublishableTenderRecord(tender)) return false;

  const deadline = assessTenderDeadline(tender);
  const availability = assessTenderSourceAvailability(tender);
  if (deadline.status === "archived" || deadline.status === "expired") return false;
  if (availability.status === "source_closed") return false;

  if (deadline.status === "unknown") {
    if (!rule.include_unknown_deadline) return false;
    if (availability.status !== "source_open" && availability.status !== "source_unknown") return false;
  }

  const minDays = Number(rule.min_days_until_deadline ?? 0);
  if (deadline.daysUntil !== null && minDays > 0 && deadline.daysUntil < minDays) return false;

  if (!tenderMatchesFilters(tender, {
    region: rule.region || undefined,
    prefecture: rule.prefecture || undefined,
    tenderType: rule.tender_type || undefined,
    qualification: rule.participation_condition || undefined,
    defenseOnly: rule.defense_only,
    openCounterOnly: rule.open_counter_only,
    keyword: rule.keyword || undefined
  })) {
    return false;
  }

  if (rule.qualification_required_only && !tender.qualification_required) return false;
  if (rule.deadline_soon_only && deadline.status !== "closing_soon") return false;
  if (rule.agency_name && !tender.agency_name.includes(rule.agency_name)) return false;
  if (rule.exclude_keyword) {
    const haystack = tenderSearchHaystack(tender);
    const excluded = splitKeywords(rule.exclude_keyword).some((keyword) => haystack.includes(keyword));
    if (excluded) return false;
  }

  return true;
}

export function tenderNotificationMatchReason(tender: Tender, rule: TenderNotificationRule) {
  const reasons = [];
  const deadline = assessTenderDeadline(tender);
  const availability = assessTenderSourceAvailability(tender);
  if (rule.keyword) reasons.push(`キーワード: ${rule.keyword}`);
  if (rule.agency_name) reasons.push(`発注機関: ${rule.agency_name}`);
  if (rule.prefecture) reasons.push(`都道府県: ${rule.prefecture}`);
  if (rule.region) reasons.push(`地域: ${rule.region}`);
  if (rule.tender_type) reasons.push(`案件区分: ${rule.tender_type}`);
  if (rule.defense_only) reasons.push("防衛省・自衛隊のみ");
  if (deadline.status === "unknown") reasons.push(`期限不明: ${availability.status}`);
  if (deadline.daysUntil !== null) reasons.push(`締切まで${deadline.daysUntil}日`);
  return reasons.length ? reasons.join(" / ") : "通知条件に一致";
}

function tenderSearchHaystack(tender: Tender) {
  return [
    tender.title,
    tender.agency_name,
    tender.region,
    tender.prefecture,
    tender.detail_memo,
    tender.raw_text,
    tender.required_qualification,
    tender.source_name,
    tender.tender_sources?.source_name,
    tender.tender_sources?.name
  ].filter(Boolean).join(" ");
}

function splitKeywords(value: string) {
  return String(value)
    .split(/[\s,、]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeDeadlineStatus(value: string | undefined): TenderFilters["deadlineStatus"] {
  if (value === "available" || value === "closing_soon" || value === "unknown" || value === "source_closed" || value === "expired" || value === "all") {
    return value;
  }
  return undefined;
}

function normalizeTenderSort(value: string | undefined): NonNullable<TenderFilters["sort"]> {
  if (value === "deadline" || value === "new") return value;
  return "recommended";
}

function matchesDeadlineStatus(
  status: ReturnType<typeof assessTenderDeadline>["status"],
  sourceStatus: ReturnType<typeof assessTenderSourceAvailability>["status"],
  filter: TenderFilters["deadlineStatus"]
) {
  if (status === "archived") return false;
  if (!filter) return status !== "expired" && sourceStatus !== "source_closed";
  if (filter === "all") return true;
  if (filter === "available") return sourceStatus !== "source_closed" && (status === "active" || status === "closing_soon" || (status === "unknown" && sourceStatus === "source_open"));
  if (filter === "source_closed") return status !== "expired" && (sourceStatus === "source_closed" || sourceStatus === "source_open" || sourceStatus === "source_unknown");
  if (filter === "expired") return sourceStatus !== "source_closed";
  if (filter === "unknown") return status === "unknown" && sourceStatus !== "source_closed";
  return status === filter;
}

function compareDeadlineAsc(a: string | null, b: string | null) {
  return new Date(a ?? "9999-12-31").getTime() - new Date(b ?? "9999-12-31").getTime();
}

function compareDateDesc(a: string | null | undefined, b: string | null | undefined) {
  return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
}

function normalizeParticipationCondition(value: string | undefined): TenderFilters["qualification"] {
  if (value === "required") return "area_specified";
  if (value === "not_required" || value === "unified_qualification" || value === "area_specified" || value === "other_conditions") {
    return value;
  }
  return undefined;
}

function matchesParticipationCondition(tender: Tender, condition: NonNullable<TenderFilters["qualification"]>) {
  if (condition === "not_required") return tender.tender_type === "open_counter" || !tender.qualification_required;
  if (condition === "unified_qualification") return isUnifiedQualificationTender(tender);
  if (condition === "area_specified") return tender.qualification_required && isAreaSpecifiedTender(tender);
  return tender.qualification_required && !isUnifiedQualificationTender(tender) && !isAreaSpecifiedTender(tender);
}

function isUnifiedQualificationTender(tender: Tender) {
  const qualification = tender.required_qualification ?? "";
  return tender.tender_type === "unified_qualification" || /全省庁|統一資格/.test(qualification);
}

function isAreaSpecifiedTender(tender: Tender) {
  return /地域|エリア|参加地域/.test(tender.required_qualification ?? "");
}

export function normalizeFavoriteStatus(value: FormDataEntryValue | null): FavoriteTenderStatus {
  const status = String(value ?? "unchecked");
  if (["unchecked", "reviewing", "preparing_quote", "planning", "declined", "bid_submitted", "won", "lost"].includes(status)) {
    return status as FavoriteTenderStatus;
  }
  return "unchecked";
}

function getFallbackTenders(filters: TenderFilters = {}) {
  const importedTenders = readImportedTenders();
  const tenders = importedTenders.length > 0 ? importedTenders : sampleTenders;
  return filterTenders(tenders.map(normalizeDefenseTender).filter((tender) => tender.status === "published" && isPublishableTenderRecord(tender)), filters);
}

function getFallbackTenderSources() {
  const sampleSources = sampleTenderSources.map((source) => ({
      ...source,
      source_name: source.name,
      base_url: source.url,
      tender_list_url: source.url,
      crawler_type: source.source_type,
      crawl_priority: "C",
      crawl_ready: false
    })) as TenderSource[];

  const seedSources = TENDER_SOURCE_SEEDS.map((source, index) => ({
    id: `seed-${index + 1}`,
    name: source.source_name ?? "取得元",
    url: source.tender_list_url ?? source.base_url ?? "",
    source_type: source.crawler_type ?? "manual_only",
    ...source,
    last_crawled_at: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  })) as TenderSource[];

  return [...sampleSources, ...seedSources];
}

function readImportedTenders() {
  try {
    const filePath = path.join(process.cwd(), "data", "tender-imports.json");
    if (!fs.existsSync(filePath)) return [] as Tender[];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Tender[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as Tender[];
  }
}

function getFallbackTenderCandidates(status: string = "pending") {
  try {
    const filePath = path.join(process.cwd(), "data", "defense-candidates.json");
    if (!fs.existsSync(filePath)) return [] as TenderCandidate[];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<TenderCandidate>[];
    if (!Array.isArray(parsed)) return [] as TenderCandidate[];
    const candidates = parsed.map(normalizeLocalCandidate).map(normalizeDefenseTender);
    return status === "all" ? candidates : candidates.filter((candidate) => candidate.review_status === status);
  } catch {
    return [] as TenderCandidate[];
  }
}

function normalizeLocalCandidate(candidate: Partial<TenderCandidate>, index: number) {
  const createdAt = candidate.fetched_at ?? new Date(0).toISOString();
  const sourceName = candidate.source_name ?? candidate.agency_name ?? "取得元未設定";
  return normalizeDefenseTender({
    id: candidate.id ?? `local-${stableHash(`${candidate.source_url ?? ""}|${candidate.title ?? ""}|${index}`)}`,
    source_id: candidate.source_id ?? null,
    source_name: sourceName,
    organization_type: candidate.organization_type ?? null,
    title: candidate.title ?? "",
    agency_name: candidate.agency_name ?? sourceName,
    tender_type: candidate.tender_type ?? "unknown",
    original_label: candidate.original_label ?? null,
    region: candidate.region ?? "全国",
    prefecture: candidate.prefecture ?? "未設定",
    base_location: candidate.base_location ?? null,
    published_at: candidate.published_at ?? null,
    deadline_at: candidate.deadline_at ?? null,
    bid_at: candidate.bid_at ?? null,
    qualification_required: Boolean(candidate.qualification_required),
    required_qualification: candidate.required_qualification ?? null,
    source_url: candidate.source_url ?? candidate.pdf_url ?? "",
    pdf_url: candidate.pdf_url ?? null,
    attachments: candidate.attachments ?? [],
    raw_text: candidate.raw_text ?? null,
    ai_summary: candidate.ai_summary ?? null,
    classification_confidence: candidate.classification_confidence ?? null,
    duplicate_candidate_id: candidate.duplicate_candidate_id ?? null,
    review_status: candidate.review_status ?? "pending",
    admin_note: candidate.admin_note ?? null,
    fetched_at: candidate.fetched_at ?? null,
    created_at: candidate.created_at ?? createdAt,
    updated_at: candidate.updated_at ?? createdAt,
    tender_sources: candidate.tender_sources ?? {
      name: sourceName,
      source_name: sourceName,
      organization_type: candidate.organization_type ?? null,
      base_url: candidate.source_url ? safeOrigin(candidate.source_url) : null
    }
  } as TenderCandidate);
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}
