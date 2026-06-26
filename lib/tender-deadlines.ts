export type TenderDeadlineStatus = "active" | "closing_soon" | "expired" | "unknown" | "archived";

export type TenderDeadlineAssessment = {
  status: TenderDeadlineStatus;
  deadlineAt: string | null;
  deadlineDate: string | null;
  daysUntil: number | null;
  label: string;
  source: string | null;
  reason: string | null;
  failureReason: string | null;
  isEstimated: boolean;
  confidence: "high" | "medium" | "low" | null;
  kind: string | null;
  evidence: string | null;
};

type TenderDeadlineInput = {
  status?: string | null;
  title?: string | null;
  agency_name?: string | null;
  source_name?: string | null;
  original_label?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  bid_at?: string | null;
  fetched_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_url?: string | null;
  pdf_url?: string | null;
  raw_text?: string | null;
  detail_memo?: string | null;
  ai_summary?: string | null;
  required_qualification?: string | null;
};

type DeadlineCandidate = {
  iso: string;
  source: string;
  reason: string;
  score: number;
  isEstimated: boolean;
  confidence: "high" | "medium" | "low";
  kind: string;
  evidence: string;
};

const CLOSING_SOON_DAYS = 7;
const DEADLINE_LABELS: Array<{ label: string; score: number; confidence: "high" | "medium"; kind: string; requiredContext?: RegExp }> = [
  { label: "競争参加資格確認申請書提出期限", score: 420, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認資料提出期限", score: 420, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認申請期限", score: 415, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加資格確認申請書提出期限", score: 410, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加申請期限", score: 405, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加表明書提出期限", score: 405, confidence: "high", kind: "participation_application_deadline" },
  { label: "入札書提出期限", score: 360, confidence: "high", kind: "bid_submission_deadline" },
  { label: "見積書提出期限", score: 360, confidence: "high", kind: "quote_submission_deadline" },
  { label: "見積提出期限", score: 355, confidence: "high", kind: "quote_submission_deadline" },
  { label: "企画提案書提出期限", score: 350, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "提案書提出期限", score: 345, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "応募締切", score: 335, confidence: "high", kind: "application_deadline" },
  { label: "申込期限", score: 330, confidence: "high", kind: "application_deadline" },
  { label: "申込み期限", score: 330, confidence: "high", kind: "application_deadline" },
  { label: "受付期限", score: 320, confidence: "high", kind: "reception_deadline" },
  { label: "提出期限", score: 300, confidence: "high", kind: "submission_deadline", requiredContext: /入札書|見積書|見積書等|提案書|企画提案|参加|資格|証明書|申請|応募|提出書類/ },
  { label: "入札日時", score: 220, confidence: "medium", kind: "bid_datetime" },
  { label: "見積合わせ日時", score: 215, confidence: "medium", kind: "quote_matching_datetime" },
  { label: "見積日時", score: 210, confidence: "medium", kind: "quote_datetime" },
  { label: "開札日時", score: 160, confidence: "medium", kind: "opening_datetime" }
];

const FORBIDDEN_DEADLINE_CONTEXT = /履行期限|履行期間|納入期限|納期|納入期間|契約期間|公告日|公示日|掲載日|公開日|更新日|質問書|質問期限|質問受付|質問回答|質問締切/;

export function assessTenderDeadline(input: TenderDeadlineInput, now: Date = new Date()): TenderDeadlineAssessment {
  if (input.status === "archived") {
    return {
      status: "archived",
      deadlineAt: input.deadline_at ?? null,
      deadlineDate: dateOnly(input.deadline_at),
      daysUntil: null,
      label: "非表示・終了扱い",
      source: "status",
      reason: "案件自体が archived です。",
      failureReason: null,
      isEstimated: false,
      confidence: null,
      kind: "archived",
      evidence: null
    };
  }

  const extracted = extractTenderDeadline(input);
  if (!extracted) {
    return {
      status: "unknown",
      deadlineAt: null,
      deadlineDate: null,
      daysUntil: null,
      label: "期限不明",
      source: null,
      reason: null,
      failureReason: "deadline_at / bid_at / 公告テキストから参加期限を特定できませんでした。",
      isEstimated: false,
      confidence: null,
      kind: null,
      evidence: null
    };
  }

  const daysUntil = daysUntilDate(extracted.iso, now);
  const status: TenderDeadlineStatus = daysUntil < 0 ? "expired" : daysUntil <= CLOSING_SOON_DAYS ? "closing_soon" : "active";

  return {
    status,
    deadlineAt: extracted.iso,
    deadlineDate: dateOnly(extracted.iso),
    daysUntil,
    label: deadlineStatusLabel(status, daysUntil),
    source: extracted.source,
    reason: extracted.reason,
    failureReason: null,
    isEstimated: extracted.isEstimated,
    confidence: extracted.confidence,
    kind: extracted.kind,
    evidence: extracted.evidence
  };
}

export function extractTenderDeadline(input: TenderDeadlineInput): DeadlineCandidate | null {
  const existingDeadline = normalizeIso(input.deadline_at);
  if (existingDeadline) {
    return {
      iso: existingDeadline,
      source: "deadline_at",
      reason: "DBの締切日を使用しました。",
      score: 120,
      isEstimated: false,
      confidence: "high",
      kind: "existing_deadline_at",
      evidence: input.deadline_at ?? ""
    };
  }

  const existingBid = normalizeIso(input.bid_at);
  if (existingBid) {
    return {
      iso: existingBid,
      source: "bid_at",
      reason: "DBの入札日・見積期限を使用しました。",
      score: 110,
      isEstimated: false,
      confidence: "medium",
      kind: "existing_bid_at",
      evidence: input.bid_at ?? ""
    };
  }

  const referenceDate = normalizeIso(input.published_at) ?? normalizeIso(input.fetched_at) ?? normalizeIso(input.created_at) ?? normalizeIso(input.updated_at);
  const searchableText = [
    input.title,
    input.original_label,
    input.raw_text,
    input.detail_memo,
    input.ai_summary,
    input.required_qualification
  ].filter(Boolean).join(" ");

  const candidates: DeadlineCandidate[] = [];
  candidates.push(...labeledDateCandidates(searchableText, referenceDate));
  candidates.push(...nearDeadlineWordCandidates(searchableText, referenceDate));

  const ranked = candidates
    .filter((candidate) => candidate.iso)
    .sort((a, b) => b.score - a.score || compareIso(b.iso, a.iso));

  return ranked[0] ?? null;
}

export function deadlineStatusLabel(status: TenderDeadlineStatus, daysUntil: number | null = null) {
  if (status === "archived") return "非表示・終了扱い";
  if (status === "unknown") return "期限不明";
  if (status === "expired") return "期限切れ";
  if (status === "closing_soon") {
    if (daysUntil === 0) return "本日締切";
    if (daysUntil === 1) return "明日締切";
    return `締切まで${daysUntil}日`;
  }
  if (daysUntil !== null) return `締切まで${daysUntil}日`;
  return "参加可能と思われる";
}

export function deadlineStatusBadgeClass(status: TenderDeadlineStatus) {
  if (status === "closing_soon") return "bg-amber-100 text-amber-800";
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "expired") return "bg-slate-200 text-slate-700";
  if (status === "archived") return "bg-zinc-200 text-zinc-700";
  return "bg-sky-100 text-sky-800";
}

