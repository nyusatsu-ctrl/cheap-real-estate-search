export const PORTAL_ORIGIN = "https://www.p-portal.go.jp";
export const PORTAL_DETAIL_PATH = "/pps-web-biz/UAA01/OAA0104";
export const PORTAL_SEARCH_PATH = "/pps-web-biz/UAA01/OAA0101";

export function procurementItemInfoIdFrom(value) {
  const text = String(value ?? "");
  return text.match(/[?&]procurementItemInfoId=(\d+)/i)?.[1]
    ?? text.match(/procurementItemInfoId['"]?\s*,\s*value\s*:\s*['"]?(\d+)/i)?.[1]
    ?? text.match(/procurementItemInfoId["']?\s*[:=]\s*["']?(\d+)/i)?.[1]
    ?? null;
}

export function normalizePortalDetailUrl(value) {
  const id = procurementItemInfoIdFrom(value);
  if (!id) return null;
  return `${PORTAL_ORIGIN}${PORTAL_DETAIL_PATH}?procurementItemInfoId=${id}&SyFromFlg=1`;
}

export function classifyPortalUrl(value) {
  const text = String(value ?? "");
  if (!text) return "empty";
  const normalized = normalizePortalDetailUrl(text);
  if (normalized) return "oaa0104_detail";
  if (/\/UAA01\/OAA010[06]/i.test(text)) return "search_or_result_list";
  if (/^https?:\/\/(?:www\.)?p-portal\.go\.jp\/?$/i.test(text)) return "top_page";
  if (/p-portal\.go\.jp/i.test(text)) return "other_p_portal";
  return "non_portal";
}

export async function fetchPortalDetailHtml(detailUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 9000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(detailUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "EcoLoopProcurementPortalDetailParser/1.0",
        accept: "text/html,application/xhtml+xml",
        ...(options.referer ? { referer: options.referer } : {})
      }
    });
    const html = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        url: response.url,
        html,
        error: `HTTP ${response.status}`
      };
    }
    return { ok: true, status: response.status, url: response.url, html, error: null };
  } catch (error) {
    return {
      ok: false,
      status: null,
      url: detailUrl,
      html: "",
      error: error?.name === "AbortError" ? `timeout_${timeoutMs}ms` : error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parsePortalDetailHtml(html, detailUrl) {
  const pairs = parseLabelValuePairs(html);
  const text = htmlToText(html);
  const documents = extractDocumentLinks(html, detailUrl);
  const fields = {
    procurementItemInfoId: procurementItemInfoIdFrom(detailUrl),
    procurementCaseNumber: findField(pairs, ["調達案件番号"]),
    procurementType: findField(pairs, ["調達種別"]),
    classification: findField(pairs, ["分類"]),
    title: findField(pairs, ["調達案件名称"]),
    publicStartText: findField(pairs, ["公開開始日"]),
    publicEndText: findField(pairs, ["公開終了日"]),
    agency: findField(pairs, ["調達機関"]),
    location: findField(pairs, ["所在地"]),
    documents
  };

  const publicStartAt = parsePortalDate(fields.publicStartText, { endOfDay: false })?.iso ?? null;
  const publicEndAt = parsePortalDate(fields.publicEndText, { endOfDay: true })?.iso ?? null;
  const deadlineCandidates = extractPortalDeadlines(pairs, text, publicStartAt);
  const certificate = bestCandidate(deadlineCandidates, ["certificate_submission_deadline", "participation_application_deadline", "proposal_submission_deadline", "application_deadline", "reception_deadline"]);
  const bid = bestCandidate(deadlineCandidates, ["bid_submission_deadline", "quote_submission_deadline"]);
  const opening = bestCandidate(deadlineCandidates, ["opening_datetime"]);
  const publicEndOnly = Boolean(publicEndAt && !certificate && !bid);

  return {
    ...fields,
    detailUrl: normalizePortalDetailUrl(detailUrl) ?? detailUrl,
    publicStartAt,
    publicEndAt,
    certificateDeadline: certificate,
    bidDeadline: bid,
    openingAt: opening,
    publicEndOnly,
    text,
    deadlineCandidates
  };
}

export function portalDetailMatch(parsed, row) {
  const titleScore = textCompatibility(parsed.title, row.title);
  const agencyScore = agencyCompatibility(parsed.agency, row.agency_name);
  const titleMatched = titleScore >= 0.82 || titleScore === 1;
  const agencyMatched = agencyScore >= 0.55 || !parsed.agency || !row.agency_name;
  const confidence = titleMatched && agencyMatched ? "high" : titleMatched ? "medium" : "low";
  return {
    confidence,
    titleScore,
    agencyScore,
    titleMatched,
    agencyMatched,
    parsedTitle: parsed.title,
    rowTitle: row.title,
    parsedAgency: parsed.agency,
    rowAgency: row.agency_name
  };
}

export function portalDetailSummary(parsed) {
  return [
    parsed.procurementItemInfoId ? `procurementItemInfoId=${parsed.procurementItemInfoId}` : null,
    parsed.procurementCaseNumber ? `調達案件番号=${parsed.procurementCaseNumber}` : null,
    parsed.publicStartAt ? `公開開始日=${dateOnly(parsed.publicStartAt)}` : null,
    parsed.publicEndAt ? `調達ポータル公開終了日=${dateOnly(parsed.publicEndAt)}` : null,
    parsed.certificateDeadline?.iso ? `参加申請・証明書期限=${formatDateTimeJst(parsed.certificateDeadline.iso)}` : null,
    parsed.bidDeadline?.iso ? `入札書・見積書提出期限=${formatDateTimeJst(parsed.bidDeadline.iso)}` : null,
    parsed.openingAt?.iso ? `開札日時=${formatDateTimeJst(parsed.openingAt.iso)}` : null
  ].filter(Boolean).join(" / ");
}

export function htmlToText(html) {
  return cleanText(String(html ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|tr|td|th|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))));
}

