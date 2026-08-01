import type {
  DiagnosisV2AnswerMap,
  DiagnosisV2Option,
  DiagnosisV2ScoringContext,
  DiagnosisV2SectionId,
  QuickDiagnosisCategory,
  QuickDiagnosisResult
} from "./questions.ts";
import { getApplicableDetailedQuestions } from "./questions.ts";
import {
  ALL_SPECIALTY_QUESTIONS,
  getPublicWorksScoringMode,
  type PrimaryTrade
} from "./specialty-questions.ts";

export type ShortDiagnosisQuestion = {
  id: string;
  question: string;
  options: DiagnosisV2Option[];
  categories: QuickDiagnosisCategory[];
  section: DiagnosisV2SectionId;
  weight: number;
  critical?: boolean;
  optional?: boolean;
  referenceOnly?: boolean;
  displayOrder: number;
  helpText?: string;
};

export type ShortDiagnosisScoringResult = QuickDiagnosisResult & {
  axisScores: Partial<Record<DiagnosisV2SectionId, number>>;
  criticalFlags: string[];
};

const options = (...labels: string[]): DiagnosisV2Option[] =>
  labels.map((label, score) => ({ value: String(score), label, score }));

export const SHORT_COMMON_QUESTIONS: ShortDiagnosisQuestion[] = [
  {
    id: "C01",
    question: "最近、会社に利益は残っていますか。",
    options: options("赤字が続いている", "赤字と黒字を繰り返している", "黒字だが、ほとんど残らない", "毎年ある程度の利益が残る", "残る利益が増えている"),
    categories: ["management", "profit"],
    section: "finance",
    weight: 3,
    displayOrder: 1
  },
  {
    id: "C02",
    question: "毎月、会社にいくら利益が残り、銀行にいくらお金があるか確認していますか。",
    options: options("ほとんど確認していない", "決算の時だけ確認する", "2～3か月遅れて確認する", "翌月中には確認する", "今後の支払いまで予測している"),
    categories: ["management", "profit"],
    section: "finance",
    weight: 3,
    displayOrder: 2,
    helpText: "毎月の売上、費用、利益と、銀行口座にあるすぐ使えるお金を確認しているかを聞いています。"
  },
  {
    id: "C03",
    question: "工事を受ける前に、材料代や外注費などを引いて、いくら利益が残るか計算していますか。",
    options: options("計算していない", "社長の感覚で決めている", "金額が大きい工事だけ計算する", "ほとんどの工事で計算する", "最低限残したい利益も決めている"),
    categories: ["profit"],
    section: "profit",
    weight: 3,
    displayOrder: 3,
    helpText: "100万円の工事から、材料代30万円、外注費30万円、職人代20万円を引くと、残る利益は20万円です。"
  },
  {
    id: "C04",
    question: "工事が始まったあとも、予定より費用が増えていないか確認していますか。",
    options: options("確認していない", "赤字になってから確認する", "工事が終わってから確認する", "工事中に確認している", "完成時に残る利益まで予測している"),
    categories: ["profit"],
    section: "profit",
    weight: 3,
    displayOrder: 4
  },
  {
    id: "C05",
    question: "これから3～6か月で、どの仕事が入りそうか把握していますか。",
    options: options("把握していない", "社長の記憶だけで管理している", "仕事の一覧だけ作っている", "金額、時期、決まりそうな度合いを管理している", "人員や資金の予定にも反映している"),
    categories: ["management", "growth"],
    section: "sales",
    weight: 2,
    displayOrder: 5
  },
  {
    id: "C06",
    question: "社長が1週間いなくても、見積もり、現場、支払いなどの仕事は進みますか。",
    options: options("ほとんどの仕事が止まる", "多くの仕事が止まる", "一部の仕事だけ他の人ができる", "通常の仕事は進められる", "誰が何を決めるか決まっている"),
    categories: ["organization"],
    section: "organization",
    weight: 3,
    displayOrder: 6
  },
  {
    id: "C07",
    question: "今いる職人や協力会社で、これから入る仕事に対応できるか分かっていますか。",
    options: options("分かっていない", "いつも人が足りない", "現在の仕事分だけは分かる", "今後の仕事もある程度対応できる", "仕事量に合わせて人の予定を組んでいる"),
    categories: ["organization"],
    section: "technical",
    weight: 3,
    displayOrder: 7
  },
  {
    id: "C08",
    question: "工事ごとに、契約、請求、支払い、入金をまとめて確認できますか。",
    options: options("確認できない", "紙や担当者ごとに分かれている", "一部だけまとめている", "工事ごとにまとめている", "請求漏れや入金遅れも分かる"),
    categories: ["management"],
    section: "control",
    weight: 3,
    critical: true,
    displayOrder: 8
  }
];

