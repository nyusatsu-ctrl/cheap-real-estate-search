import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_V2_SECTIONS,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2Option,
  type DiagnosisV2SectionId
} from "./questions.ts";
import { getShortDiagnosisQuestions } from "./short-questions.ts";
import {
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel,
  type PrimaryTrade,
  type PublicWorkIntent
} from "./specialty-questions.ts";

export type StrategyQuestion = {
  id: string;
  question: string;
  options: DiagnosisV2Option[];
  section: DiagnosisV2SectionId | "strategy";
};

export type StrategySelection = {
  questionIds: string[];
  reasons: Record<string, string>;
  lowScoreSections: DiagnosisV2SectionId[];
  criticalSections: DiagnosisV2SectionId[];
};

export type GrowthStrategyResult = {
  conclusion: { firstAction: string; priority: string; potential: string };
  strengths: string[];
  blockers: string[];
  workPriorities: { growth: string[]; maintain: string[]; review: string[] };
  actions30Days: string[];
  plan90Days: { month1: string[]; month2: string[]; month3: string[] };
  monthlyMetrics: string[];
  publicWorks: null | {
    currentState: string;
    prerequisites: string[];
    expansionPotential: string;
    selfService: string[];
    professionalSupport: string[];
  };
  supportJudgment:
    | "現在は自社対応可能"
    | "一部だけ専門支援を検討"
    | "体制整備をまとめて相談する価値がある"
    | "成長施策より先に会社のお金や管理を整える必要がある"
    | "現時点では情報不足";
  evidence: string[];
};

const choice = (value: string, label: string, score = 2): DiagnosisV2Option => ({ value, label, score });

export const COMMON_STRATEGY_QUESTIONS: StrategyQuestion[] = [
  {
    id: "RS01",
    section: "strategy",
    question: "今後、最も増やしたい仕事はどれですか。",
    options: [
      choice("main", "現在の主力工事を増やしたい"), choice("high_profit", "利益が多く残る工事を増やしたい"),
      choice("consumer", "個人のお客様からの直接受注を増やしたい"), choice("corporate", "法人から直接受ける仕事を増やしたい"),
      choice("subcontract", "下請の仕事を増やしたい"), choice("public", "公共工事を増やしたい"),
      choice("recurring", "修理、点検、管理などの継続的な仕事を増やしたい"), choice("undecided", "まだ決めていない", 1), choice("other", "その他", 1)
    ]
  },
  {
    id: "RS02",
    section: "strategy",
    question: "現在、最も利益が残っている仕事はどれですか。",
    options: [
      choice("main", "主力工事"), choice("small", "小規模な工事"), choice("large", "大型工事"), choice("consumer", "個人のお客様から直接受ける工事"),
      choice("corporate", "法人から直接受ける工事"), choice("subcontract", "下請工事"), choice("public", "公共工事"), choice("recurring", "修理、点検、管理等"),
      choice("unknown", "どの仕事が一番利益が残るか分からない", 0), choice("other", "その他", 1)
    ]
  },
  {
    id: "RS03",
    section: "strategy",
    question: "現在、利益が残りにくい、または負担が大きい仕事はどれですか。",
    options: [
      choice("materials", "材料代が多い工事"), choice("outsourcing", "外注費が多い工事"), choice("labor", "職人の日数が多くかかる工事"),
      choice("extras", "追加工事を請求しにくい工事"), choice("rework", "手直しやクレームが多い工事"), choice("slow_payment", "入金まで時間がかかる工事"),
      choice("client", "特定の取引先から受ける工事"), choice("public", "公共工事"), choice("none", "特にない", 4), choice("unknown", "どの仕事か分からない", 0), choice("other", "その他", 1)
    ]
  },
  {
    id: "RS04",
    section: "strategy",
    question: "会社を伸ばすうえで、現在最も困っていることは何ですか。",
    options: [
      choice("inquiries", "仕事の問い合わせが少ない"), choice("conversion", "見積もりを出しても契約にならない"), choice("profit", "売上はあるが利益が残らない"),
      choice("qualified_people", "職人や資格を持つ人が足りない"), choice("partners", "協力会社が足りない"), choice("cash", "会社のお金が足りない"),
      choice("owner_busy", "社長が忙しすぎる"), choice("documents", "書類や請求の管理ができていない"), choice("rework", "手直しやクレームが多い"),
      choice("public", "公共工事へ進む方法が分からない"), choice("unknown", "何が一番の問題か分からない", 0), choice("other", "その他", 1)
    ]
  },
  {
    id: "RS05",
    section: "strategy",
    question: "今後3か月で、新しい取り組みに使える人・時間・お金はどの程度ありますか。",
    options: [
      choice("none", "今はほとんど余裕がない", 0), choice("owner_1h", "社長が週に1～2時間ほど使える", 1), choice("owner_halfday", "社長が週に半日ほど使える", 2),
      choice("employee", "社員1人が一部担当できる", 3), choice("external", "外部の会社へ一部依頼できる", 3), choice("under_100k", "10万円未満なら使える", 2),
      choice("under_500k", "10万円以上50万円未満なら使える", 3), choice("over_500k", "50万円以上使える", 4), choice("unknown", "まだ分からない", 1)
    ]
  },
  {
    id: "RS06",
    section: "strategy",
    question: "1年後、会社をどのような状態にしたいですか。",
    options: [
      choice("sales", "売上を増やしたい"), choice("profit", "売上より利益を増やしたい"), choice("stable", "毎月安定して仕事がある状態にしたい"),
      choice("owner_independent", "社長が現場や細かい仕事から離れたい"), choice("hiring", "職人や社員を増やしたい"), choice("direct", "直接受注を増やしたい"),
      choice("clients", "取引先を増やしたい"), choice("public", "公共工事へ参加したい"), choice("public_expand", "公共工事の参加先を増やしたい"),
      choice("cash", "会社のお金を増やしたい"), choice("maintain", "今の規模を維持しながら安定させたい"), choice("undecided", "まだ決めていない", 1), choice("other", "その他", 1)
    ]
  }
];