export function deadlineStatusSortPriority(status: TenderDeadlineStatus) {
  if (status === "closing_soon") return 0;
  if (status === "active") return 1;
  if (status === "unknown") return 2;
  if (status === "expired") return 3;
  return 4;
}

export function dateOnly(value?: string | null) {
  const iso = normalizeIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function labeledDateCandidates(text: string, referenceDate: string | null) {
  const candidates: DeadlineCandidate[] = [];
  for (const definition of DEADLINE_LABELS) {
    for (const index of allIndexes(text, definition.label)) {
      const windowText = text.slice(index, index + 140);
      if (definition.requiredContext && !definition.requiredContext.test(windowText)) continue;
      if (FORBIDDEN_DEADLINE_CONTEXT.test(windowText)) continue;
      for (const date of parseDates(windowText, referenceDate)) {
        if (!isDateCloseToLabel(windowText, definition.label, date.matchedText)) continue;
        candidates.push({
          iso: date.iso,
          source: `text:${definition.label}`,
          reason: `${definition.label} の近くから期限日を抽出しました。`,
          score: definition.score,
          isEstimated: date.isEstimated,
          confidence: definition.confidence,
          kind: definition.kind,
          evidence: trimEvidence(windowText)
        });
      }
    }
  }
  return candidates;
}

function isDateCloseToLabel(context: string, label: string, matchedText: string) {
  const labelIndex = context.indexOf(label);
  const dateIndex = context.indexOf(matchedText, Math.max(0, labelIndex));
  if (labelIndex < 0 || dateIndex < 0) return false;
  const between = context.slice(labelIndex + label.length, dateIndex);
  if (between.length > 70) return false;
  if (containsDateLike(between)) return false;
  if (/までの期間|から|以降|停止等措置|要領|制定|付け|平成\d/.test(between)) return false;
  return true;
}

function containsDateLike(text: string) {
  return /令\s*和\s*(?:元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}|平成\s*(?:元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}|\bR\s*\d{1,2}[.\/\-年\s]+\d{1,2}[.\/\-月\s]+\d{1,2}\b|20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}|20\d{2}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}\s*月\s*\d{1,2}\s*日|\d{1,2}[\/.]\d{1,2}/i.test(text);
}