export const SHORT_PUBLIC_WORK_QUESTIONS: ShortDiagnosisQuestion[] = [
  {
    id: "PW01",
    question: "公共工事に参加するための『経営事項審査』という会社の審査を毎年受けていますか。",
    options: options("受けていない", "以前は受けたが期限が切れている", "現在、申請中", "毎年受けている", "点数を上げる対策もしている"),
    categories: ["public_works"],
    section: "public_works",
    weight: 3,
    displayOrder: 9,
    helpText: "経営事項審査は、公共工事に参加するために受ける会社の審査です。"
  },
  {
    id: "PW02",
    question: "役所や国の工事に参加するための登録は、どこまで済んでいますか。",
    options: options("登録していない", "これから調べる段階", "一部だけ登録している", "複数の役所や機関へ登録している", "更新時期と案件情報まで管理している"),
    categories: ["public_works"],
    section: "public_works",
    weight: 2,
    displayOrder: 10,
    helpText: "役所や国の工事に参加するには、発注する役所や機関への事前登録が必要です。"
  },
  {
    id: "PW03",
    question: "公共工事を受けた場合、必要な資格を持つ人と作業する人を用意できますか。",
    options: options("用意できない", "1人だけに頼っている", "現在の仕事分だけなら用意できる", "ある程度の余裕がある", "仕事が増えても対応できる"),
    categories: ["organization", "public_works"],
    section: "public_works",
    weight: 3,
    displayOrder: 11,
    helpText: "工事現場に置く必要がある資格者と、実際に作業する人の両方を用意できるかを聞いています。"
  }
];

const specialtyQuestion = (
  id: string,
  categories: QuickDiagnosisCategory[],
  displayOrder: number,
  helpText?: string
): ShortDiagnosisQuestion => {
  const detailedQuestion = ALL_SPECIALTY_QUESTIONS.find((candidate) => candidate.id === id);
  if (!detailedQuestion) throw new Error(`Unknown specialty diagnosis question: ${id}`);
  return {
    id,
    question: detailedQuestion.question,
    categories,
    section: detailedQuestion.section,
    weight: detailedQuestion.weight,
    critical: detailedQuestion.critical ?? false,
    displayOrder,
    options: detailedQuestion.options,
    helpText
  };
};

const SHORT_SPECIALTY_QUESTIONS: Record<string, ShortDiagnosisQuestion[]> = {
  demolition: [
    specialtyQuestion("D01", ["profit"], 12),
    specialtyQuestion("D02", ["organization"], 13, "アスベストは、古い建物に使われている可能性がある、健康被害を起こすおそれのある建材です。"),
    specialtyQuestion("D03", ["profit"], 14),
    specialtyQuestion("D04", ["management"], 15, "産業廃棄物を正しく処分したことを確認する書類も含めて記録しているかを聞いています。")
  ],
  painting: [
    specialtyQuestion("PA01", ["growth"], 12),
    specialtyQuestion("PA02", ["profit"], 13),
    specialtyQuestion("PA04", ["organization"], 14, "下地処理は、塗る前に汚れ、ひび、さびなどを直す作業です。"),
    specialtyQuestion("PA05", ["growth"], 15)
  ],
  renovation: [
    specialtyQuestion("R01", ["growth"], 12),
    specialtyQuestion("R02", ["profit"], 13),
    specialtyQuestion("R03", ["organization"], 14),
    specialtyQuestion("R04", ["profit"], 15)
  ],
  scaffold: [
    specialtyQuestion("SC01", ["management"], 12),
    specialtyQuestion("SC02", ["profit"], 13),
    specialtyQuestion("SC03", ["organization"], 14),
    specialtyQuestion("SC05", ["growth"], 15)
  ],
  interior: [
    specialtyQuestion("IN01", ["profit"], 12, "1平方メートル当たりの工事金額だけでは、職人代や移動時間が抜けて赤字になることがあります。"),
    specialtyQuestion("IN02", ["organization"], 13),
    specialtyQuestion("IN03", ["growth"], 14),
    specialtyQuestion("IN04", ["profit"], 15)
  ],
  common: [
    specialtyQuestion("SP01", ["profit"], 12),
    specialtyQuestion("SP02", ["organization"], 13),
    specialtyQuestion("SP03", ["growth"], 14),
    specialtyQuestion("SP04", ["organization"], 15)
  ]
};

const SPECIALTY_TRADE_KEYS = new Set<PrimaryTrade>(["demolition", "painting", "renovation", "scaffold", "interior"]);

export const ALL_SHORT_DIAGNOSIS_QUESTIONS = [
  ...SHORT_COMMON_QUESTIONS,
  ...SHORT_PUBLIC_WORK_QUESTIONS,
  ...Object.values(SHORT_SPECIALTY_QUESTIONS).flat()
].filter((question, index, questions) => questions.findIndex((candidate) => candidate.id === question.id) === index);

