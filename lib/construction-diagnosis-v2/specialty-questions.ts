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
  { value: "private_prime", label: "法人のお客様から直接受ける工事" },
  { value: "subcontract", label: "建設会社・工務店などから受ける工事" },
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
  question("D01", "profit", "見積もりで、処分代、運搬代、重機代、職人代などを分けて計算していますか。", 3, [option(0, "合計金額を感覚で決める"), option(1, "大きな費用だけ計算"), option(2, "工事によって分けて計算"), option(3, "ほとんどの工事で費用ごとに計算"), option(4, "実際にかかった費用を次の見積もりに使う")]),
  question("D02", "technical", "工事前に、アスベスト、地中に埋まった物、近所への影響などを確認していますか。", 3, [option(0, "ほとんど確認しない"), option(1, "担当者の経験だけで確認"), option(2, "主な項目だけ確認"), option(3, "確認表と写真を残す"), option(4, "法律、追加費用、工事計画にも反映")], true),
  question("D03", "profit", "追加のゴミや地中の障害物が見つかった時、追加料金を請求できますか。", 2, [option(0, "ほとんど請求できない"), option(1, "口頭で相談するだけ"), option(2, "工事によって請求"), option(3, "契約条件と写真を用意"), option(4, "工事前の説明から追加請求まで同じ手順で行う")]),
  question("D04", "control", "ゴミをどこへ、どれだけ運んだかを、工事ごとに記録していますか。", 3, [option(0, "記録できていない"), option(1, "紙が別々の場所にある"), option(2, "大きな工事だけ整理"), option(3, "工事ごとに保存"), option(4, "請求、費用、法律上の書類までまとめて管理")], true),
  question("D05", "technical", "ほこり、騒音、振動、近所への説明、重機や車の安全確認を同じ手順で行っていますか。", 2, [option(0, "問題が起きてから対応"), option(1, "現場責任者に任せる"), option(2, "基本の決まりだけある"), option(3, "事前説明と点検を行う"), option(4, "苦情や事故の記録を次の工事に生かす")])
];

const PAINTING_QUESTIONS: DiagnosisV2Question[] = [
  question("PA01", "sales", "問い合わせ、現地確認、見積もり、契約がそれぞれ何件あったか分かりますか。", 2, [option(0, "分からない"), option(1, "問い合わせ件数だけ分かる"), option(2, "一部を記録"), option(3, "見積もりから契約になった割合まで分かる"), option(4, "広告や紹介ごとに残る利益まで分かる")]),
  question("PA02", "profit", "足場代、塗料代、その他の材料代、職人代、外注費を工事ごとに計算していますか。", 3, [option(0, "合計金額だけで決める"), option(1, "大きな費用だけ計算"), option(2, "工事によって分けて計算"), option(3, "工事ごとに費用の予定を作る"), option(4, "実際の費用と完成時の利益まで確認")]),
  question("PA03", "technical", "天気、職人の予定、移動、塗料が乾く時間を考えて仕事の予定を組んでいますか。", 2, [option(0, "管理していない"), option(1, "社長の感覚だけ"), option(2, "予定表だけある"), option(3, "職人と現場ごとに管理"), option(4, "空き日、遅れ、残る利益まで予測")]),
  question("PA04", "technical", "塗る前の準備、作業写真、仕上がり確認、保証、手直しを記録していますか。", 3, [option(0, "職人に任せる"), option(1, "問題が起きた時だけ確認"), option(2, "主な作業だけ写真を残す"), option(3, "決めた手順と完成確認がある"), option(4, "保証や手直しの原因を次の工事に生かす")]),
  question("PA05", "sales", "工事後もお客様へ連絡し、紹介や次の塗り替えにつなげていますか。", 2, [option(0, "工事が終われば連絡しない"), option(1, "問題がある時だけ連絡"), option(2, "一部のお客様へ連絡"), option(3, "定期案内や紹介のお願いをする"), option(4, "紹介と再注文の件数も確認")])
];

