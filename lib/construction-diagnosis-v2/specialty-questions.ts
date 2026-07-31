import type {
  DiagnosisV2AnswerMap,
  DiagnosisV2Option,
  DiagnosisV2Question
} from "./questions.ts";

export type PrimaryTrade =
  | "demolition"
  | "painting"
  | "renovation"
  | "scaffold"
  | "interior"
  | "civil"
  | "building"
  | "exterior"
  | "electrical"
  | "plumbing"
  | "waterproofing"
  | "roofing"
  | "plastering"
  | "landscaping"
  | "other_specialty"
  | "multiple";

export type OrderModel =
  | "consumer_direct"
  | "private_prime"
  | "subcontract"
  | "municipal_public"
  | "national_public"
  | "property_management"
  | "insurance_disaster"
  | "other";

export type PublicWorkIntent =
  | "participating"
  | "expand_within_year"
  | "interested_unscheduled"
  | "not_interested"
  | "unknown";

export type PublicWorksScoringMode = "included" | "reference" | "excluded";

export type SpecialtyDiagnosisSummary = {
  trade: PrimaryTrade;
  tradeLabel: string;
  score: number;
  strengths: string[];
  priorities: string[];
  kpis: string[];
  plan90Days: string[];
};

export const PRIMARY_TRADE_OPTIONS: Array<{ value: PrimaryTrade; label: string }> = [
  { value: "demolition", label: "解体工事" },
  { value: "painting", label: "塗装工事" },
  { value: "renovation", label: "リフォーム・改修工事" },
  { value: "scaffold", label: "とび・足場工事" },
  { value: "interior", label: "内装仕上・クロス工事" },
  { value: "civil", label: "土木一式工事" },
  { value: "building", label: "建築一式工事" },
  { value: "exterior", label: "外構・エクステリア工事" },
  { value: "electrical", label: "電気工事" },
  { value: "plumbing", label: "管・設備工事" },
  { value: "waterproofing", label: "防水工事" },
  { value: "roofing", label: "屋根工事" },
  { value: "plastering", label: "左官工事" },
  { value: "landscaping", label: "造園工事" },
  { value: "other_specialty", label: "その他専門工事" },
  { value: "multiple", label: "複数業種" }
];

export const ORDER_MODEL_OPTIONS: Array<{ value: OrderModel; label: string }> = [
  { value: "consumer_direct", label: "個人客からの直接受注" },
  { value: "private_prime", label: "法人からの民間元請" },
  { value: "subcontract", label: "建設会社・工務店等からの下請" },
  { value: "municipal_public", label: "自治体の公共工事" },
  { value: "national_public", label: "国・関連機関の公共工事" },
  { value: "property_management", label: "管理会社・不動産会社からの受注" },
  { value: "insurance_disaster", label: "保険・災害復旧関係" },
  { value: "other", label: "その他" }
];

export const PUBLIC_WORK_INTENT_OPTIONS: Array<{ value: PublicWorkIntent; label: string }> = [
  { value: "participating", label: "現在すでに参加している" },
  { value: "expand_within_year", label: "今後1年以内に参加・拡大したい" },
  { value: "interested_unscheduled", label: "関心はあるが時期は未定" },
  { value: "not_interested", label: "現時点では希望しない" },
  { value: "unknown", label: "分からない" }
];

export const SELF_PERFORM_OPTIONS = [
  "ほぼ自社施工",
  "自社施工が多い",
  "自社施工と外注が半々",
  "外注が多い",
  "ほぼ外注",
  "不明"
];

export const PROJECT_SIZE_OPTIONS = [
  "50万円未満",
  "50万円以上200万円未満",
  "200万円以上500万円未満",
  "500万円以上1,000万円未満",
  "1,000万円以上5,000万円未満",
  "5,000万円以上",
  "案件により大きく異なる",
  "回答しない"
];

const option = (score: number, label: string): DiagnosisV2Option => ({ value: String(score), label, score });
const question = (
  id: string,
  section: DiagnosisV2Question["section"],
  text: string,
  weight: number,
  options: DiagnosisV2Option[],
  critical = false
): DiagnosisV2Question => ({ id, section, question: text, weight, options, critical, displayOrder: 1000 });