export function getShortDiagnosisQuestions(context: DiagnosisV2ScoringContext = {}) {
  const primaryTrade = context.primaryTrade as PrimaryTrade | undefined;
  const specialtyKey = primaryTrade && SPECIALTY_TRADE_KEYS.has(primaryTrade) ? primaryTrade : "common";
  const publicMode = context.publicWorkIntent
    ? getPublicWorksScoringMode(context.publicWorkIntent)
    : "reference";
  const publicQuestions = publicMode === "excluded"
    ? []
    : SHORT_PUBLIC_WORK_QUESTIONS.map((question) => publicMode === "reference"
      ? { ...question, optional: true, referenceOnly: true }
      : question);
  return [...SHORT_COMMON_QUESTIONS, ...publicQuestions, ...SHORT_SPECIALTY_QUESTIONS[specialtyKey]];
}

export function scoreShortDiagnosis(
  answers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext = {}
): ShortDiagnosisScoringResult {
  const questions = getShortDiagnosisQuestions(context);
  const unanswered = questions
    .filter((question) => !question.optional)
    .filter((question) => !question.options.some((option) => option.value === answers[question.id]))
    .map((question) => question.id);
  const scoredQuestions = questions.filter((question) => !question.referenceOnly);
  const categories = [...new Set(scoredQuestions.flatMap((question) => question.categories))];
  const categoryScores = {} as Record<QuickDiagnosisCategory, number>;

  for (const category of categories) {
    const categoryQuestions = scoredQuestions.filter((question) => question.categories.includes(category));
    const earned = categoryQuestions.reduce((sum, question) =>
      sum + (question.options.find((option) => option.value === answers[question.id])?.score ?? 0), 0);
    categoryScores[category] = roundOne((earned / (categoryQuestions.length * 4)) * 100);
  }

  const sections = [...new Set(scoredQuestions.map((question) => question.section))];
  const axisScores: Partial<Record<DiagnosisV2SectionId, number>> = {};
  for (const section of sections) {
    const sectionQuestions = scoredQuestions.filter((question) => question.section === section);
    const weightedEarned = sectionQuestions.reduce((sum, question) =>
      sum + (question.options.find((option) => option.value === answers[question.id])?.score ?? 0) * question.weight, 0);
    const weightedMaximum = sectionQuestions.reduce((sum, question) => sum + 4 * question.weight, 0);
    axisScores[section] = roundOne((weightedEarned / weightedMaximum) * 100);
  }

  const weightedEarned = scoredQuestions.reduce((sum, question) =>
    sum + (question.options.find((option) => option.value === answers[question.id])?.score ?? 0) * question.weight, 0);
  const weightedMaximum = scoredQuestions.reduce((sum, question) => sum + 4 * question.weight, 0);
  const criticalFlags = scoredQuestions
    .filter((question) => question.critical)
    .filter((question) => Number(answers[question.id]) <= 1)
    .map((question) => question.id);
  return {
    complete: unanswered.length === 0,
    unanswered,
    totalScore: unanswered.length === 0 ? roundOne((weightedEarned / weightedMaximum) * 100) : null,
    categoryScores,
    axisScores,
    criticalFlags
  };
}

const SHORT_TO_DETAILED_QUESTION: Record<string, string> = {
  C01: "F02",
  C03: "P01",
  C04: "P02",
  C05: "S04",
  C06: "O01",
  C08: "I03",
  PW01: "K02",
  PW03: "T01"
};

export function getInheritedDetailedAnswers(answers: DiagnosisV2AnswerMap) {
  const inherited: DiagnosisV2AnswerMap = {};
  for (const [shortId, detailedId] of Object.entries(SHORT_TO_DETAILED_QUESTION)) {
    if (answers[shortId] !== undefined) inherited[detailedId] = answers[shortId];
  }
  for (const question of ALL_SPECIALTY_QUESTIONS) {
    if (answers[question.id] !== undefined) inherited[question.id] = answers[question.id];
  }
  return inherited;
}

export function getInheritedDetailedQuestionIds(answers: DiagnosisV2AnswerMap) {
  return Object.keys(getInheritedDetailedAnswers(answers));
}

export function getAdditionalDetailedQuestions(
  answers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext
) {
  const inheritedIds = new Set(getInheritedDetailedQuestionIds(answers));
  return getApplicableDetailedQuestions(context).filter((question) => !inheritedIds.has(question.id));
}

export function getShortDiagnosisOptionLabel(questionId: string, value: string | undefined) {
  const question = ALL_SHORT_DIAGNOSIS_QUESTIONS.find((candidate) => candidate.id === questionId);
  return question?.options.find((option) => option.value === value)?.label ?? "未回答";
}

export function getShortDiagnosisAnswerScore(questionId: string, value: string | undefined) {
  const question = ALL_SHORT_DIAGNOSIS_QUESTIONS.find((candidate) => candidate.id === questionId);
  return question?.options.find((option) => option.value === value)?.score ?? null;
}

export function hasShortDiagnosisAnswers(answers: DiagnosisV2AnswerMap) {
  return Object.keys(answers).some((id) => id.startsWith("C") || id.startsWith("PW"));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
