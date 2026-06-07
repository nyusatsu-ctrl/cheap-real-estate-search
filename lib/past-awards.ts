import fs from "node:fs";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PastAwardResult, PastAwardStats, SimilarPastAwardResult, Tender } from "@/lib/types";

const pastAwardPath = path.join(process.cwd(), "data", "past-award-results.json");

export async function getAdminPastAwardResults(status: string = "all") {
  const fallbackAwards = getFallbackPastAwardResults(status);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallbackAwards;

  let query = supabase
    .from("past_award_results")
    .select("*")
    .order("opened_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("review_status", status);

  const { data, error } = await query;
  if (error) return fallbackAwards;
  return (data ?? []) as PastAwardResult[];
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