const DEMOLITION_QUESTIONS: DiagnosisV2Question[] = [
  question("D01", "profit", "見積時に、建物構造、残置物、廃棄物量、運搬費、処分費、重機費を分けて原価計算していますか。", 3, [option(0, "総額の感覚だけで見積もる"), option(1, "主要費用だけ概算"), option(2, "案件により明細化"), option(3, "原則として費目別に算出"), option(4, "実績原価を次回見積へ反映")]),
  question("D02", "technical", "着工前の現地調査、石綿・有害物、埋設物、近隣条件等の確認体制はどうですか。", 3, [option(0, "ほとんど確認していない"), option(1, "担当者の経験に依存"), option(2, "主要項目のみ確認"), option(3, "確認表と証拠を保存"), option(4, "法令・追加費用・施工計画まで連動")], true),
  question("D03", "profit", "追加廃棄物、地中障害物、残置物等が発見された場合の追加費用を請求できますか。", 2, [option(0, "ほとんど請求できない"), option(1, "口頭交渉が中心"), option(2, "案件により請求"), option(3, "契約条件と証拠を整備"), option(4, "着工前説明から追加請求まで標準化")]),
  question("D04", "control", "廃棄物の搬出先、数量、処分記録、マニフェスト等を案件単位で管理していますか。", 3, [option(0, "管理できていない"), option(1, "紙が散在している"), option(2, "主要案件のみ整理"), option(3, "案件単位で保存"), option(4, "請求・原価・法令記録まで一元管理")], true),
  question("D05", "technical", "粉じん、騒音、振動、近隣対応、重機・車両の安全管理は標準化されていますか。", 2, [option(0, "問題発生後に対応"), option(1, "現場責任者任せ"), option(2, "基本ルールのみ"), option(3, "事前説明と点検を実施"), option(4, "苦情・事故記録を再発防止へ反映")])
];

const PAINTING_QUESTIONS: DiagnosisV2Question[] = [
  question("PA01", "sales", "問い合わせ経路、広告費、現地調査数、見積提出数、成約数を把握していますか。", 2, [option(0, "把握していない"), option(1, "問い合わせ件数のみ"), option(2, "一部を記録"), option(3, "成約率まで管理"), option(4, "集客経路別の利益まで把握")]),
  question("PA02", "profit", "足場費、塗料費、副資材費、人工、外注費を案件別に見積・管理していますか。", 3, [option(0, "総額だけで判断"), option(1, "主要原価のみ概算"), option(2, "案件により明細化"), option(3, "原則として案件別予算を作成"), option(4, "実績原価と完成粗利益まで管理")]),
  question("PA03", "technical", "天候、職人配置、現場移動、乾燥時間等を考慮して稼働率を管理していますか。", 2, [option(0, "管理していない"), option(1, "社長の感覚のみ"), option(2, "予定表のみ"), option(3, "職人・現場別に管理"), option(4, "空き日・遅延・粗利益まで予測")]),
  question("PA04", "technical", "下地処理、塗布量、工程写真、完了検査、保証、手直しを管理していますか。", 3, [option(0, "職人任せ"), option(1, "問題時のみ確認"), option(2, "主要工程のみ写真保存"), option(3, "標準工程と完了検査あり"), option(4, "保証・手直し原因を改善へ反映")]),
  question("PA05", "sales", "完工後の点検、口コミ、紹介、再塗装時期の顧客管理を行っていますか。", 2, [option(0, "売って終わり"), option(1, "問題時のみ連絡"), option(2, "一部顧客へ連絡"), option(3, "定期案内・紹介依頼あり"), option(4, "紹介率・再受注率を管理")])
];

const RENOVATION_QUESTIONS: DiagnosisV2Question[] = [
  question("R01", "sales", "問い合わせ、現地調査、見積提出、成約までの件数と成約率を管理していますか。", 2, [option(0, "管理していない"), option(1, "案件一覧のみ"), option(2, "一部記録"), option(3, "成約率まで管理"), option(4, "流入経路別の利益まで管理")]),
  question("R02", "profit", "工事範囲、含まない工事、既存部分の不確定要素、追加変更条件を契約前に明確にしていますか。", 3, [option(0, "口頭説明が中心"), option(1, "見積書だけで対応"), option(2, "主要条件のみ記載"), option(3, "契約・仕様・追加条件を明記"), option(4, "写真・確認書・承認履歴まで保存")]),
  question("R03", "technical", "複数工種の工程、職人、材料、現場管理を一元的に調整していますか。", 3, [option(0, "現場任せ"), option(1, "電話・口頭中心"), option(2, "工程表のみ"), option(3, "担当者・工程・発注を管理"), option(4, "遅延・原価・顧客連絡まで連動")]),
  question("R04", "profit", "案件ごとの外注費、材料費、追加工事、入金時期、完成粗利益を把握していますか。", 2, [option(0, "完工後も不明"), option(1, "入出金だけ確認"), option(2, "主要原価のみ"), option(3, "案件別に管理"), option(4, "進行中に完成利益を予測")]),
  question("R05", "technical", "引渡し検査、クレーム、手直し、保証、顧客対応履歴を管理していますか。", 2, [option(0, "担当者任せ"), option(1, "問題が起きた時だけ記録"), option(2, "一部保存"), option(3, "案件単位で管理"), option(4, "原因分析を見積・施工へ反映")])
];

