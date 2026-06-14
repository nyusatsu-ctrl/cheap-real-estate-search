import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type DiagnosisTypeCode = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type LeadSource = "aidma" | "meta" | "lp" | "referral" | "direct" | "other";
export type SeminarInterest = "wants_to_join" | "wants_schedule" | "wants_materials" | "undecided" | "not_interested";
export type LeadStatus =
  | "new"
  | "call_scheduled"
  | "contacted"
  | "seminar_reserved"
  | "seminar_attended"
  | "consultation_scheduled"
  | "proposal_sent"
  | "won"
  | "lost"
  | "unreachable";

export type DiagnosisAnswerKey =
  | "business_type"
  | "business_form"
  | "license_status"
  | "monthly_sales"
  | "target_monthly_sales"
  | "profit_margin"
  | "prime_or_subcontractor"
  | "client_count"
  | "acquisition_channel"
  | "sales_activity"
  | "website_status"
  | "google_maps_status"
  | "case_studies_status"
  | "estimate_price_table"
  | "cost_management"
  | "team_status"
  | "public_works_interest"
  | "biggest_problem"
  | "increase_within_90_days"
  | "wants_consultation";

export type ScoreMap = Partial<Record<DiagnosisTypeCode, number>>;

export type DiagnosisOption = {
  value: string;
  label: string;
  scores: ScoreMap;
};

export type SupplementalAnswerField = {
  key: string;
  label: string;
  placeholder?: string;
  triggerQuestion?: DiagnosisAnswerKey;
  triggerValues?: string[];
  requiredWhenTriggered?: boolean;
};

export type DiagnosisQuestion = {
  key: DiagnosisAnswerKey;
  label: string;
  type: "radio" | "textarea";
  options?: DiagnosisOption[];
};

export type ConstructionDiagnosis = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string;
  answers: Record<string, string>;
  scores: Record<DiagnosisTypeCode, number>;
  main_type: DiagnosisTypeCode;
  sub_type: DiagnosisTypeCode;
  business_type: string;
  monthly_sales: string;
  wants_consultation: string;
  lead_source: LeadSource;
  source_campaign: string | null;
  seminar_interest: SeminarInterest;
  preferred_contact_time: string | null;
  lead_status: LeadStatus;
  admin_memo: string | null;
  admin_memo_updated_at: string | null;
  last_contacted_at: string | null;
  lead_updated_at: string;
  created_at: string;
};

export type AdminDiagnosisFilters = {
  mainType?: DiagnosisTypeCode;
  wantsConsultation?: string;
  seminarInterest?: SeminarInterest;
  leadSource?: LeadSource;
  leadStatus?: LeadStatus;
};

