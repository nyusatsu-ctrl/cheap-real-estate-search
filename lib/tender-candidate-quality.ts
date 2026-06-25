export type TenderCandidateQualityStatus = "reviewable" | "reject" | "duplicate";

export type TenderCandidateQuality = {
  status: TenderCandidateQualityStatus;
  code: string | null;
  reason: string | null;
};

type TenderCandidateQualityInput = {
  title?: string | null;
  raw_text?: string | null;
  detail_memo?: string | null;
  source_url?: string | null;
  tender_type?: string | null;
  duplicate_candidate_id?: string | null;
};

const CLASSIFICATION_ONLY_TITLES = new Set([
  "公告",
  "入札公告",
  "一般競争入札",
  "一般競争入札公告",
  "公告情報",
  "公告一覧",
  "公示",
  "公募",
  "公募公告",
  "調達",
  "調達情報",
  "調達情報一覧",
  "入札",
  "入札情報",
  "入札情報一覧",
  "契約",
  "契約情報",
  "契約情報一覧",
  "見積",
  "見積依頼",
  "見積合わせ",
  "オープンカウンター",
  "オープンカウンタ",
  "公開見積",
  "定例見積",
  "物品",
  "役務",
  "工事",
  "その他",
  "新着情報",
  "お知らせ",
  "一覧",
  "詳細",
  "PDF",
  "EXCEL",
  "WORD"
]);

const STRONG_TITLE_WORDS = [
  "購入",
  "買入",
  "調達",
  "業務",
  "委託",
  "借上",
  "借上げ",
  "修理",
  "点検",
  "整備",
  "交換",
  "印刷",
  "清掃",
  "警備",
  "糧食",
  "給食",
  "売払",
  "機器",
  "装置",
  "用品",
  "コピー用紙",
  "燃料",
  "軽油",
  "灯油",
  "食器",
  "除草",
  "草刈",
  "草刈り",
  "保守",
  "調査",
  "運搬",
  "処分",
  "洗濯",
  "賃貸借",
  "リース",
  "自動車",
  "車両",
  "電気",
  "空調",
  "給排水",
  "工具",
  "消耗品",
  "修繕",
  "検査",
  "製造"
];

const GUIDANCE_TITLE_PATTERNS = [
  { code: "open_counter_guidance", pattern: /オープンカウンター方式(?:とは|.*(?:実施要領|見積結果|見積依頼))/ },
  { code: "bid_info_link", pattern: /^入札[・･]落札情報はこちら$/ },
  { code: "listed_on_info_page", pattern: /入札情報のページに掲載/ },
  { code: "standard_contract_terms", pattern: /標準契約条項|標準契約書|契約書式|契約様式/ },
  { code: "purchase_order_terms", pattern: /請書条項/ },
  { code: "contract_terms", pattern: /契約条項|契約条項等/ },
  { code: "information_disclosure", pattern: /情報の公開|情報の公表|公共調達の適正化/ },
  { code: "procurement_guideline", pattern: /実施要領|低入札価格調査|特別重点調査|調達時期の目安|標準規格表/ },
  { code: "generic_publication", pattern: /^(?:公表|掲載|案内|一覧)$/ },
  { code: "navigation_link", pattern: /(?:はこちら|こちらをクリック|詳細はこちら|ページに掲載)$/ }
];

