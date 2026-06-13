import type {
  FavoriteTenderStatus,
  PropertyCategory,
  PropertyStatus,
  PropertyType,
  PublicationPermission,
  TenderCandidateReviewStatus,
  TenderCandidateType,
  TenderCrawlFrequency,
  TenderCrawlPriority,
  TenderCrawlerDifficulty,
  TenderCrawlerType,
  TenderSourceFormat,
  TenderSourceOrganizationType,
  TenderStatus,
  TenderType
} from "@/lib/types";

export const PROPERTY_BASE_TYPE_LABELS: Record<PropertyType, string> = {
  land: "土地",
  old_house_land: "古家付き土地",
  detached_house: "戸建て",
  warehouse: "倉庫",
  store: "店舗",
  other: "その他"
};

export const PROPERTY_TYPE_LABELS: Record<PropertyCategory, string> = {
  ...PROPERTY_BASE_TYPE_LABELS,
  vacant_house: "空き家",
  forest: "山林",
  farmland: "農地",
  vacation_house: "別荘",
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "非公開",
  published: "公開中",
  sold: "成約済み"
};

export const PERMISSION_LABELS: Record<PublicationPermission, string> = {
  permitted: "許諾済み",
  pending: "確認中",
  denied: "掲載不可",
  unknown: "未確認"
};

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];

export const PROPERTY_REGION_OPTIONS = [
  {
    value: "hokkaido",
    label: "北海道",
    prefectures: ["北海道"]
  },
  {
    value: "tohoku",
    label: "東北",
    prefectures: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]
  },
  {
    value: "kanto",
    label: "関東",
    prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"]
  },
  {
    value: "chubu",
    label: "中部",
    prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"]
  },
  {
    value: "kinki",
    label: "近畿",
    prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"]
  },
  {
    value: "chugoku",
    label: "中国",
    prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"]
  },
  {
    value: "shikoku",
    label: "四国",
    prefectures: ["徳島県", "香川県", "愛媛県", "高知県"]
  },
  {
    value: "kyushu-okinawa",
    label: "九州・沖縄",
    prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]
  }
] as const;

export const REGIONS = ["全国", ...PROPERTY_REGION_OPTIONS.map((region) => region.label)];

export const PROPERTY_PRICE_RANGE_OPTIONS = [
  { value: "zero", label: "0円", minPrice: 0, maxPrice: 0 },
  { value: "under300", label: "300万円以下", minPrice: undefined, maxPrice: 3000000 },
  { value: "1-50", label: "1円〜50万円", minPrice: 1, maxPrice: 500000 },
  { value: "50-100", label: "50万円〜100万円", minPrice: 500000, maxPrice: 1000000 },
  { value: "100-300", label: "100万円〜300万円", minPrice: 1000000, maxPrice: 3000000 },
  { value: "300-500", label: "300万円〜500万円", minPrice: 3000000, maxPrice: 5000000 },
  { value: "500-plus", label: "500万円以上", minPrice: 5000000, maxPrice: undefined }
] as const;

export const TENDER_TYPE_LABELS: Record<TenderType, string> = {
  goods: "物品",
  service: "役務",
  open_counter: "0円物件",
  unified_qualification: "エリア検索必要物件"
};

export const TENDER_CANDIDATE_TYPE_LABELS: Record<TenderCandidateType, string> = {
  goods: "物品",
  services: "役務",
  open_counter: "0円物件",
  small_discretionary: "少額随意契約",
  qualification_required: "エリア指定物件",
  construction: "工事",
  unknown: "不明"
};

export const TENDER_CANDIDATE_REVIEW_STATUS_LABELS: Record<TenderCandidateReviewStatus, string> = {
  pending: "確認待ち",
  approved: "承認済み",
  rejected: "却下",
  duplicate: "重複"
};

export const TENDER_SOURCE_ORGANIZATION_TYPE_LABELS: Record<TenderSourceOrganizationType, string> = {
  national_government: "国",
  ministry: "省庁",
  defense_ministry: "空き家",
  defense_equipment_agency: "防衛装備庁",
  ground_self_defense_force: "陸上古家",
  maritime_self_defense_force: "海上古家",
  air_self_defense_force: "航空古家",
  defense_bureau: "地方防衛局",
  defense_school: "防衛学校",
  defense_hospital: "防衛医療機関",
  defense_research: "防衛研究機関",
  other_defense: "その他防衛機関",
  local_branch: "地方支分部局",
  prefecture: "都道府県",
  designated_city: "政令指定都市",
  municipality: "市区町村",
  independent_agency: "独立行政法人",
  national_university: "国立大学法人",
  hospital_organization: "病院機構",
  other: "その他"
};

export const TENDER_SOURCE_FORMAT_LABELS: Record<TenderSourceFormat, string> = {
  html: "HTML",
  pdf: "PDF",
  excel: "Excel",
  word: "Word",
  search_form: "検索フォーム",
  javascript: "JavaScript",
  mixed: "混在"
};

export const TENDER_CRAWLER_TYPE_LABELS: Record<TenderCrawlerType, string> = {
  p_portal: "調達ポータル",
  kkj_portal: "官公需情報ポータル",
  generic_html: "汎用HTML",
  generic_pdf_list: "PDF一覧",
  defense_mod: "空き家",
  defense_unit: "古家・防衛機関",
  ministry_page: "省庁ページ",
  local_government: "自治体",
  e_procurement_system: "電子調達システム",
  manual_only: "手動管理"
};

export const TENDER_CRAWLER_DIFFICULTY_LABELS: Record<TenderCrawlerDifficulty, string> = {
  low: "低",
  medium: "中",
  high: "高"
};

export const TENDER_CRAWL_PRIORITY_LABELS: Record<TenderCrawlPriority, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D"
};

export const TENDER_CRAWL_FREQUENCY_LABELS: Record<TenderCrawlFrequency, string> = {
  daily: "毎日",
  weekly: "毎週",
  manual: "手動"
};

export const OPEN_COUNTER_LABELS = [
  "0円物件",
  "オープンカウンタ",
  "公開見積",
  "公開見積合せ",
  "公開見積合わせ",
  "公募型見積",
  "公募型見積合せ",
  "公募型見積合わせ",
  "定例見積",
  "物品定例見積",
  "見積依頼",
  "見積合わせ",
  "見積書提出",
  "少額調達",
  "少額随意契約"
];

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  draft: "下書き",
  published: "公開中",
  archived: "アーカイブ"
};

export const FAVORITE_TENDER_STATUS_LABELS: Record<FavoriteTenderStatus, string> = {
  unchecked: "未確認",
  reviewing: "内容確認中",
  preparing_quote: "見積準備中",
  planning: "参加予定",
  declined: "見送り",
  bid_submitted: "物件済み",
  won: "落札",
  lost: "不落"
};

export const QUALIFICATION_STATUS_LABELS = {
  not_started: "未取得",
  preparing: "申請準備中",
  submitted: "申請済み",
  acquired: "取得済み",
  renewal: "更新したい"
};

export const SCRIVENER_REQUEST_LABELS = {
  self_apply_steps: "自分で申請したいので手順を知りたい",
  ask_scrivener: "行政書士に依頼したい",
  check_documents: "必要書類を確認したい",
  after_acquisition: "取得後の物件参加方法を知りたい"
};