export const DIAGNOSIS_TYPES: Record<DiagnosisTypeCode, {
  code: DiagnosisTypeCode;
  name: string;
  currentState: string;
  issue: string;
  firstStep: string;
  action30Days: string[];
  action90Days: string[];
}> = {
  A: {
    code: "A",
    name: "元請化タイプ",
    currentState: "施工力はある一方で、下請比率が高く価格決定権を持ちにくい状態です。",
    issue: "元請案件を受けるための見せ方、問い合わせ導線、見積基準が不足しています。",
    firstStep: "得意工事と対応エリアを絞り、直接相談を受ける入口を整備します。",
    action30Days: ["元請で受けたい工事を3つに絞る", "施工事例とお客様の声を整理する", "問い合わせから現調までの流れを決める"],
    action90Days: ["ホームページとGoogleマップを元請向けに整える", "見積単価表を作り価格の下限を決める", "紹介元と地域企業への営業を開始する"]
  },
  B: {
    code: "B",
    name: "協力業者拡大型",
    currentState: "既存案件をこなす力はありますが、受注量や対応範囲が協力先の数に左右されています。",
    issue: "安定して頼める外注先、職人、専門工事会社のネットワークづくりが課題です。",
    firstStep: "不足している工種と繁忙期の応援体制を洗い出します。",
    action30Days: ["協力先が必要な工種を一覧化する", "現場ルールと支払い条件を明文化する", "既存取引先から紹介を依頼する"],
    action90Days: ["協力業者候補を10社以上確保する", "小規模案件で稼働テストを行う", "案件ごとの粗利と外注比率を確認する"]
  },
  C: {
    code: "C",
    name: "公共工事参入型",
    currentState: "民間工事中心から、安定した公共案件を検討できる土台があります。",
    issue: "建設業許可、入札参加資格、実績整理、案件探索の準備が必要です。",
    firstStep: "許可・資格・対応可能工種を確認し、参入できる発注先を絞ります。",
    action30Days: ["建設業許可と経審の必要性を確認する", "自治体と外郭団体の発注情報を調べる", "過去実績を公共向けの形式で整理する"],
    action90Days: ["入札参加資格の申請準備を進める", "少額案件や随意契約の入口を探す", "公共工事用の原価・書類管理を整える"]
  },
  D: {
    code: "D",
    name: "利益改善型",
    currentState: "売上はあっても、利益が残りにくい構造になっている可能性があります。",
    issue: "見積単価、原価管理、追加工事請求、外注費管理の見直しが優先です。",
    firstStep: "直近10件の案件ごとに売上、材料費、外注費、人工を確認します。",
    action30Days: ["赤字・低粗利案件の共通点を出す", "最低粗利率と受注しない条件を決める", "追加工事の請求ルールを作る"],
    action90Days: ["標準見積単価表を運用する", "案件別の粗利表を毎月更新する", "利益が残る顧客・工種へ営業を集中する"]
  },
  E: {
    code: "E",
    name: "集客強化型",
    currentState: "技術や実績はあるものの、新規問い合わせを安定して増やす仕組みが弱い状態です。",
    issue: "ホームページ、Googleマップ、施工事例、営業導線の整備が急務です。",
    firstStep: "問い合わせにつながる主力工事と地域キーワードを決めます。",
    action30Days: ["Googleビジネスプロフィールを整備する", "施工事例を5件公開する", "問い合わせフォームと電話導線を見直す"],
    action90Days: ["地域名と工事名で検索されるページを作る", "口コミ獲得の運用を始める", "反響数と成約率を毎週確認する"]
  },
  F: {
    code: "F",
    name: "組織拡大型",
    currentState: "売上拡大の余地はありますが、社長や親方に業務が集中しやすい段階です。",
    issue: "人員、外注、現場管理、営業管理を仕組み化しないと拡大時に品質が崩れます。",
    firstStep: "社長が抱えている業務を分解し、任せる順番を決めます。",
    action30Days: ["現場・見積・請求の業務フローを整理する", "採用または外注化する業務を決める", "案件管理表を運用する"],
    action90Days: ["協力先と従業員の役割を明確にする", "月次の数字会議を始める", "売上目標から必要案件数と人員数を逆算する"]
  },
  G: {
    code: "G",
    name: "事業転換型",
    currentState: "今の受注構造や工種だけでは、目標売上や利益に届きにくい可能性があります。",
    issue: "伸ばす工種、やめる案件、狙う顧客層を見直す必要があります。",
    firstStep: "利益が残る工事と将来伸ばしたい事業領域を切り分けます。",
    action30Days: ["過去案件を工種別に売上・粗利で並べる", "撤退候補の仕事を決める", "新しく伸ばすサービスを1つ選ぶ"],
    action90Days: ["新サービスのテスト販売を行う", "既存顧客に追加提案する", "価格・集客・体制を転換先に合わせる"]
  }
};

export const CONSULTATION_LABELS: Record<string, string> = {
  yes: "個別に詳しく知りたい",
  maybe: "内容次第で検討したい",
  overview: "まずは全体像だけ知りたい",
  no: "今は不要"
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  aidma: "アイドマHD",
  meta: "Meta広告",
  lp: "自社LP",
  referral: "紹介",
  direct: "直接",
  other: "その他"
};

export const SEMINAR_INTEREST_LABELS: Record<SeminarInterest, string> = {
  wants_to_join: "無料説明会に参加したい",
  wants_schedule: "日程が合えば参加したい",
  wants_materials: "まずは資料だけ見たい",
  undecided: "未定",
  not_interested: "今は希望しない"
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "新規",
  call_scheduled: "架電予定",
  contacted: "架電済み",
  seminar_reserved: "説明会予約",
  seminar_attended: "説明会参加済み",
  consultation_scheduled: "個別相談予定",
  proposal_sent: "条件提示済み",
  won: "成約",
  lost: "失注",
  unreachable: "連絡不可"
};

