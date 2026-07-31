import type {
  DiagnosisV2AnswerMap,
  DiagnosisV2Option,
  DiagnosisV2ScoringContext,
  QuickDiagnosisCategory,
  QuickDiagnosisResult
} from "./questions.ts";
import {
  getPublicWorksScoringMode,
  type PrimaryTrade
} from "./specialty-questions.ts";

export type ShortDiagnosisQuestion = {
  id: string;
  question: string;
  options: DiagnosisV2Option[];
  categories: QuickDiagnosisCategory[];
  displayOrder: number;
  helpText?: string;
};

const options = (...labels: string[]): DiagnosisV2Option[] =>
  labels.map((label, score) => ({ value: String(score), label, score }));

const PRACTICE_OPTIONS = options(
  "全くしていない",
  "ほとんどしていない",
  "一部の工事でしている",
  "ほとんどの工事でしている",
  "毎回行い、記録も残している"
);

export const SHORT_COMMON_QUESTIONS: ShortDiagnosisQuestion[] = [
  {
    id: "C01",
    question: "最近、会社に利益は残っていますか。",
    options: options("赤字が続いている", "赤字と黒字を繰り返している", "黒字だが、ほとんど残らない", "毎年ある程度の利益が残る", "残る利益が増えている"),
    categories: ["management", "profit"],
    displayOrder: 1
  },
  {
    id: "C02",
    question: "毎月、会社にいくら利益が残り、銀行にいくらお金があるか確認していますか。",
    options: options("ほとんど確認していない", "決算の時だけ確認する", "2～3か月遅れて確認する", "翌月中には確認する", "今後の支払いまで予測している"),
    categories: ["management", "profit"],
    displayOrder: 2,
    helpText: "毎月の売上、費用、利益と、銀行口座にあるすぐ使えるお金を確認しているかを聞いています。"
  },
  {
    id: "C03",
    question: "工事を受ける前に、材料代や外注費などを引いて、いくら利益が残るか計算していますか。",
    options: options("計算していない", "社長の感覚で決めている", "金額が大きい工事だけ計算する", "ほとんどの工事で計算する", "最低限残したい利益も決めている"),
    categories: ["profit"],
    displayOrder: 3,
    helpText: "100万円の工事から、材料代30万円、外注費30万円、職人代20万円を引くと、残る利益は20万円です。"
  },
  {
    id: "C04",
    question: "工事が始まったあとも、予定より費用が増えていないか確認していますか。",
    options: options("確認していない", "赤字になってから確認する", "工事が終わってから確認する", "工事中に確認している", "完成時に残る利益まで予測している"),
    categories: ["profit"],
    displayOrder: 4
  },
  {
    id: "C05",
    question: "これから3～6か月で、どの仕事が入りそうか把握していますか。",
    options: options("把握していない", "社長の記憶だけで管理している", "仕事の一覧だけ作っている", "金額、時期、決まりそうな度合いを管理している", "人員や資金の予定にも反映している"),
    categories: ["management", "growth"],
    displayOrder: 5
  },
  {
    id: "C06",
    question: "社長が1週間いなくても、見積もり、現場、支払いなどの仕事は進みますか。",
    options: options("ほとんどの仕事が止まる", "多くの仕事が止まる", "一部の仕事だけ他の人ができる", "通常の仕事は進められる", "誰が何を決めるか決まっている"),
    categories: ["organization"],
    displayOrder: 6
  },
  {
    id: "C07",
    question: "今いる職人や協力会社で、これから入る仕事に対応できるか分かっていますか。",
    options: options("分かっていない", "いつも人が足りない", "現在の仕事分だけは分かる", "今後の仕事もある程度対応できる", "仕事量に合わせて人の予定を組んでいる"),
    categories: ["organization"],
    displayOrder: 7
  },
  {
    id: "C08",
    question: "工事ごとに、契約、請求、支払い、入金をまとめて確認できますか。",
    options: options("確認できない", "紙や担当者ごとに分かれている", "一部だけまとめている", "工事ごとにまとめている", "請求漏れや入金遅れも分かる"),
    categories: ["management"],
    displayOrder: 8
  }
];

