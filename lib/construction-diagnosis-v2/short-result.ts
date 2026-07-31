import type { DiagnosisV2AnswerMap, DiagnosisV2SectionId } from "./questions.ts";
import { DIAGNOSIS_V2_SECTIONS } from "./questions.ts";
import type { ShortDiagnosisScoringResult } from "./short-questions.ts";
import {
  buildSpecialtyDiagnosisSummary,
  getPublicWorksScoringMode,
  type PrimaryTrade,
  type PublicWorkIntent
} from "./specialty-questions.ts";

export type ShortDiagnosisResultSnapshot = {
  totalScore: number;
  strengths: string[];
  priorities: string[];
  monthlyNumbers: string[];
  publicWorksStatus: string;
  actions30Days: string[];
  disclaimer: string;
};

const SECTION_MESSAGES: Record<DiagnosisV2SectionId, { strength: string; priority: string; action: string }> = {
  finance: {
    strength: "会社に残る利益と、銀行にあるお金を確認できています。",
    priority: "毎月、会社に残る利益と銀行にあるお金を確認する必要があります。",
    action: "毎月の売上、費用、利益、銀行にあるお金を1枚にまとめる"
  },
  profit: {
    strength: "工事を受ける前と工事中に、残る利益を確認できています。",
    priority: "材料代や外注費を確認し、工事で利益が残るかを見る必要があります。",
    action: "工事ごとに、見積もり時の費用と実際の費用を比べる"
  },
  sales: {
    strength: "これから入りそうな仕事を確認できています。",
    priority: "いつ、いくらの仕事が入りそうかを一覧にする必要があります。",
    action: "今後3～6か月に入りそうな仕事を金額と時期で一覧にする"
  },
  public_works: {
    strength: "公共工事に必要な会社の審査、登録、人の準備が進んでいます。",
    priority: "公共工事に必要な会社の審査、役所への登録、資格を持つ人を確認する必要があります。",
    action: "公共工事に必要な会社の審査、登録、資格を持つ人の不足を確認する"
  },
  technical: {
    strength: "今後の仕事に必要な職人や協力会社を見通せています。",
    priority: "これから入る仕事に必要な職人や協力会社が足りるか確認する必要があります。",
    action: "今後3か月の仕事と、必要な職人・協力会社の予定を並べる"
  },
  organization: {
    strength: "社長が不在でも、通常の仕事を進められる土台があります。",
    priority: "社長以外でも仕事を進められるよう、担当と決めてよい範囲を決める必要があります。",
    action: "見積もり、現場、支払いを誰が担当するか決める"
  },
  control: {
    strength: "契約、請求、支払い、入金を工事ごとに確認できています。",
    priority: "請求漏れ、入金遅れ、支払い間違い、不正を防ぐ仕組みを先に整える必要があります。",
    action: "契約、請求、支払い、入金を工事ごとにまとめる"
  },
  growth: {
    strength: "これからの成長に向けた準備が進んでいます。",
    priority: "今後伸ばす仕事と、そのために必要なお金や人を決める必要があります。",
    action: "今後伸ばす仕事を1つ決め、必要なお金と人を確認する"
  }
};

export function buildShortDiagnosisResult(
  answers: DiagnosisV2AnswerMap,
  scoring: ShortDiagnosisScoringResult,
  primaryTrade: PrimaryTrade,
  publicWorkIntent: PublicWorkIntent
): ShortDiagnosisResultSnapshot {
  const scores = Object.entries(scoring.axisScores)
    .filter((entry): entry is [DiagnosisV2SectionId, number] => typeof entry[1] === "number")
    .sort((left, right) => right[1] - left[1]);
  const strongest = scores.slice(0, 2);
  const weakest = [...scores].sort((left, right) => left[1] - right[1]).slice(0, 2);
  const specialty = buildSpecialtyDiagnosisSummary(primaryTrade, answers);

  return {
    totalScore: scoring.totalScore ?? 0,
    strengths: strongest.map(([section]) => SECTION_MESSAGES[section].strength),
    priorities: weakest.map(([section, score]) => score >= 75
      ? `${getShortAxisLabel(section)}は大きな弱点ではありません。今のやり方を続け、毎月の記録で確認してください。`
      : SECTION_MESSAGES[section].priority),
    monthlyNumbers: specialty.kpis,
    publicWorksStatus: getPublicWorksMessage(publicWorkIntent, scoring.axisScores.public_works),
    actions30Days: unique([
      ...weakest.map(([section]) => SECTION_MESSAGES[section].action),
      specialty.plan90Days[0] ?? "毎月確認する数字を決め、記録を始める"
    ]).slice(0, 3),
    disclaimer: "この結果は短い質問から今の傾向を整理したものです。詳しい再成長戦略書ではありません。売上や利益の増加、公共工事への参加や受注を保証するものでもありません。"
  };
}

export function getShortAxisLabel(section: DiagnosisV2SectionId) {
  return DIAGNOSIS_V2_SECTIONS.find((candidate) => candidate.id === section)?.shortLabel ?? section;
}

function getPublicWorksMessage(intent: PublicWorkIntent, score: number | undefined) {
  const mode = getPublicWorksScoringMode(intent);
  if (mode === "excluded") {
    return "今は公共工事を希望していないため、公共工事の準備は点数に含めていません。民間工事の利益と仕事の取り方を先に確認します。";
  }
  if (mode === "reference") {
    return "公共工事への関心はありますが、時期はまだ決まっていません。会社の審査、役所への登録、資格を持つ人の準備を参考として確認できます。";
  }
  return (score ?? 0) >= 60
    ? "公共工事に必要な会社の審査、役所への登録、人の準備が進んでいます。参加先を増やせるか詳しく確認できます。"
    : "公共工事に参加する前に、会社の審査、役所への登録、資格を持つ人の準備を確認する必要があります。";
}

function unique(items: string[]) {
  return [...new Set(items)];
}
