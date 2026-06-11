import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type DiagnosisTypeCode = "A" | "B" | "C" | "D" | "E" | "F" | "G";

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
  created_at: string;
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
  yes: "個別に知りたい",
  maybe: "内容次第で検討したい",
  no: "今は不要"
};

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    key: "business_type",
    label: "主な業種",
    type: "radio",
    options: [
      { value: "general", label: "総合建設・工務店", scores: { A: 2, F: 2 } },
      { value: "renovation", label: "リフォーム・内装", scores: { A: 2, E: 2 } },
      { value: "specialty", label: "専門工事", scores: { B: 2, A: 1 } },
      { value: "civil", label: "土木・外構", scores: { C: 2, F: 1 } },
      { value: "equipment", label: "設備・電気・空調", scores: { B: 2, E: 1 } }
    ]
  },
  {
    key: "business_form",
    label: "事業形態",
    type: "radio",
    options: [
      { value: "solo", label: "一人親方・個人事業", scores: { E: 2, A: 1 } },
      { value: "small_company", label: "法人・少人数", scores: { F: 2, B: 1 } },
      { value: "company", label: "法人・従業員あり", scores: { F: 2, C: 1 } },
      { value: "subcontract_team", label: "外注チーム中心", scores: { B: 2, D: 1 } }
    ]
  },
  {
    key: "license_status",
    label: "建設業許可の有無",
    type: "radio",
    options: [
      { value: "yes", label: "あり", scores: { C: 2, A: 1 } },
      { value: "preparing", label: "取得準備中", scores: { C: 2, G: 1 } },
      { value: "no", label: "なし", scores: { E: 1, G: 1 } }
    ]
  },
  {
    key: "monthly_sales",
    label: "現在の月商",
    type: "radio",
    options: [
      { value: "under_100", label: "100万円未満", scores: { E: 3, G: 1 } },
      { value: "100_300", label: "100万-300万円", scores: { E: 2, A: 1 } },
      { value: "300_700", label: "300万-700万円", scores: { A: 2, D: 1 } },
      { value: "700_1500", label: "700万-1,500万円", scores: { F: 2, D: 1 } },
      { value: "over_1500", label: "1,500万円以上", scores: { F: 3, B: 1 } }
    ]
  },
  {
    key: "target_monthly_sales",
    label: "目標月商",
    type: "radio",
    options: [
      { value: "300", label: "300万円", scores: { E: 2 } },
      { value: "500", label: "500万円", scores: { A: 2, E: 1 } },
      { value: "1000", label: "1,000万円", scores: { F: 2, B: 1 } },
      { value: "2000", label: "2,000万円以上", scores: { F: 3, B: 2 } },
      { value: "stable_profit", label: "売上より利益を安定させたい", scores: { D: 3 } }
    ]
  },
  {
    key: "profit_margin",
    label: "利益は十分に残っているか",
    type: "radio",
    options: [
      { value: "yes", label: "十分に残っている", scores: { F: 1, A: 1 } },
      { value: "not_enough", label: "売上の割に残らない", scores: { D: 4 } },
      { value: "unknown", label: "案件別には把握できていない", scores: { D: 3, G: 1 } }
    ]
  },
  {
    key: "prime_or_subcontractor",
    label: "主な仕事は元請か下請か",
    type: "radio",
    options: [
      { value: "prime", label: "元請が多い", scores: { F: 1, D: 1 } },
      { value: "subcontractor", label: "下請が多い", scores: { A: 4 } },
      { value: "mixed", label: "半々くらい", scores: { A: 2, D: 1 } }
    ]
  },
  {
    key: "client_count",
    label: "取引先数",
    type: "radio",
    options: [
      { value: "one", label: "1社に依存している", scores: { A: 2, E: 2, G: 1 } },
      { value: "two_three", label: "2-3社", scores: { E: 2, B: 1 } },
      { value: "four_ten", label: "4-10社", scores: { B: 2, F: 1 } },
      { value: "over_ten", label: "10社以上", scores: { F: 2, D: 1 } }
    ]
  },
  {
    key: "acquisition_channel",
    label: "仕事の獲得経路",
    type: "radio",
    options: [
      { value: "referral", label: "紹介・既存先が中心", scores: { E: 2, A: 1 } },
      { value: "website", label: "ホームページ・検索", scores: { E: 1, A: 1 } },
      { value: "platform", label: "マッチングサイト", scores: { D: 1, G: 1 } },
      { value: "sales", label: "営業活動", scores: { F: 1, B: 1 } },
      { value: "public", label: "公共案件・入札", scores: { C: 3 } }
    ]
  },
  {
    key: "sales_activity",
    label: "営業活動の有無",
    type: "radio",
    options: [
      { value: "active", label: "定期的にしている", scores: { F: 1, A: 1 } },
      { value: "sometimes", label: "必要な時だけしている", scores: { E: 2 } },
      { value: "none", label: "ほとんどしていない", scores: { E: 3, A: 1 } }
    ]
  },
  {
    key: "website_status",
    label: "ホームページの有無",
    type: "radio",
    options: [
      { value: "works", label: "あり、問い合わせも来る", scores: { A: 1, F: 1 } },
      { value: "exists", label: "あるが反響は少ない", scores: { E: 2 } },
      { value: "none", label: "なし", scores: { E: 3 } }
    ]
  },
  {
    key: "google_maps_status",
    label: "Googleマップ対策の有無",
    type: "radio",
    options: [
      { value: "done", label: "対策している", scores: { E: 1 } },
      { value: "basic", label: "登録だけしている", scores: { E: 2 } },
      { value: "none", label: "していない", scores: { E: 3 } }
    ]
  },
  {
    key: "case_studies_status",
    label: "施工事例公開の有無",
    type: "radio",
    options: [
      { value: "many", label: "十分に公開している", scores: { A: 1, E: 1 } },
      { value: "few", label: "少しだけ公開している", scores: { E: 2 } },
      { value: "none", label: "公開していない", scores: { E: 2, A: 1 } }
    ]
  },
  {
    key: "estimate_price_table",
    label: "見積単価表の有無",
    type: "radio",
    options: [
      { value: "yes", label: "ある", scores: { D: 1, F: 1 } },
      { value: "partial", label: "一部だけある", scores: { D: 2 } },
      { value: "no", label: "ない", scores: { D: 3, A: 1 } }
    ]
  },
  {
    key: "cost_management",
    label: "原価管理の有無",
    type: "radio",
    options: [
      { value: "per_project", label: "案件別に管理している", scores: { F: 1, C: 1 } },
      { value: "rough", label: "ざっくり把握している", scores: { D: 2 } },
      { value: "none", label: "ほとんど管理していない", scores: { D: 4 } }
    ]
  },
  {
    key: "team_status",
    label: "従業員または外注先の有無",
    type: "radio",
    options: [
      { value: "employees", label: "従業員がいる", scores: { F: 3 } },
      { value: "partners", label: "外注先・協力業者がいる", scores: { B: 3 } },
      { value: "both", label: "従業員も外注先もいる", scores: { F: 2, B: 2 } },
      { value: "none", label: "いない", scores: { E: 1, G: 1 } }
    ]
  },
  {
    key: "public_works_interest",
    label: "公共工事への興味",
    type: "radio",
    options: [
      { value: "high", label: "すぐ検討したい", scores: { C: 4 } },
      { value: "medium", label: "興味はある", scores: { C: 3 } },
      { value: "low", label: "今は民間中心でよい", scores: { A: 1, E: 1 } }
    ]
  },
  {
    key: "biggest_problem",
    label: "今一番困っていること",
    type: "radio",
    options: [
      { value: "no_leads", label: "新規の仕事が増えない", scores: { E: 4 } },
      { value: "low_profit", label: "利益が残らない", scores: { D: 4 } },
      { value: "subcontract_dependence", label: "下請から抜け出したい", scores: { A: 4 } },
      { value: "lack_people", label: "人や協力業者が足りない", scores: { B: 3, F: 2 } },
      { value: "want_public", label: "公共工事に入りたい", scores: { C: 4 } },
      { value: "business_unclear", label: "今の事業のままでよいか迷う", scores: { G: 4 } }
    ]
  },
  {
    key: "increase_within_90_days",
    label: "90日以内に売上を増やしたいか",
    type: "radio",
    options: [
      { value: "yes", label: "はい、早く増やしたい", scores: { E: 2, A: 1 } },
      { value: "steady", label: "無理なく増やしたい", scores: { D: 1, F: 1 } },
      { value: "no", label: "急いではいない", scores: { G: 1 } }
    ]
  },
  {
    key: "wants_consultation",
    label: "個別に改善方法を知りたいか",
    type: "radio",
    options: [
      { value: "yes", label: CONSULTATION_LABELS.yes, scores: { A: 1, E: 1, D: 1 } },
      { value: "maybe", label: CONSULTATION_LABELS.maybe, scores: { G: 1 } },
      { value: "no", label: CONSULTATION_LABELS.no, scores: {} }
    ]
  }
];

const TYPE_ORDER: DiagnosisTypeCode[] = ["A", "B", "C", "D", "E", "F", "G"];

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
  return question?.options?.find((option) => option.value === value)?.label ?? value;
}

export function getQuestionLabel(key: string) {
  return DIAGNOSIS_QUESTIONS.find((candidate) => candidate.key === key)?.label ?? key;
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

export async function getConstructionDiagnoses() {
  const supabase = await getDiagnosisClient();
  if (!supabase) return [] as ConstructionDiagnosis[];

  const { data, error } = await supabase
    .from("construction_diagnoses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [] as ConstructionDiagnosis[];
  return (data ?? []) as ConstructionDiagnosis[];
}

export function formatDiagnosisDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