export const SHORT_PUBLIC_WORK_QUESTIONS: ShortDiagnosisQuestion[] = [
  {
    id: "PW01",
    question: "公共工事に参加するための『経営事項審査』という会社の審査を毎年受けていますか。",
    options: options("受けていない", "以前は受けたが期限が切れている", "現在、申請中", "毎年受けている", "点数を上げる対策もしている"),
    categories: ["public_works"],
    displayOrder: 9,
    helpText: "経営事項審査は、公共工事に参加するために受ける会社の審査です。"
  },
  {
    id: "PW02",
    question: "役所や国の工事に参加するための登録は、どこまで済んでいますか。",
    options: options("登録していない", "これから調べる段階", "一部だけ登録している", "複数の役所や機関へ登録している", "更新時期と案件情報まで管理している"),
    categories: ["public_works"],
    displayOrder: 10,
    helpText: "役所や国の工事に参加するには、発注する役所や機関への事前登録が必要です。"
  },
  {
    id: "PW03",
    question: "公共工事を受けた場合、必要な資格を持つ人と作業する人を用意できますか。",
    options: options("用意できない", "1人だけに頼っている", "現在の仕事分だけなら用意できる", "ある程度の余裕がある", "仕事が増えても対応できる"),
    categories: ["organization", "public_works"],
    displayOrder: 11,
    helpText: "工事現場に置く必要がある資格者と、実際に作業する人の両方を用意できるかを聞いています。"
  }
];

const specialtyQuestion = (
  id: string,
  question: string,
  categories: QuickDiagnosisCategory[],
  displayOrder: number,
  customOptions = PRACTICE_OPTIONS,
  helpText?: string
): ShortDiagnosisQuestion => ({ id, question, categories, displayOrder, options: customOptions, helpText });