const AXIS_CANDIDATES: Record<DiagnosisV2SectionId, string[]> = {
  finance: ["F03", "F04"],
  profit: ["P02", "P03"],
  sales: ["S02", "S04"],
  public_works: ["K01", "K02", "K03", "K04"],
  technical: ["T01", "T03"],
  organization: ["O01", "O02"],
  control: ["I01", "I02", "I03"],
  growth: ["G02", "O03"]
};

const DETAILED_BY_ID = new Map(DETAILED_DIAGNOSIS_QUESTIONS.map((question) => [question.id, question]));

export function selectGrowthStrategyQuestions(input: {
  axisScores: Partial<Record<DiagnosisV2SectionId, number>>;
  criticalFlags: string[];
  shortAnswers: DiagnosisV2AnswerMap;
  primaryTrade: PrimaryTrade;
  publicWorkIntent: PublicWorkIntent;
}): StrategySelection {
  const shortQuestions = getShortDiagnosisQuestions({ primaryTrade: input.primaryTrade, publicWorkIntent: input.publicWorkIntent });
  const criticalSections = unique(input.criticalFlags.flatMap((id) => {
    const section = shortQuestions.find((question) => question.id === id)?.section;
    return section ? [section] : [];
  }));
  const eligibleSections = DIAGNOSIS_V2_SECTIONS
    .map((section) => section.id)
    .filter((section) => section !== "public_works" || input.publicWorkIntent !== "not_interested");
  const ranked = eligibleSections.sort((left, right) => {
    const criticalDifference = Number(criticalSections.includes(right)) - Number(criticalSections.includes(left));
    if (criticalDifference !== 0) return criticalDifference;
    return (input.axisScores[left] ?? 50) - (input.axisScores[right] ?? 50);
  });
  const lowest = ranked[0];
  const second = ranked[1];
  const lowestScore = input.axisScores[lowest] ?? 50;
  const secondScore = input.axisScores[second] ?? 50;
  const oneClearWeakness = criticalSections.length === 1
    || (lowestScore <= 40 && secondScore - lowestScore >= 25 && ranked.slice(1).every((section) => (input.axisScores[section] ?? 50) >= 70));
  const targetSections = oneClearWeakness ? [lowest] : [lowest, second];
  const reasons: Record<string, string> = {};
  const chosenIds: string[] = [];
  for (const section of targetSections) {
    const ids = chooseAxisQuestions(section, input.publicWorkIntent, input.shortAnswers);
    for (const id of ids.slice(0, 2)) {
      if (chosenIds.includes(id)) continue;
      chosenIds.push(id);
      const label = DIAGNOSIS_V2_SECTIONS.find((candidate) => candidate.id === section)?.label ?? section;
      reasons[id] = criticalSections.includes(section)
        ? `${label}に重大な注意項目があるため優先して選択`
        : `${label}が低評価分野のため選択`;
    }
  }
  const fallbackSections = ranked.filter((section) => !targetSections.includes(section));
  while (chosenIds.length < 2 && fallbackSections.length > 0) {
    const section = fallbackSections.shift()!;
    for (const id of chooseAxisQuestions(section, input.publicWorkIntent, input.shortAnswers)) {
      if (chosenIds.includes(id)) continue;
      chosenIds.push(id);
      reasons[id] = "追加確認に必要な低評価分野の質問として選択";
      if (chosenIds.length >= 2) break;
    }
  }
  return {
    questionIds: [...COMMON_STRATEGY_QUESTIONS.map((question) => question.id), ...chosenIds.slice(0, 4)],
    reasons: Object.fromEntries([
      ...COMMON_STRATEGY_QUESTIONS.map((question) => [question.id, "全社共通の再成長戦略質問"]),
      ...Object.entries(reasons)
    ]),
    lowScoreSections: targetSections,
    criticalSections
  };
}