const SCAFFOLD_QUESTIONS: DiagnosisV2Question[] = [
  question("SC01", "control", "足場材、部材、車両、工具の数量・所在・破損・貸出を管理していますか。", 3, [option(0, "数量・所在が不明"), option(1, "台帳と現物が合わない"), option(2, "棚卸時のみ確認"), option(3, "現場への搬出入を記録"), option(4, "紛失・破損・稼働率まで管理")]),
  question("SC02", "profit", "面積、高さ、形状、運搬距離、人員、組立解体回数、追加対応を見積へ反映していますか。", 3, [option(0, "坪単価等だけで判断"), option(1, "主要条件のみ"), option(2, "案件ごとにばらつく"), option(3, "標準見積基準あり"), option(4, "実績人工・運搬費を次回見積へ反映")]),
  question("SC03", "technical", "資格、作業手順、点検、墜落防止、使用前確認等の安全管理を実施していますか。", 3, [option(0, "重大な未整備がある"), option(1, "現場責任者の経験に依存"), option(2, "最低限対応"), option(3, "記録・教育・点検あり"), option(4, "事故・ヒヤリハットを再発防止へ反映")], true),
  question("SC04", "technical", "現場ごとの必要人数、移動、組立・解体時間、空き日程を管理していますか。", 2, [option(0, "管理していない"), option(1, "社長の記憶のみ"), option(2, "予定表のみ"), option(3, "人員と現場を一覧管理"), option(4, "稼働率・残業・利益まで把握")]),
  question("SC05", "sales", "特定元請への依存、支払条件、急な工程変更、キャンセルリスクを管理していますか。", 2, [option(0, "特定元請へ大きく依存"), option(1, "依存度・条件を把握していない"), option(2, "把握のみ"), option(3, "取引先分散と条件管理を実施"), option(4, "採算・回収・稼働率で受注判断")])
];

const INTERIOR_QUESTIONS: DiagnosisV2Question[] = [
  question("IN01", "profit", "㎡単価だけでなく、人工、移動時間、材料、下地処理、養生、廃材を案件別に計算していますか。", 3, [option(0, "㎡単価だけで判断"), option(1, "主要費用のみ概算"), option(2, "案件により明細化"), option(3, "案件別に予定利益を算出"), option(4, "実績人工・材料ロスを次回へ反映")]),
  question("IN02", "technical", "職人ごとの施工量、品質、手直し、現場条件を把握していますか。", 2, [option(0, "把握していない"), option(1, "社長の感覚のみ"), option(2, "問題時のみ確認"), option(3, "施工量と品質を管理"), option(4, "配置・単価・教育へ反映")]),
  question("IN03", "sales", "工務店、リフォーム会社、管理会社等の特定元請への依存度を把握していますか。", 2, [option(0, "1社へ大きく依存"), option(1, "依存度を把握していない"), option(2, "把握のみ"), option(3, "取引先を分散"), option(4, "単価・支払条件・利益で取引を選別")]),
  question("IN04", "profit", "材料ロス、追加下地処理、現場待機、工程変更等を追加費用へ反映できますか。", 2, [option(0, "ほとんど請求できない"), option(1, "口頭交渉のみ"), option(2, "案件により対応"), option(3, "条件を事前明記"), option(4, "証拠・承認・請求まで標準化")]),
  question("IN05", "technical", "完了検査、汚れ・傷、ジョイント、浮き、手直し等を管理していますか。", 2, [option(0, "職人任せ"), option(1, "クレーム後に対応"), option(2, "主要現場のみ確認"), option(3, "完了検査を実施"), option(4, "手直し原因を教育・見積へ反映")])
];

const GENERIC_OPTIONS: DiagnosisV2Option[] = [
  option(0, "未整備で把握できていない"),
  option(1, "担当者の経験や感覚に依存"),
  option(2, "一部の案件・項目で実施"),
  option(3, "原則として標準化し記録"),
  option(4, "実績を分析し継続改善へ反映")
];

