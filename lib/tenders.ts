import fs from "node:fs";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDefenseLike, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import { TENDER_SOURCE_SEEDS } from "@/lib/tender-source-seeds";
import { sampleFavorites, sampleTenderSources, sampleTenders } from "@/lib/tenders/sample-data";
import type { FavoriteTenderStatus, ScrivenerInquiry, Tender, TenderCandidate, TenderFilters, TenderSource, TenderType, UserFavoriteTender } from "@/lib/types";

export function canUseMemberFeatures(member: { role: string; subscriptionStatus: string; isTrialExpired: boolean } | null) {
  if (!member) return false;
  if (member.role === "admin") return true;
  if (member.subscriptionStatus === "active") return true;
  return member.subscriptionStatus === "trialing" && !member.isTrialExpired;
}

export async function getPublishedTenders(filters: TenderFilters = {}) {
  const supabase = await createSupabaseServerClient();
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
  return filterTenders(((data ?? []) as Tender[]).map(normalizeDefenseTender), filters);
}

export async function getPublishedTender(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getFallbackTenders().find((tender) => tender.id === id && tender.status === "published") ?? null;

  const { data, error } = await supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return getFallbackTenders().find((tender) => tender.id === id && tender.status === "published") ?? null;
  return data as Tender;
}

export async function getAdminTenders() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getFallbackTenders();

  const { data, error } = await supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .order("updated_at", { ascending: false });

  if (error) return getFallbackTenders();
  return (data ?? []) as Tender[];
}

export async function getAdminTender(id: string) {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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

export async function getTenderCandidate(id: string) {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
  if (!supabase) return sampleFavorites.filter((favorite) => favorite.user_id === userId);

  const { data, error } = await supabase
    .from("user_favorites")
    .select("*, tenders(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return sampleFavorites.filter((favorite) => favorite.user_id === userId);
  return (data ?? []) as UserFavoriteTender[];
}

export async function getScrivenerInquiries() {
  const supabase = await createSupabaseServerClient();
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
    qualification: params.qualification === "required" || params.qualification === "not_required" ? params.qualification : undefined,
    defenseOnly: params.defenseOnly === "1",
    openCounterOnly: params.openCounterOnly === "1",
    keyword: params.keyword || undefined,
    sort: params.sort === "deadline" ? "deadline" : "new"
  };
}

function filterTenders(tenders: Tender[], filters: TenderFilters) {
  const keyword = filters.keyword?.toLowerCase();
  const filtered = tenders.filter((tender) => {
    const normalized = normalizeDefenseTender(tender);
    if (filters.region && filters.region !== "全国" && tenderRegion(normalized) !== filters.region) return false;
    if (filters.prefecture && tender.prefecture !== filters.prefecture) return false;
    if (filters.tenderType && tender.tender_type !== filters.tenderType) return false;
    if (filters.qualification === "required" && !tender.qualification_required) return false;
    if (filters.qualification === "not_required" && tender.qualification_required) return false;
    if (filters.defenseOnly && !isDefenseLike(normalized)) return false;
    if (filters.openCounterOnly && tender.tender_type !== "open_counter") return false;
    if (keyword) {
      const haystack = `${tender.title} ${tender.agency_name} ${tender.detail_memo ?? ""} ${tender.required_qualification ?? ""} ${tender.source_name ?? ""} ${tender.tender_sources?.source_name ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "deadline") {
      return new Date(a.deadline_at ?? "9999-12-31").getTime() - new Date(b.deadline_at ?? "9999-12-31").getTime();
    }
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });
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
  return filterTenders(tenders.map(normalizeDefenseTender).filter((tender) => tender.status === "published"), filters);
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