export function getStrategyQuestions(
  questionIds: string[],
  context?: { primaryTrade?: PrimaryTrade | null; publicWorkIntent?: PublicWorkIntent | null }
) {
  return questionIds.flatMap((id) => {
    const common = COMMON_STRATEGY_QUESTIONS.find((question) => question.id === id);
    if (common) {
      if (id !== "RS01" || !context) return [common];
      const options = common.options
        .filter((option) => context.publicWorkIntent !== "not_interested" || option.value !== "public")
        .map((option) => option.value === "main" && context.primaryTrade
          ? { ...option, label: `${getPrimaryTradeLabel(context.primaryTrade)}の仕事を増やしたい` }
          : option);
      return [{ ...common, options }];
    }
    const detailed = DETAILED_BY_ID.get(id);
    return detailed ? [{ id: detailed.id, question: detailed.question, options: detailed.options, section: detailed.section }] : [];
  });
}

export function getStrategyAnswerLabel(
  questionId: string,
  answer: string | undefined,
  context?: { primaryTrade?: PrimaryTrade | null; publicWorkIntent?: PublicWorkIntent | null }
) {
  const question = getStrategyQuestions([questionId], context)[0];
  return question?.options.find((option) => option.value === answer)?.label ?? "未回答";
}

export function buildGrowthStrategyResult(input: {
  answers: DiagnosisV2AnswerMap;
  questionIds: string[];
  axisScores: Partial<Record<DiagnosisV2SectionId, number>>;
  criticalFlags: string[];
  lowScoreSections: DiagnosisV2SectionId[];
  primaryTrade: PrimaryTrade;
  publicWorkIntent: PublicWorkIntent;
}): GrowthStrategyResult {
  const context = { primaryTrade: input.primaryTrade, publicWorkIntent: input.publicWorkIntent };
  const label = (id: string) => getStrategyAnswerLabel(id, input.answers[id], context);
  const selectedQuestions = getStrategyQuestions(input.questionIds, context);
  const lowFacts = selectedQuestions
    .filter((question) => question.section !== "strategy")
    .filter((question) => (question.options.find((option) => option.value === input.answers[question.id])?.score ?? 2) <= 1)
    .map((question) => `${question.question}への回答は「${label(question.id)}」でした。`);
  const sectionLabel = (section: DiagnosisV2SectionId) => DIAGNOSIS_V2_SECTIONS.find((item) => item.id === section)?.label ?? section;
  const lowest = input.lowScoreSections[0];
  const lowestLabel = lowest ? sectionLabel(lowest) : "経営状況";
  const effort = input.answers.RS05;
  const workUnknown = input.answers.RS02 === "unknown" || input.answers.RS03 === "unknown";
  const growthWork = input.answers.RS01 === "undecided" || input.answers.RS01 === "other"
    ? ["現在の回答だけでは増やす仕事を判断できません。工事ごとの利益を確認する必要があります。"]
    : [label("RS01")];
  const maintainWork = input.answers.RS02 === "unknown" || input.answers.RS02 === "other"
    ? ["現在の回答だけでは維持する仕事を判断できません。工事ごとの利益を確認する必要があります。"]
    : [label("RS02")];
  const reviewWork = input.answers.RS03 === "unknown" || input.answers.RS03 === "other"
    ? ["現在の回答だけでは見直す仕事を判断できません。工事ごとの利益を確認する必要があります。"]
    : input.answers.RS03 === "none" ? ["現時点で明確な見直し対象はありません。毎月の工事利益で再確認してください。"] : [label("RS03")];
  const metrics = monthlyMetrics(input.primaryTrade, input.answers.RS04, input.publicWorkIntent);
  const limitedCapacity = effort === "none" || effort === "owner_1h" || effort === "unknown";
  const financeOrControl = input.lowScoreSections.some((section) => section === "finance" || section === "control") || input.criticalFlags.length > 0;
  const supportJudgment: GrowthStrategyResult["supportJudgment"] = input.answers.RS04 === "unknown"
    ? "現時点では情報不足"
    : financeOrControl
      ? "成長施策より先に会社のお金や管理を整える必要がある"
      : input.criticalFlags.length > 0 || (input.axisScores[lowest] ?? 100) < 40
        ? "体制整備をまとめて相談する価値がある"
        : limitedCapacity
          ? "一部だけ専門支援を検討"
          : "現在は自社対応可能";
  const publicWorks = input.publicWorkIntent === "not_interested" ? null : {
    currentState: `${getPublicWorkIntentLabel(input.publicWorkIntent)}と回答しています。`,
    prerequisites: publicPrerequisites(input.questionIds, input.answers),
    expansionPotential: "現在の登録・資格・担当者を確認したうえで、参加先を増やせる可能性があります。受注は保証されません。",
    selfService: ["現在の許可・登録・更新期限を一覧にする", "参加したい発注機関と案件区分を整理する"],
    professionalSupport: ["許可や参加資格の判断が難しい場合は専門家へ確認する", "申請書類や体制の不足を個別に確認する"]
  };
  return {
    conclusion: {
      firstAction: `${lowestLabel}の回答事実を確認し、担当者と確認日を決めてください。`,
      priority: `${label("RS04")}が現在の最優先課題です。`,
      potential: `${getPrimaryTradeLabel(input.primaryTrade)}の仕事を、利益と実行余力を確認しながら選ぶことで、事業を伸ばせる可能性があります。`
    },
    strengths: strengthFacts(input.axisScores, input.answers, input.primaryTrade),
    blockers: [...lowFacts.slice(0, 2), `${label("RS04")}ことが、現在の成長を止めている主な要因です。`].slice(0, 3),
    workPriorities: { growth: growthWork, maintain: maintainWork, review: reviewWork },
    actions30Days: [
      `社長または経理担当が、${lowestLabel}の現状を今月中に一覧へまとめる。`,
      workUnknown ? "工事責任者が、直近5件の売上・材料代・外注費・職人代・追加請求を確認する。" : `営業担当が「${label("RS01")}」の候補案件を3件整理する。`,
      `担当者が、${metrics.slice(0, 3).join("、")}を毎月確認できる表を作る。`
    ],
    plan90Days: {
      month1: [`${lowestLabel}の事実と不足資料を確認する`, "増やす仕事・維持する仕事・見直す仕事を仮決定する"],
      month2: ["担当者と毎月の確認日を決める", limitedCapacity ? "無理なく実行できる施策を1つだけ始める" : "優先施策を小さく試す"],
      month3: ["実行前後の数字を比較する", "続ける施策、直す施策、止める施策を決める"]
    },
    monthlyMetrics: metrics,
    publicWorks,
    supportJudgment,
    evidence: [
      `最も増やしたい仕事: ${label("RS01")}`,
      `最も利益が残る仕事: ${label("RS02")}`,
      `負担が大きい仕事: ${label("RS03")}`,
      `現在最も困っていること: ${label("RS04")}`
    ]
  };
}