const COMMON_SPECIALTY_QUESTIONS: DiagnosisV2Question[] = [
  question("SP01", "profit", "材料費、人工、外注費、機械・車両費を案件別に見積・管理していますか。", 3, GENERIC_OPTIONS),
  question("SP02", "technical", "現場・職人ごとの生産性、品質、手直しを把握していますか。", 2, GENERIC_OPTIONS),
  question("SP03", "sales", "特定顧客・元請への依存度と取引条件を把握していますか。", 2, GENERIC_OPTIONS),
  question("SP04", "organization", "受注量に対する人員・資格者・協力会社の余力を把握していますか。", 2, GENERIC_OPTIONS),
  question("SP05", "control", "業種固有の法令、安全、設備、資産、記録を案件単位で管理していますか。", 2, GENERIC_OPTIONS)
];

export const ALL_SPECIALTY_QUESTIONS = [
  ...DEMOLITION_QUESTIONS,
  ...PAINTING_QUESTIONS,
  ...RENOVATION_QUESTIONS,
  ...SCAFFOLD_QUESTIONS,
  ...INTERIOR_QUESTIONS,
  ...COMMON_SPECIALTY_QUESTIONS
];

const SPECIALTY_QUESTIONS_BY_TRADE: Partial<Record<PrimaryTrade, DiagnosisV2Question[]>> = {
  demolition: DEMOLITION_QUESTIONS,
  painting: PAINTING_QUESTIONS,
  renovation: RENOVATION_QUESTIONS,
  scaffold: SCAFFOLD_QUESTIONS,
  interior: INTERIOR_QUESTIONS
};

const KPI_BY_TRADE: Record<string, string[]> = {
  demolition: ["見積原価と実績原価", "処分費・運搬費", "追加工事請求額", "重機・車両稼働率", "事故・苦情・手直し件数"],
  painting: ["問い合わせ数", "現地調査数", "見積成約率", "1件当たり粗利益", "職人稼働率", "手直し率", "紹介・再受注率"],
  renovation: ["問い合わせから成約までの率", "案件別粗利益", "追加工事請求額", "工程遅延件数", "クレーム・手直し率", "入金までの日数"],
  scaffold: ["足場材稼働率", "紛失・破損額", "1現場当たり人工", "車両・運搬費", "職人稼働率", "元請依存度", "事故・ヒヤリハット件数"],
  interior: ["1日当たり施工量", "1日当たり粗利益", "材料ロス率", "現場待機時間", "手直し率", "元請依存度"],
  common: ["案件別粗利益", "職人・現場別生産性", "主要顧客依存度", "資格者・協力会社余力", "事故・手直し件数"]
};

const ACTION_BY_QUESTION: Record<string, string> = {
  D01: "建物構造、残置物、処分量、運搬、重機、人工を分けた標準見積表を作成する。",
  D02: "着工前調査の確認表を作り、石綿・有害物・埋設物・近隣条件の証拠を案件ごとに保存する。",
  D03: "追加廃棄物や地中障害物の承認・証拠・請求手順を契約前に定める。",
  D04: "搬出先、数量、処分記録、マニフェストを案件番号で一元管理する。",
  D05: "粉じん、騒音、振動、近隣対応、安全点検の標準手順を運用する。",
  PA01: "問い合わせ、現地調査、見積提出、成約を集客経路別に記録し、月次で成約率と成約単価を確認する。",
  PA02: "足場費、塗料費、副資材費、人工、外注費を分けた案件別予算表を作る。",
  PA03: "天候、移動、乾燥時間を含む職人・現場別の稼働予定表を作る。",
  PA04: "下地処理、塗布量、工程写真、完了検査の標準記録を整える。",
  PA05: "完工顧客へ点検・口コミ・紹介・再塗装時期を案内する顧客台帳を作る。",
  R01: "問い合わせから現地調査、見積、成約までを流入経路別に記録する。",
  R02: "見積に含む範囲、含まない範囲、追加工事の承認方法を契約書または確認書へ明記する。",
  R03: "複数工種の担当、工程、材料発注、顧客連絡を一つの工程表で管理する。",
  R04: "外注費、材料費、追加工事、入金時期、完成粗利益を案件別に更新する。",
  R05: "引渡し検査、クレーム、手直し、保証対応を案件単位で記録する。",
  SC01: "足場材と部材へ管理番号を付け、現場ごとの搬出・返却・破損・紛失を記録する。",
  SC02: "面積、高さ、形状、運搬距離、人員を含む標準見積基準を作る。",
  SC03: "資格、作業手順、墜落防止、使用前点検を記録し、安全管理の不足を最優先で是正する。",
  SC04: "現場別の必要人数、移動、組立・解体時間、空き日程を一覧化する。",
  SC05: "元請別の売上依存度、単価、支払条件、変更・キャンセルを月次確認する。",
  IN01: "㎡単価だけでなく、人工、移動、下地処理、材料ロスを含む案件別利益表を作成する。",
  IN02: "職人別の施工量、品質、手直しを記録し、配置と教育へ反映する。",
  IN03: "元請別の売上、単価、支払条件、粗利益を一覧化する。",
  IN04: "下地処理、待機、工程変更の追加費用条件と承認方法を事前明記する。",
  IN05: "汚れ、傷、ジョイント、浮きを確認する完了検査表を運用する。",
  SP01: "材料、人工、外注、機械・車両費を分けた案件別原価表を作る。",
  SP02: "現場・職人別の施工量、品質、手直しを記録する。",
  SP03: "主要顧客・元請別の売上依存度と取引条件を確認する。",
  SP04: "受注見込みに対する人員、資格者、協力会社の余力を一覧化する。",
  SP05: "業種固有の法令、安全、設備、資産、記録を案件番号で管理する。"
};

