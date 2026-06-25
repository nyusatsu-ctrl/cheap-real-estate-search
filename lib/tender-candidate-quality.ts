export type TenderCandidateQualityStatus = "reviewable" | "reject" | "duplicate";
export type TenderCandidateQualityDecision = "auto_publish" | "auto_reject" | "duplicate" | "hold";

export type TenderCandidateQuality = {
  status: TenderCandidateQualityStatus;
  code: string | null;
  reason: string | null;
  score: number;
  positiveReasons: string[];
  negativeReasons: string[];
  holdReasons: string[];
  autoPublish: boolean;
  autoReject: boolean;
  decision: TenderCandidateQualityDecision;
};

type TenderCandidateQualityInput = {
  title?: string | null;
  raw_text?: string | null;
  detail_memo?: string | null;
  source_url?: string | null;
  pdf_url?: string | null;
  attachments?: unknown[] | null;
  tender_type?: string | null;
  agency_name?: string | null;
  source_name?: string | null;
  organization_type?: string | null;
  region?: string | null;
  prefecture?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  bid_at?: string | null;
  required_qualification?: string | null;
  duplicate_candidate_id?: string | null;
  published_tender_id?: string | null;
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
  "公募に関する公示",
  "PDF",
  "EXCEL",
  "WORD"
]);

const STRONG_TITLE_WORDS = [
  "仕様書",
  "入札説明書",
  "一般競争",
  "指名競争",
  "見積公告",
  "見積依頼",
  "見積合わせ",
  "オープンカウンター",
  "オープンカウンタ",
  "企画競争",
  "購入",
  "買入",
  "調達",
  "納入",
  "納品",
  "履行",
  "開札",
  "参加資格",
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
  "製造",
  "一式",
  "ほか",
  "外",
  "部品",
  "備品",
  "役務",
  "保守点検"
];

const PROCUREMENT_NOTICE_WORDS = [
  "入札公告",
  "公告",
  "一般競争入札",
  "指名競争入札",
  "見積依頼",
  "見積公告",
  "オープンカウンター",
  "オープンカウンタ",
  "公募",
  "企画競争",
  "仕様書",
  "入札説明書",
  "調達"
];

const DEFENSE_CONTEXT_WORDS = [
  "防衛省",
  "自衛隊",
  "陸上自衛隊",
  "海上自衛隊",
  "航空自衛隊",
  "地方防衛局",
  "防衛装備庁",
  "方面会計隊",
  "駐屯地",
  "基地",
  "分屯基地",
  "地方総監部",
  "補給処",
  "mod.go.jp"
];

const GUIDANCE_TITLE_PATTERNS = [
  { code: "open_counter_guidance", pattern: /オープンカウンター方式/ },
  { code: "contract_handbook", pattern: /入札及び契約心得/ },
  { code: "quote_notice_guidance", pattern: /随意契約を前提とした見積依頼/ },
  { code: "table_header_title", pattern: /見積依頼公開日.*見積書提出期限/ },
  { code: "procurement_page_description", pattern: /入札公告[・･]公示等のページです|が実施する入札公告[・･]公示等/ },
  { code: "public_offer_index", pattern: /^公募に関する公示$/ },
  { code: "bid_info_link", pattern: /^入札[・･]落札情報はこちら$/ },
  { code: "listed_on_info_page", pattern: /入札情報のページに掲載/ },
  { code: "standard_contract_terms", pattern: /標準契約条項|標準契約書|契約書式|契約様式/ },
  { code: "purchase_order_terms", pattern: /請書条項/ },
  { code: "contract_terms", pattern: /契約条項|契約条項等/ },
  { code: "information_disclosure", pattern: /情報の公開|情報の公表|公共調達の適正化/ },
  { code: "procurement_guideline", pattern: /実施要領|低入札価格調査|特別重点調査|調達時期の目安|標準規格表/ },
  { code: "procurement_policy", pattern: /調達方針|調達予定のみ|契約制度|入札手続|契約手続|参加手続/ },
  { code: "procurement_spec_form", pattern: /調達要領|指定書|仕様書等|説明書等/ },
  { code: "bid_or_quote_form", pattern: /入札書|見積書|価格調査書|市価調査|車両適否.*調査票/ },
  { code: "forms_or_examples", pattern: /様式|書式|記入例|申請書|委任状|誓約書|チェックリスト/ },
  { code: "news_posting", pattern: /掲載しました|掲載しています|更新しました|更新情報/ },
  { code: "notice_or_sitemap", pattern: /リンク集|サイトマップ|お知らせ|説明|案内図|アクセス|問い合わせ|お問い合わせ/ },
  { code: "generic_publication", pattern: /^(?:公表|掲載|案内|一覧)$/ },
  { code: "navigation_link", pattern: /(?:はこちら|こちらをクリック|詳細はこちら|ページに掲載)$/ }
];