function chooseAxisQuestions(section: DiagnosisV2SectionId, intent: PublicWorkIntent, shortAnswers: DiagnosisV2AnswerMap) {
  let candidates = AXIS_CANDIDATES[section];
  if (section === "public_works") {
    candidates = intent === "participating" ? ["K03", "K04"] : intent === "expand_within_year" ? ["K01", "K02"] : ["K01", "K03"];
  }
  const inheritedIds = new Set<string>();
  const inheritedMap: Record<string, string> = { C03: "P01", C04: "P02", C05: "S04", C06: "O01", C08: "I03", PW01: "K02", PW03: "T01" };
  for (const [shortId, detailedId] of Object.entries(inheritedMap)) if (shortAnswers[shortId] !== undefined) inheritedIds.add(detailedId);
  const filtered = candidates.filter((id) => !inheritedIds.has(id));
  if (filtered.length >= 2) return filtered;
  const alternatives = DETAILED_DIAGNOSIS_QUESTIONS.filter((question) => question.section === section).map((question) => question.id);
  return unique([...filtered, ...alternatives.filter((id) => !inheritedIds.has(id))]);
}

function strengthFacts(
  scores: Partial<Record<DiagnosisV2SectionId, number>>,
  answers: DiagnosisV2AnswerMap,
  trade: PrimaryTrade
) {
  const strengths = DIAGNOSIS_V2_SECTIONS
    .flatMap((section) => scores[section.id] !== undefined ? [{ label: section.label, score: scores[section.id]! }] : [])
    .filter((item) => item.score >= 70)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => `${item.label}は${item.score.toFixed(1)}点で、現在の強みとして活用できる可能性があります。`);
  const evidence = [
    answers.RS02 && answers.RS02 !== "unknown" && answers.RS02 !== "other"
      ? `「${getStrategyAnswerLabel("RS02", answers.RS02)}」は利益を維持する候補として確認できます。`
      : null,
    answers.RS01 && answers.RS01 !== "undecided" && answers.RS01 !== "other"
      ? `${getPrimaryTradeLabel(trade)}について、増やしたい仕事の方向性を回答できています。`
      : null,
    "3分診断と追加質問を完了し、改善の優先順位を決めるための回答がそろっています。"
  ].filter((item): item is string => Boolean(item));
  return unique([...strengths, ...evidence]).slice(0, 3).length >= 2
    ? unique([...strengths, ...evidence]).slice(0, 3)
    : [...unique([...strengths, ...evidence]), "現時点で断定できない点を、毎月の数字で確認する準備ができています。"].slice(0, 3);
}

function monthlyMetrics(trade: PrimaryTrade, issue: string | undefined, intent: PublicWorkIntent) {
  const metrics = ["見積もり数", "契約数", "工事ごとの利益"];
  if (["profit", "extras", "rework"].includes(issue ?? "")) metrics.push("追加工事の請求額");
  if (["demolition", "painting", "renovation", "scaffold", "interior"].includes(trade)) metrics.push("職人の稼働状況");
  if (issue === "cash") metrics.push("未入金額");
  if (intent !== "not_interested") metrics.push("公共工事の登録・案件数");
  return unique(metrics).slice(0, 6);
}

function publicPrerequisites(ids: string[], answers: DiagnosisV2AnswerMap) {
  const items = ids.filter((id) => id.startsWith("K")).map((id) => `${DETAILED_BY_ID.get(id)?.question ?? id}: ${getStrategyAnswerLabel(id, answers[id])}`);
  return items.length > 0 ? items : ["現在の回答だけでは参加条件を判断できません。許可・会社審査・自治体登録を確認してください。"];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