export function assessTenderCandidateQuality(candidate: TenderCandidateQualityInput): TenderCandidateQuality {
  if (candidate.duplicate_candidate_id) {
    return {
      status: "duplicate",
      code: "duplicate_candidate",
      reason: "重複候補IDがあるため duplicate に回します。"
    };
  }

  const title = normalizeTitle(candidate.title);
  const compact = compactTitle(title);
  if (!compact) return reject("empty_title", "案件名が空です。");
  if (isMonthOnlyTitle(compact)) return reject("month_only_title", "案件名が月だけです。");
  if (isDateOnlyTitle(compact)) return reject("date_only_title", "案件名が日付だけです。");
  if (isNumberOrSymbolOnlyTitle(compact)) return reject("number_or_symbol_only_title", "案件名が番号・記号だけです。");
  const guidanceCode = guidanceTitleCode(title);
  if (guidanceCode) return reject(guidanceCode, "案内ページ・説明ページ・書式ページに見える候補です。");
  if (isClassificationOnlyTitle(compact)) return reject("classification_only_title", "案件名が分類名だけです。");
  if (compact.length <= 3) return reject("too_short_title", "案件名が短すぎます。");
  if (compact.length <= 5 && !hasStrongTitleWord(title)) {
    return reject("too_short_weak_title", "案件名が短く、物品名・役務名として判断できません。");
  }
  if (looksLikeNavigationTitle(title)) return reject("navigation_title", "公告タイトルではなく一覧・案内リンクに見えます。");
  if (candidate.tender_type === "unknown" && !hasStrongTitleWord(`${title} ${candidate.raw_text ?? ""} ${candidate.detail_memo ?? ""}`)) {
    return reject("unknown_weak_title", "分類不明で、物品名・役務名を示す語がありません。");
  }

  return {
    status: "reviewable",
    code: null,
    reason: null
  };
}

export function isReviewableTenderCandidate(candidate: TenderCandidateQualityInput) {
  return assessTenderCandidateQuality(candidate).status === "reviewable";
}

export function isPublishableTenderRecord(tender: TenderCandidateQualityInput) {
  return assessTenderCandidateQuality(tender).status === "reviewable";
}

export function tenderCandidateQualityLabel(quality: TenderCandidateQuality) {
  if (quality.status === "duplicate") return quality.reason ?? "重複候補です。";
  if (quality.status === "reject") return quality.reason ?? "品質チェックで却下対象です。";
  return "承認候補です。";
}

function reject(code: string, reason: string): TenderCandidateQuality {
  return {
    status: "reject",
    code,
    reason
  };
}

function normalizeTitle(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitle(value: string) {
  return value
    .replace(/[\s　]/g, "")
    .replace(/[()（）［］\[\]【】「」『』]/g, "")
    .replace(/[：:;；,，、。]/g, "")
    .trim();
}

function isMonthOnlyTitle(value: string) {
  return /^(?:令和\d{1,2}年|R\d{1,2}[.\/年]?|20\d{2}年?)?\d{1,2}月(?:分|度)?$/i.test(value);
}

function isDateOnlyTitle(value: string) {
  return (
    /^(?:令和\d{1,2}年|R\d{1,2}[.\/年]?|20\d{2}年?)?\d{1,2}月\d{1,2}日?$/.test(value)
    || /^(?:20\d{2}|R\d{1,2})[.\/-]\d{1,2}[.\/-]\d{1,2}$/i.test(value)
    || /^\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{1,2})?$/.test(value)
  );
}

function isNumberOrSymbolOnlyTitle(value: string) {
  return /^[\d０-９A-Za-zＡ-Ｚａ-ｚ\-_.\/第号]+$/.test(value);
}

function isClassificationOnlyTitle(value: string) {
  const upper = value.toUpperCase();
  if (CLASSIFICATION_ONLY_TITLES.has(value) || CLASSIFICATION_ONLY_TITLES.has(upper)) return true;
  return /^(?:令和\d{1,2}年度|R\d{1,2}年度|20\d{2}年度)?(?:入札公告|公告|公示|公募|調達情報|契約情報|入札情報|見積依頼|オープンカウンター|オープンカウンタ|物品|役務|工事)(?:一覧)?$/i.test(value);
}

function guidanceTitleCode(value: string) {
  const compact = compactTitle(value);
  for (const { code, pattern } of GUIDANCE_TITLE_PATTERNS) {
    if (pattern.test(value) || pattern.test(compact)) return code;
  }
  return null;
}

function hasStrongTitleWord(value: string) {
  return STRONG_TITLE_WORDS.some((word) => value.includes(word));
}

function looksLikeNavigationTitle(value: string) {
  if (/^(?:トップ|ホーム|一覧|詳細|戻る|次へ|前へ|こちら|クリック|ダウンロード|PDF|Excel|Word)$/i.test(value)) return true;
  return /(?:トップページ|サイトマップ|お問い合わせ|アクセス|入札結果|契約実績|調達実績|様式|各種様式|ガイドライン|入札説明書等)$/.test(value);
}