export function cleanText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function dateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function parseLabelValuePairs(html) {
  const rows = String(html ?? "").match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const pairs = [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => ({
      tag: match[1].toLowerCase(),
      html: match[2],
      text: htmlToText(match[2])
    })).filter((cell) => cell.text);
    let currentLabel = null;
    for (const cell of cells) {
      if (cell.tag === "th") {
        currentLabel = normalizeLabel(cell.text);
        continue;
      }
      if (currentLabel) {
        pairs.push({ label: currentLabel, value: cell.text, html: cell.html });
        currentLabel = null;
      }
    }
  }
  return pairs;
}

function findField(pairs, labels) {
  const normalizedLabels = labels.map(normalizeLabel);
  return pairs.find((pair) => normalizedLabels.includes(pair.label))?.value ?? null;
}

function normalizeLabel(value) {
  return cleanText(value).replace(/\s+/g, "");
}

function extractDocumentLinks(html, detailUrl) {
  const docs = [];
  const pairs = parseLabelValuePairs(html);
  for (const pair of pairs) {
    if (!/^調達資料/.test(pair.label)) continue;
    for (const match of pair.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = match[1].match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean);
      if (!href) continue;
      docs.push({
        label: pair.label,
        title: htmlToText(match[2]) || pair.label,
        url: safeUrl(href, detailUrl)
      });
    }
  }
  return docs.filter((doc) => doc.url);
}

function extractPortalDeadlines(pairs, detailText, referenceDate) {
  const candidates = [];
  for (const pair of pairs) {
    candidates.push(...extractFromContext(`${pair.label} ${pair.value}`, referenceDate, "structured_field", pair.label));
  }
  for (const context of contextWindows(detailText)) {
    candidates.push(...extractFromContext(context, referenceDate, "detail_text", null));
  }
  return uniqueBy(candidates, (candidate) => `${candidate.kind}-${candidate.iso}-${candidate.label}-${candidate.evidence}`);
}