function nearDeadlineWordCandidates(text: string, referenceDate: string | null) {
  const candidates: DeadlineCandidate[] = [];
  const dateMatches = parseDates(text, referenceDate);
  for (const date of dateMatches) {
    const index = text.indexOf(date.matchedText);
    const nearby = text.slice(Math.max(0, index - 35), Math.min(text.length, index + date.matchedText.length + 35));
    if (FORBIDDEN_DEADLINE_CONTEXT.test(nearby)) continue;
    if (!/入札書|見積書|提案書|参加申請|資格確認|応募|申込|受付|提出期限|締切/.test(nearby)) continue;
    candidates.push({
      iso: date.iso,
      source: "text:near_deadline_word",
      reason: "参加・入札書・見積書・提出期限などの語の近くから日付を抽出しました。",
      score: 80,
      isEstimated: date.isEstimated,
      confidence: "low",
      kind: "near_deadline_word",
      evidence: trimEvidence(nearby)
    });
  }
  return candidates;
}

function trimEvidence(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function parseDates(text: string, referenceDate: string | null) {
  const normalized = text.normalize("NFKC");
  const results: Array<{ iso: string; matchedText: string; isEstimated: boolean }> = [];
  const push = (year: number, month: number, day: number, matchedText: string, isEstimated = false) => {
    const iso = toIsoDate(year, month, day);
    if (iso) results.push({ iso, matchedText, isEstimated });
  };

  for (const match of normalized.matchAll(/令和\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
    const eraYear = match[1] === "元" ? 1 : Number(match[1]);
    push(2018 + eraYear, Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/平成\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
    const eraYear = match[1] === "元" ? 1 : Number(match[1]);
    push(1988 + eraYear, Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/\bR\s*(\d{1,2})[.\/\-年\s]+(\d{1,2})[.\/\-月\s]+(\d{1,2})\b/gi)) {
    push(2018 + Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0], true);
  }

  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})[\/.](\d{1,2})(?![\/.\d])/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0], true);
  }

  return uniqueDates(results);
}

function inferYear(month: number, day: number, referenceDate: string | null) {
  if (!referenceDate) return null;
  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return null;
  const baseYear = reference.getUTCFullYear();
  const base = Date.UTC(baseYear, reference.getUTCMonth(), reference.getUTCDate());
  const sameYear = Date.UTC(baseYear, month - 1, day);
  const nextYear = Date.UTC(baseYear + 1, month - 1, day);
  const diffDays = Math.round((sameYear - base) / 86_400_000);
  if (diffDays >= -30 && diffDays <= 370) return baseYear;
  const nextDiffDays = Math.round((nextYear - base) / 86_400_000);
  if (nextDiffDays >= 0 && nextDiffDays <= 370) return baseYear + 1;
  return null;
}

function normalizeIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toIsoDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 14, 59, 59));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function daysUntilDate(value: string, now: Date) {
  const target = new Date(value);
  const nowDate = jstDateOnlyTimestamp(now);
  const targetDate = jstDateOnlyTimestamp(target);
  return Math.round((targetDate - nowDate) / 86_400_000);
}

function jstDateOnlyTimestamp(date: Date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function allIndexes(text: string, search: string) {
  const indexes: number[] = [];
  let index = text.indexOf(search);
  while (index >= 0) {
    indexes.push(index);
    index = text.indexOf(search, index + search.length);
  }
  return indexes;
}

function compareIso(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function uniqueDates(values: Array<{ iso: string; matchedText: string; isEstimated: boolean }>) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.iso}-${value.matchedText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