const RENOVATION_QUESTIONS: DiagnosisV2Question[] = [
  question("R01", "sales", "問い合わせ、現地確認、見積もり、契約がそれぞれ何件あったか分かりますか。", 2, [option(0, "分からない"), option(1, "仕事名の一覧だけ"), option(2, "一部を記録"), option(3, "見積もりから契約になった割合まで分かる"), option(4, "広告や紹介ごとに残る利益まで分かる")]),
  question("R02", "profit", "見積もりに入る工事、入らない工事、追加料金になる場合を、契約前に説明していますか。", 3, [option(0, "口頭での説明が中心"), option(1, "見積書だけで説明"), option(2, "主な条件だけ書く"), option(3, "工事内容と追加条件を契約書に書く"), option(4, "写真、確認書、承認した記録まで保存")]),
  question("R03", "technical", "大工、電気、水道など、複数の職人の予定と材料をまとめて管理していますか。", 3, [option(0, "現場に任せる"), option(1, "電話と口頭が中心"), option(2, "日程表だけ"), option(3, "担当者、日程、材料注文を管理"), option(4, "遅れ、費用、お客様への連絡も一緒に管理")]),
  question("R04", "profit", "外注費、材料代、追加工事、入金時期を含め、完成時にいくら利益が残るか分かりますか。", 2, [option(0, "完成後も分からない"), option(1, "入ったお金と払ったお金だけ確認"), option(2, "大きな費用だけ確認"), option(3, "工事ごとに管理"), option(4, "工事中から完成時の利益を予測")]),
  question("R05", "technical", "完成確認、お客様からの苦情、手直し、保証の対応を記録していますか。", 2, [option(0, "担当者に任せる"), option(1, "問題が起きた時だけ記録"), option(2, "一部だけ保存"), option(3, "工事ごとに管理"), option(4, "原因を次の見積もりと工事に生かす")])
];

const SCAFFOLD_QUESTIONS: DiagnosisV2Question[] = [
  question("SC01", "control", "足場材、部品、車、工具が、どの現場にいくつあるか管理していますか。", 3, [option(0, "数も場所も分からない"), option(1, "一覧と実物が合わない"), option(2, "年に数回だけ確認"), option(3, "現場への持ち出しと返却を記録"), option(4, "紛失、破損、使用状況まで管理")]),
  question("SC02", "profit", "足場の広さ、高さ、形、運ぶ距離、必要人数、組立回数を見積もりに入れていますか。", 3, [option(0, "広さだけで決める"), option(1, "主な条件だけ入れる"), option(2, "工事によって計算方法が違う"), option(3, "共通の見積もり基準がある"), option(4, "実際の職人代と運搬代を次の見積もりに使う")]),
  question("SC03", "technical", "資格、安全な作業手順、作業前の点検、落下防止を行い、記録していますか。", 3, [option(0, "大きな問題がある"), option(1, "現場責任者の経験だけに頼る"), option(2, "最低限だけ対応"), option(3, "記録、教育、点検を行う"), option(4, "小さな事故も記録し、次の安全対策に使う")], true),
  question("SC04", "technical", "現場ごとの必要人数、移動、組立と解体の時間、空き日を管理していますか。", 2, [option(0, "管理していない"), option(1, "社長の記憶だけ"), option(2, "予定表だけ"), option(3, "職人と現場を一覧で管理"), option(4, "仕事に入っている日、残業、利益まで分かる")]),
  question("SC05", "sales", "売上が1社に偏りすぎていないか、支払い条件や急な変更も確認していますか。", 2, [option(0, "1社に大きく偏っている"), option(1, "偏りも条件も分からない"), option(2, "分かっているが対策していない"), option(3, "取引先を増やし、条件も確認"), option(4, "利益、入金、職人の予定で仕事を受けるか決める")])
];

