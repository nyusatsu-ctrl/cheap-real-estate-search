import { OPEN_COUNTER_LABELS } from "@/lib/constants";
import type { Tender, TenderCandidateType, TenderSource } from "@/lib/types";

export type TenderCrawlResult = Pick<
  Tender,
  | "title"
  | "agency_name"
  | "tender_type"
  | "region"
  | "prefecture"
  | "published_at"
  | "deadline_at"
  | "bid_at"
  | "qualification_required"
  | "required_qualification"
  | "source_url"
  | "pdf_url"
  | "detail_memo"
  | "original_label"
  | "is_defense"
>;

export type TenderCrawler = {
  sourceType: string;
  crawl: (sourceUrl: string) => Promise<TenderCrawlResult[]>;
};

const crawlers = new Map<string, TenderCrawler>();

export function registerTenderCrawler(crawler: TenderCrawler) {
  crawlers.set(crawler.sourceType, crawler);
}

export function getTenderCrawler(sourceType: string) {
  return crawlers.get(sourceType) ?? null;
}

export async function crawlTenderSource(sourceType: string, sourceUrl: string) {
  const crawler = getTenderCrawler(sourceType);
  if (!crawler) {
    return {
      sourceType,
      sourceUrl,
      tenders: [] as TenderCrawlResult[],
      skippedReason: "Crawler is not implemented for this source type yet."
    };
  }

  return {
    sourceType,
    sourceUrl,
    tenders: await crawler.crawl(sourceUrl),
    skippedReason: null
  };
}

export function shouldCrawlTenderSource(source: TenderSource, now = new Date()) {
  if (!source.is_active || !source.crawl_ready) return false;
  if (source.crawler_type === "manual_only") return false;
  if (source.crawl_frequency === "manual") return false;
  if (!source.last_crawled_at) return true;

  const elapsed = now.getTime() - new Date(source.last_crawled_at).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (source.crawl_frequency === "daily") return elapsed >= day;
  if (source.crawl_frequency === "weekly") return elapsed >= 7 * day;
  return false;
}

export function classifyTenderCandidate(input: { title: string; rawText?: string | null; originalLabel?: string | null; qualificationRequired?: boolean }): {
  tenderType: TenderCandidateType;
  confidence: number;
  originalLabel: string | null;
} {
  const text = `${input.title} ${input.rawText ?? ""} ${input.originalLabel ?? ""}`;
  const originalLabel = findOpenCounterLabel(text) ?? input.originalLabel ?? null;

  if (/工事|建設|土木|建築|電気工事|管工事|舗装|解体|改修工事|建築一式|とび|しゅんせつ/.test(text)) {
    return { tenderType: "construction", confidence: 0.85, originalLabel };
  }
  if (originalLabel) return { tenderType: originalLabel.includes("少額") ? "small_discretionary" : "open_counter", confidence: 0.9, originalLabel };
  if (input.qualificationRequired || /全省庁統一資格|競争参加資格|資格必要/.test(text)) return { tenderType: "qualification_required", confidence: 0.8, originalLabel };
  if (/購入|買入|物品|備品|消耗品|車両|タイヤ|パソコン|印刷|制服|食料品|工具|機器|LED|照明|机|椅子|コピー用紙|トナー|什器/.test(text)) {
    return { tenderType: "goods", confidence: 0.75, originalLabel };
  }
  if (/業務|委託|清掃|草刈|除草|点検|保守|警備|修繕|運搬|廃棄物|施設管理|リース|レンタル|維持管理|調査|受付|コールセンター/.test(text)) {
    return { tenderType: "services", confidence: 0.75, originalLabel };
  }
  return { tenderType: "unknown", confidence: 0.35, originalLabel };
}

export function findDuplicateTenderCandidate<T extends { title: string; agency_name: string; deadline_at?: string | null; source_url?: string | null; pdf_url?: string | null }>(
  current: T,
  existing: T[]
) {
  return existing.find((candidate) => {
    if (current.source_url && candidate.source_url === current.source_url) return true;
    if (current.pdf_url && candidate.pdf_url === current.pdf_url) return true;
    if (candidate.title === current.title && candidate.agency_name === current.agency_name && candidate.deadline_at === current.deadline_at) return true;
    return similarity(`${current.title} ${current.agency_name}`, `${candidate.title} ${candidate.agency_name}`) >= 0.88;
  }) ?? null;
}

function findOpenCounterLabel(text: string) {
  return OPEN_COUNTER_LABELS.find((label) => text.includes(label)) ?? null;
}

function similarity(left: string, right: string) {
  const a = new Set(left.replace(/\s+/g, "").split(""));
  const b = new Set(right.replace(/\s+/g, "").split(""));
  const intersection = [...a].filter((char) => b.has(char)).length;
  const union = new Set([...a, ...b]).size || 1;
  return intersection / union;
}