export function normalizePrimaryTrade(value: string | null | undefined): PrimaryTrade {
  return PRIMARY_TRADE_OPTIONS.some((option) => option.value === value) ? value as PrimaryTrade : "other_specialty";
}

export function normalizePublicWorkIntent(value: string | null | undefined): PublicWorkIntent {
  return PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === value) ? value as PublicWorkIntent : "unknown";
}

export function getPrimaryTradeLabel(value: string | null | undefined) {
  const trade = normalizePrimaryTrade(value);
  return PRIMARY_TRADE_OPTIONS.find((option) => option.value === trade)?.label ?? "その他専門工事";
}

export function getOrderModelLabel(value: string) {
  return ORDER_MODEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getPublicWorkIntentLabel(value: string | null | undefined) {
  const intent = normalizePublicWorkIntent(value);
  return PUBLIC_WORK_INTENT_OPTIONS.find((option) => option.value === intent)?.label ?? "分からない";
}

export function getPublicWorksScoringMode(intentValue: string | null | undefined): PublicWorksScoringMode {
  const intent = normalizePublicWorkIntent(intentValue);
  if (intent === "participating" || intent === "expand_within_year") return "included";
  if (intent === "not_interested") return "excluded";
  return "reference";
}

export function getSpecialtyQuestions(primaryTrade: string | null | undefined) {
  const trade = normalizePrimaryTrade(primaryTrade);
  return SPECIALTY_QUESTIONS_BY_TRADE[trade] ?? COMMON_SPECIALTY_QUESTIONS;
}

export function getSpecialtyQuestionLabel(questionId: string, value: string | undefined) {
  const question = ALL_SPECIALTY_QUESTIONS.find((candidate) => candidate.id === questionId);
  return question?.options.find((option) => option.value === value)?.label ?? value ?? "未回答";
}

export function buildSpecialtyDiagnosisSummary(
  primaryTradeValue: string | null | undefined,
  answers: DiagnosisV2AnswerMap
): SpecialtyDiagnosisSummary {
  const trade = normalizePrimaryTrade(primaryTradeValue);
  const questions = getSpecialtyQuestions(trade);
  const scored = questions.map((item) => ({
    question: item,
    score: item.options.find((option) => option.value === answers[item.id])?.score ?? 0
  }));
  const earned = scored.reduce((sum, item) => sum + item.score * item.question.weight, 0);
  const maximum = questions.reduce((sum, item) => sum + item.weight * 4, 0);
  const score = Math.round((earned / maximum) * 1000) / 10;
  const strengths = scored
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || b.question.weight - a.question.weight)
    .slice(0, 3)
    .map((item) => `${item.question.id}: ${item.question.question}`);
  const priorities = scored
    .filter((item) => item.score <= 2)
    .sort((a, b) => a.score - b.score || b.question.weight - a.question.weight)
    .slice(0, 3)
    .map((item) => `${item.question.id}: ${item.question.question}`);
  const plan90Days = scored
    .filter((item) => item.score <= 2)
    .sort((a, b) => a.score - b.score || b.question.weight - a.question.weight)
    .map((item) => ACTION_BY_QUESTION[item.question.id])
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);

  return {
    trade,
    tradeLabel: getPrimaryTradeLabel(trade),
    score,
    strengths: strengths.length > 0 ? strengths : ["現時点では、業態固有の強みを断定せず、回答内容の記録を継続してください。"],
    priorities: priorities.length > 0 ? priorities : ["重大な低評価項目はありません。標準化した運用を継続してください。"],
    kpis: KPI_BY_TRADE[trade] ?? KPI_BY_TRADE.common,
    plan90Days: plan90Days.length > 0 ? plan90Days : ["業態別KPIを月次で確認し、見積・施工・顧客対応へ反映する。"]
  };
}