const INTERIOR_QUESTIONS: DiagnosisV2Question[] = [
  question("IN01", "profit", "1平方メートル当たりの金額だけでなく、職人の日数、移動、材料、下地を直す費用まで計算していますか。", 3, [option(0, "広さだけで金額を決める"), option(1, "大きな費用だけ計算"), option(2, "工事によって分けて計算"), option(3, "工事ごとに残る利益を計算"), option(4, "実際の職人代と材料の無駄を次の見積もりに使う")]),
  question("IN02", "technical", "職人ごとの作業量、仕上がり、手直しの多さを分かっていますか。", 2, [option(0, "分からない"), option(1, "社長の感覚だけ"), option(2, "問題が起きた時だけ確認"), option(3, "作業量と仕上がりを記録"), option(4, "職人の配置、金額、教育に使う")]),
  question("IN03", "sales", "売上が特定の工務店や管理会社に偏りすぎていないか分かっていますか。", 2, [option(0, "1社に大きく偏っている"), option(1, "どれだけ偏っているか分からない"), option(2, "分かっているが対策していない"), option(3, "取引先を増やしている"), option(4, "金額、支払い条件、利益を見て取引先を選ぶ")]),
  question("IN04", "profit", "材料の無駄、追加の下地処理、現場での待ち時間が出た時、追加料金を請求できますか。", 2, [option(0, "ほとんど請求できない"), option(1, "口頭で相談するだけ"), option(2, "工事によって対応"), option(3, "追加料金になる条件を事前に書く"), option(4, "写真、確認、請求まで同じ手順で行う")]),
  question("IN05", "technical", "完成時に、汚れ、傷、つなぎ目、浮き、手直しを確認していますか。", 2, [option(0, "職人に任せる"), option(1, "苦情が出てから対応"), option(2, "大きな現場だけ確認"), option(3, "完成確認を行う"), option(4, "手直しの原因を教育と見積もりに生かす")])
];

const GENERIC_OPTIONS: DiagnosisV2Option[] = [
  option(0, "決まりがなく、分からない"),
  option(1, "担当者の経験や感覚に頼っている"),
  option(2, "一部の工事だけ行っている"),
  option(3, "ほとんどの工事で同じ手順を使い、記録している"),
  option(4, "記録を確認し、やり方を良くしている")
];

const COMMON_SPECIALTY_QUESTIONS: DiagnosisV2Question[] = [
  question("SP01", "profit", "材料代、職人代、外注費、機械や車の費用を、工事ごとに計算していますか。", 3, GENERIC_OPTIONS),
  question("SP02", "technical", "現場や職人ごとの作業量、仕上がり、手直しの多さを分かっていますか。", 2, GENERIC_OPTIONS),
  question("SP03", "sales", "売上が特定の取引先に偏りすぎていないか、支払い条件も含めて確認していますか。", 2, GENERIC_OPTIONS),
  question("SP04", "organization", "仕事量に対して、職人、資格を持つ人、協力会社が足りているか分かっていますか。", 2, GENERIC_OPTIONS),
  question("SP05", "control", "その工事に必要な法律、安全、道具、記録を、工事ごとに管理していますか。", 2, GENERIC_OPTIONS)
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
  demolition: ["見積もり時の費用と実際の費用", "処分代と運搬代", "追加工事の請求額", "重機と車を使った日数", "事故、苦情、手直しの件数"],
  painting: ["問い合わせ数", "現地確認数", "見積もりから契約になった割合", "1件ごとに残る利益", "職人が仕事に入った日数", "手直しの割合", "紹介と再注文の割合"],
  renovation: ["問い合わせから契約になった割合", "工事ごとに残る利益", "追加工事の請求額", "工事が遅れた件数", "苦情と手直しの割合", "入金までの日数"],
  scaffold: ["足場材を使った日数", "紛失と破損の金額", "1現場に必要な職人の日数", "車と運搬の費用", "職人が仕事に入った日数", "一番大きい取引先への売上の偏り", "事故と小さな危険の件数"],
  interior: ["1日にできた作業量", "1日ごとに残る利益", "無駄になった材料の割合", "現場で待った時間", "手直しの割合", "一番大きい取引先への売上の偏り"],
  common: ["工事ごとに残る利益", "職人と現場ごとの作業量", "一番大きい取引先への売上の偏り", "資格を持つ人と協力会社の余裕", "事故と手直しの件数"]
};