export function assessTenderCandidateQuality(candidate: TenderCandidateQualityInput): TenderCandidateQuality {
  if (candidate.duplicate_candidate_id) {
    return {
      status: "duplicate",
      code: "duplicate_candidate",
      reason: "重複候補IDがあるため duplicate に回します。",
      score: 0,
      positiveReasons: [],
      negativeReasons: ["重複候補IDあり"],
      holdReasons: [],
      autoPublish: false,
      autoReject: false,
      decision: "duplicate"
    };
  }

  const title = normalizeTitle(candidate.title);
  const compact = compactTitle(title);
  if (!compact) return reject("empty_title", "案件名が空です。", ["案件名が空"]);
  if (isMonthOnlyTitle(compact)) return reject("month_only_title", "案件名が月だけです。", ["月だけのタイトル"]);
  if (isDateOnlyTitle(compact)) return reject("date_only_title", "案件名が日付だけです。", ["日付だけのタイトル"]);
  if (isNumberOrSymbolOnlyTitle(compact)) return reject("number_or_symbol_only_title", "案件名が番号・記号だけです。", ["番号・記号だけのタイトル"]);
  const guidanceCode = guidanceTitleCode(title);
  if (guidanceCode) return reject(guidanceCode, "案内ページ・説明ページ・書式ページに見える候補です。", ["案内ページ・説明ページ・書式ページの可能性"]);
  if (isClassificationOnlyTitle(compact)) return reject("classification_only_title", "案件名が分類名だけです。", ["分類名だけのタイトル"]);
  if (compact.length <= 3) return reject("too_short_title", "案件名が短すぎます。", ["タイトルが短すぎる"]);
  if (compact.length <= 5 && !hasStrongTitleWord(title)) {
    return reject("too_short_weak_title", "案件名が短く、物品名・役務名として判断できません。", ["短く、物品名・役務名の手掛かりが弱い"]);
  }
  if (looksLikeNavigationTitle(title)) return reject("navigation_title", "公告タイトルではなく一覧・案内リンクに見えます。", ["一覧・案内リンクの可能性"]);
  if (candidate.tender_type === "unknown" && !hasStrongTitleWord(`${title} ${candidate.raw_text ?? ""} ${candidate.detail_memo ?? ""}`)) {
    return reject("unknown_weak_title", "分類不明で、物品名・役務名を示す語がありません。", ["分類不明で、物品名・役務名の手掛かりが弱い"]);
  }

  const scoring = scoreTenderCandidate(candidate, title);
  const holdReasons = autoPublishHoldReasons(candidate, scoring);
  const autoPublish = holdReasons.length === 0 && scoring.score >= 8;

  return {
    status: "reviewable",
    code: null,
    reason: null,
    score: scoring.score,
    positiveReasons: scoring.positiveReasons,
    negativeReasons: scoring.negativeReasons,
    holdReasons,
    autoPublish,
    autoReject: false,
    decision: autoPublish ? "auto_publish" : "hold"
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
  if (quality.autoPublish) return "高確度の自動公開候補です。";
  return "判断保留です。";
}

export function isHighConfidenceTenderCandidate(candidate: TenderCandidateQualityInput) {
  return assessTenderCandidateQuality(candidate).autoPublish;
}

export function isAutoRejectTenderCandidate(candidate: TenderCandidateQualityInput) {
  return assessTenderCandidateQuality(candidate).autoReject;
}

function reject(code: string, reason: string, negativeReasons: string[]): TenderCandidateQuality {
  return {
    status: "reject",
    code,
    reason,
    score: -10,
    positiveReasons: [],
    negativeReasons,
    holdReasons: [],
    autoPublish: false,
    autoReject: true,
    decision: "auto_reject"
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

function scoreTenderCandidate(candidate: TenderCandidateQualityInput, title: string) {
  let score = 0;
  const positiveReasons: string[] = [];
  const negativeReasons: string[] = [];
  const text = [
    title,
    candidate.raw_text,
    candidate.detail_memo,
    candidate.agency_name,
    candidate.source_name,
    candidate.organization_type,
    candidate.required_qualification,
    candidate.source_url,
    candidate.pdf_url
  ].filter(Boolean).join(" ");

  const noticeWords = matchedWords(title, PROCUREMENT_NOTICE_WORDS);
  if (noticeWords.length) {
    score += 3;
    positiveReasons.push(`公告・調達語: ${noticeWords.slice(0, 3).join("、")}`);
  }

  const strongTitleWords = matchedWords(title, STRONG_TITLE_WORDS);
  if (strongTitleWords.length) {
    score += 3;
    positiveReasons.push(`物品・役務語: ${strongTitleWords.slice(0, 4).join("、")}`);
  } else {
    const strongTextWords = matchedWords(text, STRONG_TITLE_WORDS);
    if (strongTextWords.length) {
      score += 1;
      positiveReasons.push(`本文の物品・役務語: ${strongTextWords.slice(0, 3).join("、")}`);
    }
  }

  if (/ほか\d+件|外\d+件|一式|[一二三四五六七八九十百千]+式/.test(title)) {
    score += 2;
    positiveReasons.push("数量・一式表現あり");
  }

  const defenseWords = matchedWords(text, DEFENSE_CONTEXT_WORDS);
  if (defenseWords.length || isDefenseOrganizationType(candidate.organization_type)) {
    score += 2;
    positiveReasons.push(`防衛系文脈: ${(defenseWords[0] ?? candidate.organization_type ?? "組織区分").toString()}`);
  }

  if (isKnownTenderType(candidate.tender_type)) {
    score += 2;
    positiveReasons.push(`分類: ${candidate.tender_type}`);
  } else {
    score -= 3;
    negativeReasons.push("分類が unknown/construction");
  }

  if (candidate.deadline_at || candidate.bid_at || candidate.published_at) {
    score += 2;
    positiveReasons.push("公告日・締切日・入札日のいずれかあり");
  } else {
    negativeReasons.push("日付情報なし");
  }

  if (candidate.source_url) {
    score += 1;
    positiveReasons.push("公式URLあり");
  } else {
    score -= 5;
    negativeReasons.push("公式URLなし");
  }

  if (candidate.pdf_url || (Array.isArray(candidate.attachments) && candidate.attachments.length > 0)) {
    score += 1;
    positiveReasons.push("PDF/添付URLあり");
  }

  if (candidate.published_tender_id) {
    score -= 4;
    negativeReasons.push("公開済み案件あり");
  }

  return { score, positiveReasons, negativeReasons };
}

function autoPublishHoldReasons(candidate: TenderCandidateQualityInput, scoring: { score: number; positiveReasons: string[]; negativeReasons: string[] }) {
  const reasons: string[] = [];
  const title = normalizeTitle(candidate.title);
  if (candidate.published_tender_id) reasons.push("同じURLの公開済み案件があります。");
  if (!candidate.source_url) reasons.push("公式URLがありません。");
  if (!isKnownTenderType(candidate.tender_type)) reasons.push("分類が unknown または construction です。");
  if (scoring.score < 8) reasons.push(`品質スコアが自動公開基準未満です（${scoring.score}/8）。`);
  if (!hasStrongTitleWord(title) && matchedWords(title, PROCUREMENT_NOTICE_WORDS).length === 0) {
    reasons.push("案件名に公告語または物品・役務語がありません。");
  }
  if (scoring.negativeReasons.length) reasons.push(...scoring.negativeReasons);
  return [...new Set(reasons)];
}

function matchedWords(value: string, words: string[]) {
  return words.filter((word) => value.includes(word));
}

function isKnownTenderType(value?: string | null) {
  return Boolean(value && !["unknown", "construction"].includes(value));
}

function isDefenseOrganizationType(value?: string | null) {
  return Boolean(value && [
    "defense_ministry",
    "defense_equipment_agency",
    "ground_self_defense_force",
    "maritime_self_defense_force",
    "air_self_defense_force",
    "defense_bureau",
    "defense_school",
    "defense_hospital",
    "defense_research",
    "other_defense"
  ].includes(value));
}