const SHORT_SPECIALTY_QUESTIONS: Record<string, ShortDiagnosisQuestion[]> = {
  demolition: [
    specialtyQuestion("D01", "見積もりのとき、処分代、運搬代、重機代、職人代などを分けて計算していますか。", ["profit"], 12),
    specialtyQuestion("D02", "工事前に、アスベスト、地中に埋まっている物、近所への影響などを確認していますか。", ["organization"], 13, PRACTICE_OPTIONS, "アスベストは、古い建物に使われている可能性がある、健康被害を起こすおそれのある建材です。"),
    specialtyQuestion("D03", "工事中に追加のゴミや地中の障害物が見つかった場合、追加料金を請求できる決まりがありますか。", ["profit"], 14),
    specialtyQuestion("D04", "ゴミをどこへ、どれだけ運んだかを、工事ごとに記録していますか。", ["management"], 15, PRACTICE_OPTIONS, "産業廃棄物を正しく処分したことを確認する書類も含めて記録しているかを聞いています。")
  ],
  painting: [
    specialtyQuestion("PA01", "問い合わせが何件あり、見積もりを何件出し、何件契約になったか把握していますか。", ["growth"], 12),
    specialtyQuestion("PA02", "足場代、塗料代、職人代などを、工事ごとに計算していますか。", ["profit"], 13),
    specialtyQuestion("PA04", "下地処理、作業写真、仕上がり確認、手直しの内容を記録していますか。", ["organization"], 14, PRACTICE_OPTIONS, "下地処理は、塗る前に汚れ、ひび、さびなどを直す作業です。"),
    specialtyQuestion("PA05", "工事が終わったあともお客様へ連絡し、紹介や次の塗り替えにつなげていますか。", ["growth"], 15)
  ],
  renovation: [
    specialtyQuestion("R01", "問い合わせ、現地確認、見積もり、契約の件数を把握していますか。", ["growth"], 12),
    specialtyQuestion("R02", "見積もりに入る工事、入らない工事、追加料金になる場合を、契約前に説明していますか。", ["profit"], 13),
    specialtyQuestion("R03", "大工、電気、水道など、複数の職人の予定をまとめて管理していますか。", ["organization"], 14),
    specialtyQuestion("R04", "材料代、外注費、追加工事を含めて、完成時にいくら利益が残るか分かりますか。", ["profit"], 15)
  ],
  scaffold: [
    specialtyQuestion("SC01", "足場材や部品が、どの現場に何個あるか把握していますか。", ["management"], 12),
    specialtyQuestion("SC02", "足場の高さ、広さ、運ぶ距離、必要人数を、見積もり金額に入れていますか。", ["profit"], 13),
    specialtyQuestion("SC03", "安全教育、作業前の点検、墜落防止を行い、記録も残していますか。", ["organization"], 14),
    specialtyQuestion("SC05", "売上が1社の取引先に偏りすぎていないか、支払い条件も含めて確認していますか。", ["growth"], 15, options("1社に大きく偏り、条件も未確認", "1社に大きく偏っている", "偏りは分かるが対策していない", "取引先を増やしている", "売上と支払い条件を毎月確認している"))
  ],
  interior: [
    specialtyQuestion("IN01", "1平方メートル当たりの金額だけでなく、職人の日数、材料代、移動時間、下地を直す費用まで含めて利益を計算していますか。", ["profit"], 12, PRACTICE_OPTIONS, "1平方メートル当たりの工事金額だけでは、職人代や移動時間が抜けて赤字になることがあります。"),
    specialtyQuestion("IN02", "職人ごとの作業量、仕上がり、手直しの多さを把握していますか。", ["organization"], 13),
    specialtyQuestion("IN03", "売上が特定の工務店や管理会社に偏りすぎていませんか。", ["growth"], 14, options("1社に70％以上偏っている", "1社に50％以上偏っている", "1社に30％以上偏っている", "1社への偏りは30％未満", "複数社に分かれ、条件も確認している")),
    specialtyQuestion("IN04", "追加の下地処理や現場での待ち時間が出たとき、追加料金を請求できますか。", ["profit"], 15)
  ],
  common: [
    specialtyQuestion("SP01", "材料代、職人代、外注費、車両代を、工事ごとに計算していますか。", ["profit"], 12),
    specialtyQuestion("SP02", "現場や職人ごとの作業量と、手直しの多さを把握していますか。", ["organization"], 13),
    specialtyQuestion("SP03", "売上が特定の取引先に偏りすぎていませんか。", ["growth"], 14, options("1社に70％以上偏っている", "1社に50％以上偏っている", "1社に30％以上偏っている", "1社への偏りは30％未満", "複数社に分かれ、条件も確認している")),
    specialtyQuestion("SP04", "仕事量に対して、職人、資格を持つ人、協力会社が足りているか分かっていますか。", ["organization"], 15)
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
  const publicQuestions = context.publicWorkIntent && getPublicWorksScoringMode(context.publicWorkIntent) === "excluded"
    ? []
    : SHORT_PUBLIC_WORK_QUESTIONS;
  return [...SHORT_COMMON_QUESTIONS, ...publicQuestions, ...SHORT_SPECIALTY_QUESTIONS[specialtyKey]];
}

export function scoreShortDiagnosis(
  answers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext = {}
): QuickDiagnosisResult {
  const questions = getShortDiagnosisQuestions(context);
  const unanswered = questions
    .filter((question) => !question.options.some((option) => option.value === answers[question.id]))
    .map((question) => question.id);
  const categories = [...new Set(questions.flatMap((question) => question.categories))];
  const categoryScores = {} as Record<QuickDiagnosisCategory, number>;

  for (const category of categories) {
    const categoryQuestions = questions.filter((question) => question.categories.includes(category));
    const earned = categoryQuestions.reduce((sum, question) =>
      sum + (question.options.find((option) => option.value === answers[question.id])?.score ?? 0), 0);
    categoryScores[category] = roundOne((earned / (categoryQuestions.length * 4)) * 100);
  }

  const earned = questions.reduce((sum, question) =>
    sum + (question.options.find((option) => option.value === answers[question.id])?.score ?? 0), 0);
  return {
    complete: unanswered.length === 0,
    unanswered,
    totalScore: unanswered.length === 0 ? roundOne((earned / (questions.length * 4)) * 100) : null,
    categoryScores
  };
}

export function getShortDiagnosisOptionLabel(questionId: string, value: string | undefined) {
  const question = ALL_SHORT_DIAGNOSIS_QUESTIONS.find((candidate) => candidate.id === questionId);
  return question?.options.find((option) => option.value === value)?.label ?? "未回答";
}

export function hasShortDiagnosisAnswers(answers: DiagnosisV2AnswerMap) {
  return Object.keys(answers).some((id) => id.startsWith("C") || id.startsWith("PW"));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