const ACTION_BY_QUESTION: Record<string, string> = {
  D01: "建物の種類、残っている物、ゴミの量、運搬、重機、職人代を分けた見積表を作る。",
  D02: "工事前の確認表を作り、アスベスト、危険な物、地中の物、近所への影響を写真と一緒に保存する。",
  D03: "追加廃棄物や地中障害物の承認・証拠・請求手順を契約前に定める。",
  D04: "ゴミを運んだ場所、量、正しく処分したことを示す書類を、工事番号ごとにまとめる。",
  D05: "粉じん、騒音、振動、近隣対応、安全点検の標準手順を運用する。",
  PA01: "問い合わせ、現地確認、見積もり、契約を、広告や紹介ごとに記録し、毎月確認する。",
  PA02: "足場代、塗料代、その他の材料代、職人代、外注費を分けた工事ごとの表を作る。",
  PA03: "天候、移動、乾燥時間を含む職人・現場別の稼働予定表を作る。",
  PA04: "塗る前の準備、塗料の量、作業写真、完成確認を同じ方法で記録する。",
  PA05: "工事後のお客様へ、点検、口コミ、紹介、次の塗り替え時期を案内する一覧を作る。",
  R01: "問い合わせから現地確認、見積もり、契約までを、広告や紹介ごとに記録する。",
  R02: "見積に含む範囲、含まない範囲、追加工事の承認方法を契約書または確認書へ明記する。",
  R03: "複数の職人の担当、日程、材料注文、お客様への連絡を一つの表で管理する。",
  R04: "外注費、材料代、追加工事、入金時期、完成時に残る利益を工事ごとに更新する。",
  R05: "引渡し検査、クレーム、手直し、保証対応を案件単位で記録する。",
  SC01: "足場材と部品に番号を付け、現場への持ち出し、返却、破損、紛失を記録する。",
  SC02: "面積、高さ、形状、運搬距離、人員を含む標準見積基準を作る。",
  SC03: "資格、作業手順、落下防止、作業前点検を記録し、安全上の不足を最初に直す。",
  SC04: "現場別の必要人数、移動、組立・解体時間、空き日程を一覧化する。",
  SC05: "取引先ごとの売上の偏り、金額、支払い条件、変更や中止を毎月確認する。",
  IN01: "広さだけで決めず、職人代、移動、下地を直す費用、無駄になった材料を含む利益表を作る。",
  IN02: "職人別の施工量、品質、手直しを記録し、配置と教育へ反映する。",
  IN03: "取引先ごとの売上、金額、支払い条件、残る利益を一覧にする。",
  IN04: "下地処理、待機、工程変更の追加費用条件と承認方法を事前明記する。",
  IN05: "汚れ、傷、ジョイント、浮きを確認する完了検査表を運用する。",
  SP01: "材料代、職人代、外注費、機械や車の費用を分けた工事ごとの表を作る。",
  SP02: "現場・職人別の施工量、品質、手直しを記録する。",
  SP03: "主な取引先ごとの売上の偏りと支払い条件を確認する。",
  SP04: "これから入りそうな仕事に対して、職人、資格を持つ人、協力会社が足りるか一覧にする。",
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
    strengths: strengths.length > 0 ? strengths : ["今の回答だけでは、この工事業種の強みを決められません。記録を続けて確認しましょう。"],
    priorities: priorities.length > 0 ? priorities : ["特に急いで直す項目はありません。今のやり方を続けてください。"],
    kpis: KPI_BY_TRADE[trade] ?? KPI_BY_TRADE.common,
    plan90Days: plan90Days.length > 0 ? plan90Days : ["この工事業種で毎月確認する数字を決め、見積もり、工事、お客様対応に生かす。"]
  };
}