export const LEAD_SOURCE_OPTIONS = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value: value as LeadSource, label }));
export const SEMINAR_INTEREST_OPTIONS = Object.entries(SEMINAR_INTEREST_LABELS).map(([value, label]) => ({ value: value as SeminarInterest, label }));
export const LEAD_STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value: value as LeadStatus, label }));

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    key: "business_type",
    label: "主な業種（最も近いものを1つ選択してください）",
    type: "radio",
    options: [
      { value: "architecture", label: "建築工事一式", scores: { A: 2, F: 2 } },
      { value: "civil", label: "土木工事一式", scores: { C: 2, F: 1 } },
      { value: "architecture_civil", label: "土木・建築工事一式", scores: { C: 2, F: 2, A: 1 } },
      { value: "specialty", label: "専門工事", scores: { B: 2, A: 1 } },
      { value: "other", label: "その他", scores: { G: 2, E: 1 } }
    ]
  },
  {
    key: "business_form",
    label: "現在の事業形態",
    type: "radio",
    options: [
      { value: "sole_solo", label: "個人事業主（一人親方）", scores: { E: 2, A: 1 } },
      { value: "sole_with_employees", label: "個人事業主（従業員あり）", scores: { F: 2, E: 1 } },
      { value: "corporation_small", label: "法人（役員のみ・少人数）", scores: { F: 2, B: 1 } },
      { value: "corporation_employees", label: "法人（従業員あり）", scores: { F: 3, C: 1 } },
      { value: "subcontract_network", label: "協力会社・外注中心で運営", scores: { B: 3, D: 1 } },
      { value: "other", label: "その他", scores: { G: 2 } }
    ]
  },
  {
    key: "license_status",
    label: "建設業許可の状況",
    type: "radio",
    options: [
      { value: "licensed", label: "許可を持っている", scores: { C: 2, A: 1 } },
      { value: "preparing", label: "現在取得準備中", scores: { C: 3, G: 1 } },
      { value: "want", label: "今後取得したいと考えている", scores: { C: 3, G: 1 } },
      { value: "no_plan", label: "今のところ取得予定はない", scores: { E: 1, G: 1 } },
      { value: "other", label: "その他", scores: { G: 2 } }
    ]
  },
  {
    key: "monthly_sales",
    label: "直近3年の平均年商",
    type: "radio",
    options: [
      { value: "annual_under_500", label: "500万円未満", scores: { E: 3, G: 1 } },
      { value: "annual_500_1000", label: "500万円〜1,000万円未満", scores: { E: 2, A: 1 } },
      { value: "annual_1000_3000", label: "1,000万円〜3,000万円未満", scores: { A: 2, E: 1 } },
      { value: "annual_3000_5000", label: "3,000万円〜5,000万円未満", scores: { A: 2, D: 1 } },
      { value: "annual_5000_10000", label: "5,000万円〜1億円未満", scores: { F: 2, D: 1 } },
      { value: "annual_over_10000", label: "1億円以上", scores: { F: 3, B: 1, C: 1 } },
      { value: "unknown", label: "わからない", scores: { D: 1, G: 1 } }
    ]
  },
  {
    key: "target_monthly_sales",
    label: "今後の目標年商",
    type: "radio",
    options: [
      { value: "target_under_1000", label: "1,000万円未満", scores: { E: 2 } },
      { value: "target_1000_3000", label: "1,000万円〜3,000万円未満", scores: { E: 2, A: 1 } },
      { value: "target_3000_5000", label: "3,000万円〜5,000万円未満", scores: { A: 2, E: 1 } },
      { value: "target_5000_10000", label: "5,000万円〜1億円未満", scores: { F: 2, B: 1 } },
      { value: "target_over_10000", label: "1億円以上", scores: { F: 3, B: 2, C: 1 } },
      { value: "stable_profit", label: "売上より利益を安定させたい", scores: { D: 3 } },
      { value: "undecided", label: "まだ明確に決まっていない", scores: { G: 2 } }
    ]
  },
  {
    key: "profit_margin",
    label: "現在の利益状況",
    type: "radio",
    options: [
      { value: "enough", label: "利益は十分に残っている", scores: { F: 1, A: 1 } },
      { value: "not_enough", label: "売上の割に利益が残らない", scores: { D: 4 } },
      { value: "busy_no_cash", label: "忙しいが手元に残らない", scores: { D: 4, G: 1 } },
      { value: "unknown_per_site", label: "現場ごとの利益を把握できていない", scores: { D: 3, G: 1 } },
      { value: "unknown", label: "わからない", scores: { D: 2, G: 1 } }
    ]
  },
  {
    key: "prime_or_subcontractor",
    label: "主な受注形態",
    type: "radio",
    options: [
      { value: "prime", label: "元請が多い", scores: { F: 1, D: 1 } },
      { value: "subcontractor", label: "下請が多い", scores: { A: 4 } },
      { value: "mixed", label: "元請と下請が半々くらい", scores: { A: 2, D: 1 } },
      { value: "sub_subcontractor", label: "孫請が多い", scores: { A: 4, D: 1 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "client_count",
    label: "売上の依存先",
    type: "radio",
    options: [
      { value: "one", label: "ほぼ1社に依存している", scores: { A: 2, E: 2, G: 1 } },
      { value: "two_three", label: "上位2〜3社への依存が大きい", scores: { E: 2, B: 1 } },
      { value: "four_ten", label: "4〜10社に分散している", scores: { B: 2, F: 1 } },
      { value: "over_ten", label: "10社以上に分散している", scores: { F: 2, D: 1 } },
      { value: "unknown", label: "把握していない", scores: { D: 2, G: 1 } }
    ]
  },
  {
    key: "acquisition_channel",
    label: "主な仕事の獲得経路",
    type: "radio",
    options: [
      { value: "referral", label: "紹介・既存取引先", scores: { E: 2, A: 1 } },
      { value: "website", label: "ホームページ・検索経由", scores: { E: 1, A: 1 } },
      { value: "google_maps", label: "Googleマップ・口コミ", scores: { E: 2 } },
      { value: "platform", label: "一括見積・マッチングサイト", scores: { D: 1, G: 1 } },
      { value: "sales", label: "営業活動", scores: { F: 1, B: 1 } },
      { value: "public", label: "公共工事", scores: { C: 3 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "sales_activity",
    label: "営業活動の状況",
    type: "radio",
    options: [
      { value: "active", label: "継続的に実施している", scores: { F: 1, A: 1 } },
      { value: "sometimes", label: "必要な時だけ実施している", scores: { E: 2 } },
      { value: "none", label: "ほとんど実施していない", scores: { E: 3, A: 1 } },
      { value: "do_not_know", label: "営業のやり方が分からない", scores: { E: 4, G: 1 } },
      { value: "referral_enough", label: "今は紹介だけで足りている", scores: { A: 1, F: 1 } }
    ]
  },
  {
    key: "website_status",
    label: "ホームページの状況",
    type: "radio",
    options: [
      { value: "works", label: "あり、問い合わせも来ている", scores: { A: 1, F: 1 } },
      { value: "exists", label: "あるが、あまり反響がない", scores: { E: 2 } },
      { value: "not_updated", label: "あるが、ほとんど更新していない", scores: { E: 3 } },
      { value: "none", label: "ない", scores: { E: 3 } },
      { value: "unknown", label: "わからない", scores: { E: 1, G: 1 } }
    ]
  },
  {
    key: "google_maps_status",
    label: "Googleビジネスプロフィールの状況",
    type: "radio",
    options: [
      { value: "works", label: "活用していて反響もある", scores: { E: 1 } },
      { value: "not_used", label: "登録しているが活用できていない", scores: { E: 2 } },
      { value: "basic", label: "登録だけしている", scores: { E: 2 } },
      { value: "none", label: "登録していない", scores: { E: 3 } },
      { value: "unknown", label: "わからない", scores: { E: 1, G: 1 } }
    ]
  },
  {
    key: "case_studies_status",
    label: "施工事例の発信状況",
    type: "radio",
    options: [
      { value: "many", label: "十分に公開している", scores: { A: 1, E: 1 } },
      { value: "some", label: "ある程度は公開している", scores: { E: 1, A: 1 } },
      { value: "few", label: "少しだけ公開している", scores: { E: 2 } },
      { value: "none", label: "公開していない", scores: { E: 2, A: 1 } },
      { value: "photos_unorganized", label: "写真はあるが整理できていない", scores: { E: 3 } }
    ]
  },
  {
    key: "estimate_price_table",
    label: "見積・積算・単価管理の状況",
    type: "radio",
    options: [
      { value: "yes", label: "単価表・見積ルールが整備されている", scores: { D: 1, F: 1 } },
      { value: "partial", label: "一部だけ整備されている", scores: { D: 2 } },
      { value: "intuition", label: "担当者の感覚で見積している", scores: { D: 3, A: 1 } },
      { value: "inconsistent", label: "毎回バラバラで整備できていない", scores: { D: 4, A: 1 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "cost_management",
    label: "原価・利益管理の状況",
    type: "radio",
    options: [
      { value: "per_project", label: "現場ごとに管理している", scores: { F: 1, C: 1 } },
      { value: "monthly_rough", label: "月単位でざっくり把握している", scores: { D: 2 } },
      { value: "rough", label: "どんぶり勘定になっている", scores: { D: 3 } },
      { value: "none", label: "ほとんど管理できていない", scores: { D: 4 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "team_status",
    label: "現在の施工体制",
    type: "radio",
    options: [
      { value: "employees", label: "従業員中心で回している", scores: { F: 3 } },
      { value: "partners", label: "協力会社・外注先中心で回している", scores: { B: 3 } },
      { value: "both", label: "従業員と協力会社の両方で回している", scores: { F: 2, B: 2 } },
      { value: "owner_small", label: "代表者・少人数で回している", scores: { E: 1, G: 1 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "public_works_interest",
    label: "公共工事への関心度",
    type: "radio",
    options: [
      { value: "high", label: "すぐにでも検討したい", scores: { C: 4 } },
      { value: "conditional", label: "条件が合えば検討したい", scores: { C: 3 } },
      { value: "researching", label: "興味はあるが、まだ情報収集中", scores: { C: 2, G: 1 } },
      { value: "low", label: "今は民間工事中心でよい", scores: { A: 1, E: 1 } },
      { value: "already", label: "すでに一部参入している", scores: { C: 2, F: 1 } },
      { value: "other", label: "その他", scores: { G: 1 } }
    ]
  },
  {
    key: "biggest_problem",
    label: "今一番困っていること",
    type: "radio",
    options: [
      { value: "no_leads", label: "新規の仕事が増えない", scores: { E: 4 } },
      { value: "low_profit", label: "利益が残らない", scores: { D: 4 } },
      { value: "subcontract_dependence", label: "下請中心から抜け出したい", scores: { A: 4 } },
      { value: "lack_people", label: "人手・協力業者が足りない", scores: { B: 3, F: 2 } },
      { value: "want_public", label: "公共工事に参入したい", scores: { C: 4 } },
      { value: "business_unclear", label: "事業の方向性に迷っている", scores: { G: 4 } },
      { value: "other", label: "その他", scores: { G: 2 } }
    ]
  },
  {
    key: "increase_within_90_days",
    label: "90日以内に売上や経営状況を改善したいですか",
    type: "radio",
    options: [
      { value: "yes", label: "はい、できるだけ早く改善したい", scores: { E: 2, A: 1 } },
      { value: "steady", label: "無理のない範囲で改善したい", scores: { D: 1, F: 1 } },
      { value: "medium_term", label: "中長期で考えたい", scores: { F: 1, G: 1 } },
      { value: "no", label: "まだそこまで急いでいない", scores: { G: 1 } }
    ]
  },
  {
    key: "wants_consultation",
    label: "個別に改善方法を知りたいですか",
    type: "radio",
    options: [
      { value: "yes", label: CONSULTATION_LABELS.yes, scores: { A: 1, E: 1, D: 1 } },
      { value: "maybe", label: CONSULTATION_LABELS.maybe, scores: { G: 1 } },
      { value: "overview", label: CONSULTATION_LABELS.overview, scores: { C: 1 } },
      { value: "no", label: CONSULTATION_LABELS.no, scores: {} }
    ]
  }
];

export const SUPPLEMENTAL_ANSWER_FIELDS: SupplementalAnswerField[] = [
  {
    key: "service_area",
    label: "対応エリア",
    placeholder: "例: 熊本県内、九州一円、熊本市周辺など"
  },
  {
    key: "business_type_detail",
    label: "具体的な業種・工事内容",
    placeholder: "内装、電気、設備、管、塗装、防水、解体、とび・土工、左官、外構、造園など",
    triggerQuestion: "business_type",
    triggerValues: ["specialty", "other"],
    requiredWhenTriggered: true
  },
  {
    key: "business_form_detail",
    label: "事業形態の補足",
    triggerQuestion: "business_form",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "license_status_detail",
    label: "建設業許可の状況補足",
    triggerQuestion: "license_status",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "prime_or_subcontractor_detail",
    label: "受注形態の補足",
    triggerQuestion: "prime_or_subcontractor",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "acquisition_channel_detail",
    label: "獲得経路の補足",
    triggerQuestion: "acquisition_channel",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "estimate_price_table_detail",
    label: "見積・積算管理の補足",
    triggerQuestion: "estimate_price_table",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "cost_management_detail",
    label: "原価・利益管理の補足",
    triggerQuestion: "cost_management",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "team_status_detail",
    label: "施工体制の補足",
    triggerQuestion: "team_status",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "public_works_interest_detail",
    label: "公共工事への関心の補足",
    triggerQuestion: "public_works_interest",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  },
  {
    key: "biggest_problem_detail",
    label: "困っていることの補足",
    triggerQuestion: "biggest_problem",
    triggerValues: ["other"],
    requiredWhenTriggered: true
  }
];

const FALLBACK_ANSWER_LABELS: Record<string, Record<string, string>> = {
  business_type: {
    general: "総合建設・工務店（旧設問）",
    renovation: "リフォーム・内装（旧設問）",
    equipment: "設備・電気・空調（旧設問）"
  },
  business_form: {
    solo: "一人親方・個人事業（旧設問）",
    small_company: "法人・少人数（旧設問）",
    company: "法人・従業員あり（旧設問）",
    subcontract_team: "外注チーム中心（旧設問）"
  },
  license_status: {
    yes: "あり（旧設問）",
    no: "なし（旧設問）"
  },
  monthly_sales: {
    under_100: "100万円未満（月商・旧設問）",
    "100_300": "100万〜300万円（月商・旧設問）",
    "300_700": "300万〜700万円（月商・旧設問）",
    "700_1500": "700万〜1,500万円（月商・旧設問）",
    over_1500: "1,500万円以上（月商・旧設問）"
  },
  target_monthly_sales: {
    "300": "300万円（月商・旧設問）",
    "500": "500万円（月商・旧設問）",
    "1000": "1,000万円（月商・旧設問）",
    "2000": "2,000万円以上（月商・旧設問）"
  },
  profit_margin: {
    yes: "十分に残っている（旧設問）"
  },
  website_status: {
    exists: "あるが反響は少ない（旧設問）"
  },
  google_maps_status: {
    done: "対策している（旧設問）"
  },
  team_status: {
    none: "いない（旧設問）"
  },
  public_works_interest: {
    medium: "興味はある（旧設問）"
  }
};

const TYPE_ORDER: DiagnosisTypeCode[] = ["A", "B", "C", "D", "E", "F", "G"];
const LEAD_SOURCE_VALUES = new Set<LeadSource>(["aidma", "meta", "lp", "referral", "direct", "other"]);
const SEMINAR_INTEREST_VALUES = new Set<SeminarInterest>(["wants_to_join", "wants_schedule", "wants_materials", "undecided", "not_interested"]);
const LEAD_STATUS_VALUES = new Set<LeadStatus>([
  "new",
  "call_scheduled",
  "contacted",
  "seminar_reserved",
  "seminar_attended",
  "consultation_scheduled",
  "proposal_sent",
  "won",
  "lost",
  "unreachable"
]);

export function scoreDiagnosis(answers: Record<string, string>) {
  const scores = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0])) as Record<DiagnosisTypeCode, number>;

  for (const question of DIAGNOSIS_QUESTIONS) {
    const option = question.options?.find((candidate) => candidate.value === answers[question.key]);
    if (!option) continue;
    for (const [type, score] of Object.entries(option.scores) as [DiagnosisTypeCode, number][]) {
      scores[type] += score;
    }
  }

  const ranked = [...TYPE_ORDER].sort((a, b) => scores[b] - scores[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  return {
    scores,
    mainType: ranked[0],
    subType: ranked[1]
  };
}

export function getAnswerLabel(key: string, value: string) {
  const question = DIAGNOSIS_QUESTIONS.find((candidate) => candidate.key === key);
  return question?.options?.find((option) => option.value === value)?.label ?? FALLBACK_ANSWER_LABELS[key]?.[value] ?? value;
}

export function getQuestionLabel(key: string) {
  return DIAGNOSIS_QUESTIONS.find((candidate) => candidate.key === key)?.label
    ?? SUPPLEMENTAL_ANSWER_FIELDS.find((field) => field.key === key)?.label
    ?? key;
}

export function getSupplementalFieldsForQuestion(key: DiagnosisAnswerKey) {
  return SUPPLEMENTAL_ANSWER_FIELDS.filter((field) => field.triggerQuestion === key);
}

export function getSupplementalAnswerEntries(answers: Record<string, string>) {
  return SUPPLEMENTAL_ANSWER_FIELDS
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: answers[field.key]?.trim() ?? ""
    }))
    .filter((entry) => entry.value);
}

export function normalizeLeadSource(value: string | null | undefined): LeadSource {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "direct";
  return LEAD_SOURCE_VALUES.has(normalized as LeadSource) ? normalized as LeadSource : "other";
}

export function normalizeSeminarInterest(value: string | null | undefined): SeminarInterest {
  const normalized = String(value ?? "").trim();
  return SEMINAR_INTEREST_VALUES.has(normalized as SeminarInterest) ? normalized as SeminarInterest : "undecided";
}

export function normalizeLeadStatus(value: string | null | undefined): LeadStatus {
  const normalized = String(value ?? "").trim();
  return LEAD_STATUS_VALUES.has(normalized as LeadStatus) ? normalized as LeadStatus : "new";
}

export function getLeadSourceLabel(value: string | null | undefined) {
  return LEAD_SOURCE_LABELS[normalizeLeadSource(value)];
}

export function getSeminarInterestLabel(value: string | null | undefined) {
  return SEMINAR_INTEREST_LABELS[normalizeSeminarInterest(value)];
}

export function getLeadStatusLabel(value: string | null | undefined) {
  return LEAD_STATUS_LABELS[normalizeLeadStatus(value)];
}

export async function getDiagnosisClient() {
  return createSupabaseServiceRoleClient() ?? await createSupabaseServerClient();
}

export async function getConstructionDiagnosis(id: string) {
  const supabase = await getDiagnosisClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("construction_diagnoses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ConstructionDiagnosis;
}

export async function getConstructionDiagnoses(filters: AdminDiagnosisFilters = {}) {
  const supabase = await getDiagnosisClient();
  if (!supabase) return [] as ConstructionDiagnosis[];

  let query = supabase
    .from("construction_diagnoses")
    .select("*")
    .order("lead_updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.mainType) query = query.eq("main_type", filters.mainType);
  if (filters.wantsConsultation) query = query.eq("wants_consultation", filters.wantsConsultation);
  if (filters.seminarInterest) query = query.eq("seminar_interest", filters.seminarInterest);
  if (filters.leadSource) query = query.eq("lead_source", filters.leadSource);
  if (filters.leadStatus) query = query.eq("lead_status", filters.leadStatus);

  const { data, error } = await query;

  if (error) return [] as ConstructionDiagnosis[];
  return (data ?? []) as ConstructionDiagnosis[];
}

export function formatDiagnosisDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