const DEFINITIONS = [
  { labels: ["競争参加資格確認申請書提出期限", "競争参加資格確認資料提出期限", "競争参加資格確認申請期限", "参加資格確認申請書提出期限", "証明書等の受領期限", "証明書等受領期限", "証明書等の提出期限", "証明書等提出期限", "資格・実績証明書等の提出期限", "参加申請期限", "参加表明書提出期限"], kind: "certificate_submission_deadline", priority: 400, field: "deadline" },
  { labels: ["入札書等の受領期限", "入札書等受領期限", "入札書の受領期限", "入札書受領期限", "入札書等の提出期限", "入札書提出期限", "入札書の提出期限"], kind: "bid_submission_deadline", priority: 360, field: "bid" },
  { labels: ["見積書等の受領期限", "見積書等受領期限", "見積書等の提出期限", "見積書等提出期限", "見積書提出期限", "見積提出期限"], kind: "quote_submission_deadline", priority: 350, field: "bid" },
  { labels: ["企画提案書提出期限", "提案書提出期限"], kind: "proposal_submission_deadline", priority: 330, field: "deadline" },
  { labels: ["応募締切", "申込期限", "申込み期限", "受付期限"], kind: "application_deadline", priority: 310, field: "deadline" },
  { labels: ["開札日時", "開札の日時"], kind: "opening_datetime", priority: 90, field: "opening", confidence: "medium" }
];

const FORBIDDEN_CONTEXT = /履行期限|履行期間|納入期限|納期|納入期間|契約期間|公告日|公示日|掲載日|公開日|更新日|質問書|質問期限|質問受付|質問回答|質問締切|説明会日時|現場説明/;

function extractFromContext(context, referenceDate, sourceType, structuredLabel) {
  const normalized = cleanText(context);
  if (!normalized || FORBIDDEN_CONTEXT.test(normalized)) return [];
  const candidates = [];
  for (const definition of DEFINITIONS) {
    for (const label of definition.labels) {
      const labelIndex = normalized.indexOf(label);
      if (labelIndex < 0 && structuredLabel !== normalizeLabel(label)) continue;
      const searchText = normalized.slice(Math.max(0, labelIndex));
      const dates = parsePortalDates(searchText, referenceDate, { endOfDay: true });
      for (const date of dates) {
        if (labelIndex >= 0 && !isDateCloseToLabel(searchText, label, date.matchedText)) continue;
        candidates.push({
          iso: date.iso,
          matchedText: date.matchedText,
          label,
          kind: definition.kind,
          field: definition.field,
          priority: definition.priority,
          confidence: definition.confidence ?? "high",
          sourceType,
          evidence: normalized.slice(0, 260),
          isEstimated: date.isEstimated
        });
      }
    }
  }
  return candidates;
}

function bestCandidate(candidates, kinds) {
  return candidates
    .filter((candidate) => kinds.includes(candidate.kind))
    .sort((left, right) => right.priority - left.priority || new Date(left.iso).getTime() - new Date(right.iso).getTime())[0] ?? null;
}

function parsePortalDate(text, options = {}) {
  return parsePortalDates(text, null, options)[0] ?? null;
}

function parsePortalDates(text, referenceDate, options = {}) {
  const normalized = cleanText(text);
  const results = [];
  const push = (year, month, day, matchedText, time = null, isEstimated = false) => {
    const iso = toIsoJst(year, month, day, time, options.endOfDay);
    if (iso) results.push({ iso, matchedText, isEstimated });
  };

  for (const match of normalized.matchAll(/令和\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?(?:\s*[（(][^)）]*[)）])?(?:\s*((?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午))?/g)) {
    const eraYear = match[1] === "元" ? 1 : Number(match[1]);
    push(2018 + eraYear, Number(match[2]), Number(match[3]), match[0], parseTime(match[4]));
  }
  for (const match of normalized.matchAll(/\bR\s*(\d{1,2})[.\/\-年\s]+(\d{1,2})[.\/\-月\s]+(\d{1,2})(?:\s*((?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午))?/gi)) {
    push(2018 + Number(match[1]), Number(match[2]), Number(match[3]), match[0], parseTime(match[4]));
  }
  for (const match of normalized.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?(?:\s*[（(][^)）]*[)）])?(?:\s*((?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午))?/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0], parseTime(match[4]));
  }
  for (const match of normalized.matchAll(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?\b/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0], match[4] ? { hour: Number(match[4]), minute: Number(match[5]) } : null);
  }
  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*[（(][^)）]*[)）])?(?:\s*((?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午))?/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0], parseTime(match[3]), true);
  }
  return uniqueBy(results, (value) => `${value.iso}-${value.matchedText}`);
}

function parseTime(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (text.includes("正午")) return { hour: 12, minute: 0 };
  const match = text.match(/(午前|午後)?\s*(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/);
  if (!match) return null;
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  if (match[1] === "午後" && hour < 12) hour += 12;
  if (match[1] === "午前" && hour === 12) hour = 0;
  return { hour, minute };
}

function toIsoJst(year, month, day, time, endOfDay = true) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const hour = time?.hour ?? (endOfDay ? 23 : 0);
  const minute = time?.minute ?? (endOfDay ? 59 : 0);
  const second = time ? 0 : endOfDay ? 59 : 0;
  const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second));
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  if (jst.getUTCFullYear() !== year || jst.getUTCMonth() !== month - 1 || jst.getUTCDate() !== day) return null;
  return date.toISOString();
}

function inferYear(month, day, referenceDate) {
  if (!referenceDate) return null;
  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return null;
  const baseYear = reference.getUTCFullYear();
  const base = Date.UTC(baseYear, reference.getUTCMonth(), reference.getUTCDate());
  const sameYear = Date.UTC(baseYear, month - 1, day);
  const nextYear = Date.UTC(baseYear + 1, month - 1, day);
  const diffDays = Math.round((sameYear - base) / 86_400_000);
  if (diffDays >= -14 && diffDays <= 270) return baseYear;
  const nextDiffDays = Math.round((nextYear - base) / 86_400_000);
  if (nextDiffDays >= 0 && nextDiffDays <= 120) return baseYear + 1;
  return null;
}

function contextWindows(text) {
  const lines = text.split(/\n|。|；|;/).map((line) => cleanText(line)).filter(Boolean);
  const contexts = [];
  for (let index = 0; index < lines.length; index += 1) {
    contexts.push(lines[index]);
    if (index + 1 < lines.length) contexts.push(`${lines[index]} ${lines[index + 1]}`);
    if (index + 2 < lines.length) contexts.push(`${lines[index]} ${lines[index + 1]} ${lines[index + 2]}`);
  }
  return contexts.filter((context) => /\d|令和|平成|R\s*\d/i.test(context));
}

function isDateCloseToLabel(context, label, matchedText) {
  const labelIndex = context.indexOf(label);
  const dateIndex = context.indexOf(matchedText, Math.max(0, labelIndex));
  if (labelIndex < 0 || dateIndex < 0) return false;
  const between = context.slice(labelIndex + label.length, dateIndex);
  if (between.length > 90) return false;
  if (/履行|納入|契約|公告|掲載|質問|説明会|から|以降|までの期間/.test(between)) return false;
  return true;
}

function textCompatibility(left, right) {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const gramsA = grams(a);
  const gramsB = grams(b);
  const intersection = [...gramsA].filter((value) => gramsB.has(value)).length;
  const union = new Set([...gramsA, ...gramsB]).size;
  return union ? intersection / union : 0;
}

function agencyCompatibility(left, right) {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 1;
  return textCompatibility(left, right);
}

function normalizeComparable(value) {
  return cleanText(value)
    .replace(/[【】「」『』（）()\[\]\s・、，,。.\-－_]/g, "")
    .replace(/^(.+?省)(.+)$/g, "$1$2")
    .toLowerCase();
}

function grams(value) {
  const set = new Set();
  for (let index = 0; index < value.length - 1; index += 1) {
    set.add(value.slice(index, index + 2));
  }
  return set.size ? set : new Set([value]);
}

function safeUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function formatDateTimeJst(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mi = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
