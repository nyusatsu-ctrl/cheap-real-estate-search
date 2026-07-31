import {
  ALL_SPECIALTY_QUESTIONS,
  getPublicWorksScoringMode,
  getSpecialtyQuestionLabel,
  getSpecialtyQuestions,
  type PrimaryTrade,
  type PublicWorkIntent,
  type PublicWorksScoringMode
} from "./specialty-questions.ts";

export const CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION = "construction_management_diagnosis_v2_1";
export const LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION = "construction_management_diagnosis_v2";

export type DiagnosisV2SectionId =
  | "finance"
  | "profit"
  | "sales"
  | "public_works"
  | "technical"
  | "organization"
  | "control"
  | "growth";

export type DiagnosisV2Judgment =
  | "経営基盤の整備を優先"
  | "自社対応可能＋必要時スポット支援"
  | "一部支援推奨"
  | "段階的な専門支援推奨"
  | "現時点では保留";

export type DiagnosisV2AnswerMap = Record<string, string>;

export type DiagnosisV2Option = {
  value: string;
  label: string;
  score: number;
};

export type DiagnosisV2Question = {
  id: string;
  section: DiagnosisV2SectionId;
  question: string;
  options: DiagnosisV2Option[];
  weight: number;
  critical: boolean;
  displayOrder: number;
};

export type DiagnosisV2Section = {
  id: DiagnosisV2SectionId;
  label: string;
  shortLabel: string;
  description: string;
};

export type DiagnosisV2ScoringResult = {
  complete: boolean;
  unanswered: string[];
  axisScores: Partial<Record<DiagnosisV2SectionId, number>>;
  totalScore: number | null;
  criticalFlags: string[];
  judgment: DiagnosisV2Judgment | null;
  publicWorksMode: PublicWorksScoringMode;
  applicableQuestionIds: string[];
};

export type DiagnosisV2ScoringContext = {
  primaryTrade?: PrimaryTrade | string | null;
  publicWorkIntent?: PublicWorkIntent | string | null;
  includeSpecialty?: boolean;
};

export type QuickDiagnosisResult = {
  complete: boolean;
  unanswered: string[];
  totalScore: number | null;
  categoryScores: Record<QuickDiagnosisCategory, number>;
};

export type QuickDiagnosisCategory =
  | "management"
  | "profit"
  | "organization"
  | "public_works"
  | "growth";

export type QuickDiagnosisQuestion = {
  id: string;
  question: string;
  options: DiagnosisV2Option[];
  categories: QuickDiagnosisCategory[];
  displayOrder: number;
};

export const DIAGNOSIS_V2_SECTIONS: DiagnosisV2Section[] = [
  { id: "finance", label: "財務・資金繰り", shortLabel: "会社のお金", description: "会社に残る利益と、すぐ使えるお金を確認します。" },
  { id: "profit", label: "原価・収益管理", shortLabel: "工事の利益", description: "工事ごとの費用と、最後に残る利益を確認します。" },
  { id: "sales", label: "受注基盤・営業", shortLabel: "これからの仕事", description: "今後の仕事量と取引先の偏りを確認します。" },
  { id: "public_works", label: "公共工事参入体制", shortLabel: "公共工事の準備", description: "公共工事に参加するための登録と準備を確認します。" },
  { id: "technical", label: "施工・技術体制", shortLabel: "職人・安全", description: "資格を持つ人、協力会社、安全の確認方法を見ます。" },
  { id: "organization", label: "組織・人材", shortLabel: "社内の役割", description: "社長がいない時の仕事と、人を育てる準備を確認します。" },
  { id: "control", label: "内部統制・管理", shortLabel: "お金・書類の確認", description: "支払い、請求、入金、道具を安全に管理できているか確認します。" },
  { id: "growth", label: "成長実行力・DX", shortLabel: "これからの成長", description: "今後の目標と、パソコンやスマホを使った管理を確認します。" }
];

const STANDARD_OPTIONS: DiagnosisV2Option[] = [
  { value: "4", label: "はい", score: 4 },
  { value: "2", label: "一部", score: 2 },
  { value: "0", label: "いいえ", score: 0 },
  { value: "1", label: "不明", score: 1 }
];

export const QUICK_DIAGNOSIS_QUESTIONS: QuickDiagnosisQuestion[] = [
  {
    id: "Q01",
    question: "最近3年間の売上は、増加、ほぼ同じ、減少のどれですか。",
    options: [
      { value: "4", label: "増加", score: 4 },
      { value: "2", label: "横ばい", score: 2 },
      { value: "0", label: "減少", score: 0 },
      { value: "1", label: "不明", score: 1 }
    ],
    categories: ["management", "growth"],
    displayOrder: 1
  },
  { id: "Q02", question: "最近の決算で、会社に利益は残りましたか。", options: STANDARD_OPTIONS, categories: ["management", "profit"], displayOrder: 2 },
  { id: "Q03", question: "毎月の利益と銀行にあるお金を、翌月中に確認できますか。", options: STANDARD_OPTIONS, categories: ["management", "profit"], displayOrder: 3 },
  { id: "Q04", question: "工事ごとに、予定していた利益と実際に残った利益を確認していますか。", options: STANDARD_OPTIONS, categories: ["profit"], displayOrder: 4 },
  { id: "Q05", question: "社長が1週間不在でも通常業務は回りますか。", options: STANDARD_OPTIONS, categories: ["organization"], displayOrder: 5 },
  { id: "Q06", question: "公共工事に必要な『経営事項審査』という会社の審査を毎年受けていますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 6 },
  { id: "Q07", question: "市町村や県の工事へ続けて申し込んでいますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 7 },
  { id: "Q08", question: "国・関連機関の建設工事に参加していますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 8 },
  { id: "Q09", question: "資格を持つ人を、いつどの現場へ置けるか一覧で分かりますか。", options: STANDARD_OPTIONS, categories: ["organization", "public_works"], displayOrder: 9 },
  { id: "Q10", question: "今後3年で、公共工事の参加先または会社の売上・利益を増やしたいですか。", options: STANDARD_OPTIONS, categories: ["growth"], displayOrder: 10 }
];

export const QUICK_CATEGORY_LABELS: Record<QuickDiagnosisCategory, string> = {
  management: "会社のお金と管理",
  profit: "工事で残る利益",
  organization: "社内の役割と人",
  public_works: "公共工事の準備",
  growth: "これからの成長"
};

const option = (score: number, label: string): DiagnosisV2Option => ({
  value: String(score),
  label,
  score
});

export const DETAILED_DIAGNOSIS_QUESTIONS: DiagnosisV2Question[] = [
  {
    id: "F01", section: "finance", question: "最近3年間の売上は、どのように変わっていますか。", weight: 2, critical: false, displayOrder: 1,
    options: [option(0, "3年続けて大きく減っている"), option(1, "少しずつ減っている"), option(2, "ほぼ変わらない"), option(3, "少しずつ増えている"), option(4, "毎年安定して増えている")]
  },
  {
    id: "F02", section: "finance", question: "最近3年間、会社に利益は残っていますか。", weight: 3, critical: false, displayOrder: 2,
    options: [option(0, "赤字が続いている"), option(1, "赤字と黒字を繰り返している"), option(2, "黒字だが、ほとんど残らない"), option(3, "毎年ある程度残る"), option(4, "売上に対して残る利益も増えている")]
  },
  {
    id: "F03", section: "finance", question: "今ある現金と銀行のお金で、家賃や給料などを何か月払えますか。", weight: 3, critical: true, displayOrder: 3,
    options: [option(0, "1か月未満"), option(1, "1～2か月"), option(2, "3か月"), option(3, "4～6か月"), option(4, "7か月以上")]
  },
  {
    id: "F04", section: "finance", question: "毎月の売上、費用、利益は、いつ分かりますか。", weight: 2, critical: false, displayOrder: 4,
    options: [option(0, "毎月は確認していない"), option(1, "3か月より後"), option(2, "2か月後"), option(3, "翌月末まで"), option(4, "翌月15日ごろまで")]
  },
  {
    id: "F05", section: "finance", question: "お客様からまだ入っていないお金や、入金の遅れを確認していますか。", weight: 2, critical: false, displayOrder: 5,
    options: [option(0, "確認できていない"), option(1, "長く入金されないものが多い"), option(2, "一覧はあるが対応が遅い"), option(3, "毎月確認している"), option(4, "遅れを早く見つけ、回収する手順がある")]
  },
  {
    id: "P01", section: "profit", question: "工事を受ける前に、材料代や外注費などを引いて、いくら利益が残るか計算していますか。", weight: 3, critical: false, displayOrder: 6,
    options: [option(0, "計算していない"), option(1, "だいたいの金額だけ"), option(2, "大きな工事だけ"), option(3, "ほとんどの工事で計算"), option(4, "最低限残したい利益も決めている")]
  },
  {
    id: "P02", section: "profit", question: "工事ごとに、予定していた費用と実際にかかった費用を比べていますか。", weight: 3, critical: false, displayOrder: 7,
    options: [option(0, "比べていない"), option(1, "赤字になった時だけ"), option(2, "工事が終わった後だけ"), option(3, "毎月比べている"), option(4, "工事中に完成時の利益も予測している")]
  },
  {
    id: "P03", section: "profit", question: "追加や変更になった工事を記録し、忘れずに請求していますか。", weight: 2, critical: false, displayOrder: 8,
    options: [option(0, "口約束が多く、請求漏れも多い"), option(1, "記録の方法が人によって違う"), option(2, "大きな工事だけ記録"), option(3, "書類に残している"), option(4, "確認、写真、請求まで同じ手順で行う")]
  },
  {
    id: "P04", section: "profit", question: "材料代や職人代が上がった時、見積もりや契約金額も見直せていますか。", weight: 2, critical: false, displayOrder: 9,
    options: [option(0, "ほとんど見直せない"), option(1, "一部だけ"), option(2, "工事による"), option(3, "基本的に見直している"), option(4, "値上がりの資料と相談手順がある")]
  },
  {
    id: "P05", section: "profit", question: "赤字になった工事の原因を調べ、次の見積もりに生かしていますか。", weight: 2, critical: false, displayOrder: 10,
    options: [option(0, "赤字が多く、原因も分からない"), option(1, "赤字が多く、担当者だけで対応"), option(2, "時々赤字になる"), option(3, "原因を調べ、同じ失敗を防いでいる"), option(4, "仕事を受けるかの判断にも使っている")]
  },
  {
    id: "S01", section: "sales", question: "すでに決まっている今後の仕事で、家賃や給料などを何か月払えますか。", weight: 2, critical: false, displayOrder: 11,
    options: [option(0, "1か月未満"), option(1, "1～2か月"), option(2, "3か月"), option(3, "4～6か月"), option(4, "7か月以上")]
  },
  {
    id: "S02", section: "sales", question: "売上が一番多い取引先は、会社全体の売上の何％ですか。", weight: 2, critical: false, displayOrder: 12,
    options: [option(0, "70％以上"), option(1, "50～69％"), option(2, "30～49％"), option(3, "15～29％"), option(4, "15％未満")]
  },
  {
    id: "S03", section: "sales", question: "仕事を受けるか断るかを決める、会社の決まりがありますか。", weight: 2, critical: false, displayOrder: 13,
    options: [option(0, "社長の感覚だけ"), option(1, "金額だけで決める"), option(2, "一部だけ決まりがある"), option(3, "利益、人の数、必要なお金で決める"), option(4, "決めた理由も記録している")]
  },
  {
    id: "S04", section: "sales", question: "これから6か月で入りそうな仕事を、一覧で確認できますか。", weight: 2, critical: false, displayOrder: 14,
    options: [option(0, "管理していない"), option(1, "社長の記憶だけ"), option(2, "仕事名の一覧だけ"), option(3, "決まりそうな度合い、金額、時期も管理"), option(4, "売上予測と職人の予定にも使っている")]
  },
  {
    id: "K01", section: "public_works", question: "行っている工事に必要な建設業の許可を持ち、更新時期も確認していますか。", weight: 3, critical: false, displayOrder: 15,
    options: [option(0, "足りない、または期限切れのおそれがある"), option(1, "一部足りない"), option(2, "今の仕事に必要な分だけ持っている"), option(3, "今後増やす仕事の分も持っている"), option(4, "更新と変更の届け出まで管理している")]
  },
  {
    id: "K02", section: "public_works", question: "公共工事に参加するための『経営事項審査』という会社の審査を毎年受けていますか。", weight: 3, critical: false, displayOrder: 16,
    options: [option(0, "受けていない"), option(1, "以前は受けたが期限切れ"), option(2, "現在、申請中"), option(3, "毎年受けている"), option(4, "審査の点数を上げる計画もある")]
  },
  {
    id: "K03", section: "public_works", question: "市町村や県の工事に参加するための登録と、参加した経験はありますか。", weight: 3, critical: false, displayOrder: 17,
    options: [option(0, "登録も参加もしていない"), option(1, "登録の準備中"), option(2, "登録済みだが参加経験はない"), option(3, "続けて参加している"), option(4, "複数の市町村や県で経験がある")]
  },
  {
    id: "K04", section: "public_works", question: "国や国の機関が出す工事に参加する準備は、どこまで進んでいますか。", weight: 3, critical: false, displayOrder: 18,
    options: [option(0, "まだ調べていない"), option(1, "興味はある"), option(2, "一部の登録を取得済み、または申請中"), option(3, "複数の機関へ参加できる"), option(4, "案件探しから申込みまで行っている")]
  },
  {
    id: "K05", section: "public_works", question: "公共工事に必要な工事経験、書類、担当者をまとめて管理していますか。", weight: 2, critical: false, displayOrder: 19,
    options: [option(0, "準備していない"), option(1, "必要になった時に対応"), option(2, "一部の書類だけ用意"), option(3, "同じ手順で用意できる"), option(4, "期限、更新、案件情報をまとめて管理")]
  },
  {
    id: "T01", section: "technical", question: "行っている工事に必要な資格を持つ人は足りていますか。", weight: 3, critical: false, displayOrder: 20,
    options: [option(0, "明らかに足りない"), option(1, "1人だけに頼っている"), option(2, "今の仕事の分だけ足りる"), option(3, "少し余裕がある"), option(4, "仕事が増えても対応できる")]
  },
  {
    id: "T02", section: "technical", question: "それぞれの現場に、責任者や資格を持つ人を置けるか分かっていますか。", weight: 3, critical: false, displayOrder: 21,
    options: [option(0, "分かっていない"), option(1, "仕事が決まるたびに確認"), option(2, "一覧はあるが古い"), option(3, "最新の一覧で管理"), option(4, "これから受ける仕事の予定にも使っている")]
  },
  {
    id: "T03", section: "technical", question: "仕事を手伝ってもらえる会社を、安定して確保できていますか。", weight: 2, critical: false, displayOrder: 22,
    options: [option(0, "見つけるのが難しい"), option(1, "1社だけに頼っている"), option(2, "頼める工事の種類に偏りがある"), option(3, "複数社に頼める"), option(4, "地域や工事の種類ごとに代わりの会社もある")]
  },
  {
    id: "T04", section: "technical", question: "安全の決まり、法律、社会保険、現場の人員を定期的に確認していますか。", weight: 3, critical: true, displayOrder: 23,
    options: [option(0, "大きな問題がある"), option(1, "いつも注意や直しを受けている"), option(2, "最低限だけ対応"), option(3, "定期的に確認"), option(4, "教育、点検、記録まで行う")]
  },
  {
    id: "O01", section: "organization", question: "社長が1週間いなくても、いつもの仕事と現場の判断は進みますか。", weight: 3, critical: false, displayOrder: 24,
    options: [option(0, "ほとんど止まる"), option(1, "多くの仕事が社長なしでは進まない"), option(2, "一部だけ他の人ができる"), option(3, "いつもの仕事は進む"), option(4, "誰が代わりに決めるかも明確")]
  },
  {
    id: "O02", section: "organization", question: "誰が何を担当し、誰が最終確認するか、書類にまとめていますか。", weight: 2, critical: false, displayOrder: 25,
    options: [option(0, "決まっていない"), option(1, "口頭で伝えるだけ"), option(2, "一部だけ決めている"), option(3, "主な仕事は明確"), option(4, "特別な対応や見直しも記録")]
  },
  {
    id: "O03", section: "organization", question: "人を採用し、仕事を教え、長く働いてもらうための決まりがありますか。", weight: 2, critical: false, displayOrder: 26,
    options: [option(0, "採用できず、辞める人も多い"), option(1, "必要になった時だけ対応"), option(2, "採用か教育の一部だけ"), option(3, "計画がある"), option(4, "採用、評価、教育をつなげている")]
  },
  {
    id: "O04", section: "organization", question: "年齢の高い職人が増えた時や、会社を次の人へ引き継ぐ準備をしていますか。", weight: 2, critical: false, displayOrder: 27,
    options: [option(0, "何も決めておらず、時間も少ない"), option(1, "問題だとは思っている"), option(2, "候補者か計画の一部がある"), option(3, "具体的な計画がある"), option(4, "引き継ぎと教育を始めている")]
  },
  {
    id: "I01", section: "control", question: "銀行からの送金、返金、大きな支払いを、2人で確認していますか。", weight: 3, critical: true, displayOrder: 28,
    options: [option(0, "1人で自由に支払える"), option(1, "形だけ確認する"), option(2, "大きな金額だけ一部確認"), option(3, "必ず2人で確認"), option(4, "担当者、金額の上限、操作した記録まで管理")]
  },
  {
    id: "I02", section: "control", question: "請求、支払い、入金の確認を、1人だけに任せず別の人も確認していますか。", weight: 3, critical: true, displayOrder: 29,
    options: [option(0, "すべて1人で行う"), option(1, "ほぼ1人で行う"), option(2, "月末だけ別の人が確認"), option(3, "担当を分けている"), option(4, "社長か社外の人も定期的に確認")]
  },
  {
    id: "I03", section: "control", question: "契約書、注文書、請求書、入金を、工事ごとにまとめて確認できますか。", weight: 3, critical: true, displayOrder: 30,
    options: [option(0, "書類が分かれ、確認できない"), option(1, "紙が中心で、内容が合わないことがある"), option(2, "一部だけパソコンで管理"), option(3, "工事ごとにまとめて管理"), option(4, "入金遅れや請求漏れも自動で知らせる")]
  },
  {
    id: "I04", section: "control", question: "車、機械、工具、材料が、どこにいくつあるか正しく分かりますか。", weight: 2, critical: false, displayOrder: 31,
    options: [option(0, "場所も数も分からない"), option(1, "一覧と実物が合わない"), option(2, "年1回確認"), option(3, "定期的に一覧と実物を確認"), option(4, "移動、処分、貸し出しまで記録")]
  },
  {
    id: "G01", section: "growth", question: "3年後の売上、残したい利益、力を入れる仕事の目標がありますか。", weight: 2, critical: false, displayOrder: 32,
    options: [option(0, "目標はない"), option(1, "売上目標だけある"), option(2, "数字と進みたい方向がある"), option(3, "仕事の種類ごとに計画がある"), option(4, "毎月確認する数字と、使うお金まで決めている")]
  },
  {
    id: "G02", section: "growth", question: "紙や口頭だけでなく、パソコンやスマホで仕事を管理できていますか。", weight: 2, critical: false, displayOrder: 33,
    options: [option(0, "紙と口頭が中心"), option(1, "担当者が表計算で管理"), option(2, "一部をインターネット上で共有"), option(3, "主な仕事を1か所で管理"), option(4, "数字を見て判断し、必要な連絡も自動で届く")]
  },
  {
    id: "G03", section: "growth", question: "新しい仕事や地域へ進むためのお金、人、時間を用意できますか。", weight: 3, critical: false, displayOrder: 34,
    options: [option(0, "用意できない"), option(1, "お金か人が足りない"), option(2, "小さく試すことはできる"), option(3, "予算と担当者を用意できる"), option(4, "期限、責任者、やめる判断まで決めている")]
  }
];

export const DIAGNOSIS_V2_QUESTION_BY_ID = new Map(
  DETAILED_DIAGNOSIS_QUESTIONS.map((question) => [question.id, question])
);

const DETAILED_QUESTION_HELP: Record<string, string> = {
  F03: "家賃、給料、保険料など、仕事が少ない月でも毎月出ていくお金を何か月払えるかを聞いています。",
  F04: "売上から材料代、外注費、給料などを引き、会社にいくら残ったかを毎月確認できる時期を聞いています。",
  P01: "100万円の工事から、材料代30万円、外注費30万円、職人代20万円を引くと、残る利益は20万円です。",
  K02: "経営事項審査は、公共工事に参加する建設会社が毎年受ける会社の審査です。",
  K03: "市町村や県の工事へ申し込むには、発注する役所への事前登録が必要です。",
  T02: "工事によっては、決められた資格を持つ責任者を現場へ置く必要があります。",
  I02: "支払う人と確認する人を分けると、間違いや不正を早く見つけやすくなります。",
  G02: "見積もり、現場写真、請求などを、会社の人が同じ情報を見られる状態にしているかを聞いています。"
};

export function getDetailedQuestionHelp(questionId: string) {
  return DETAILED_QUESTION_HELP[questionId];
}

export function getDetailedQuestionsForSection(section: DiagnosisV2SectionId) {
  return DETAILED_DIAGNOSIS_QUESTIONS.filter((question) => question.section === section);
}

export function getApplicableDetailedQuestions(context: DiagnosisV2ScoringContext = {}) {
  const publicWorksMode = context.publicWorkIntent
    ? getPublicWorksScoringMode(context.publicWorkIntent)
    : "included";
  const commonQuestions = publicWorksMode === "excluded"
    ? DETAILED_DIAGNOSIS_QUESTIONS.filter((question) => question.section !== "public_works")
    : DETAILED_DIAGNOSIS_QUESTIONS;
  const specialtyQuestions = context.includeSpecialty === false || !context.primaryTrade
    ? []
    : getSpecialtyQuestions(context.primaryTrade);
  return [...commonQuestions, ...specialtyQuestions];
}

export function getApplicableQuestionsForSection(
  section: DiagnosisV2SectionId,
  context: DiagnosisV2ScoringContext = {}
) {
  return getApplicableDetailedQuestions(context).filter((question) => question.section === section);
}

export function getDiagnosisV2AnswerScore(question: DiagnosisV2Question, answer: string | undefined) {
  return question.options.find((candidate) => candidate.value === answer)?.score ?? null;
}

export function scoreQuickDiagnosis(answers: DiagnosisV2AnswerMap): QuickDiagnosisResult {
  const unanswered = QUICK_DIAGNOSIS_QUESTIONS
    .filter((question) => !question.options.some((option) => option.value === answers[question.id]))
    .map((question) => question.id);
  const categoryScores = {} as Record<QuickDiagnosisCategory, number>;

  for (const category of Object.keys(QUICK_CATEGORY_LABELS) as QuickDiagnosisCategory[]) {
    const questions = QUICK_DIAGNOSIS_QUESTIONS.filter((question) => question.categories.includes(category));
    const earned = questions.reduce((sum, question) => {
      const answer = question.options.find((option) => option.value === answers[question.id]);
      return sum + (answer?.score ?? 0);
    }, 0);
    categoryScores[category] = roundOne((earned / (questions.length * 4)) * 100);
  }

  const earned = QUICK_DIAGNOSIS_QUESTIONS.reduce((sum, question) => {
    const answer = question.options.find((option) => option.value === answers[question.id]);
    return sum + (answer?.score ?? 0);
  }, 0);

  return {
    complete: unanswered.length === 0,
    unanswered,
    totalScore: unanswered.length === 0 ? roundOne((earned / (QUICK_DIAGNOSIS_QUESTIONS.length * 4)) * 100) : null,
    categoryScores
  };
}

export function scoreDetailedDiagnosis(
  answers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext = {}
): DiagnosisV2ScoringResult {
  const publicWorksMode = context.publicWorkIntent
    ? getPublicWorksScoringMode(context.publicWorkIntent)
    : "included";
  const applicableQuestions = getApplicableDetailedQuestions(context);
  const unanswered = applicableQuestions
    .filter((question) => getDiagnosisV2AnswerScore(question, answers[question.id]) === null)
    .map((question) => question.id);
  const axisScores: Partial<Record<DiagnosisV2SectionId, number>> = {};

  for (const section of DIAGNOSIS_V2_SECTIONS) {
    const questions = applicableQuestions.filter((question) => question.section === section.id);
    if (questions.length === 0) continue;
    const earned = questions.reduce((sum, question) => {
      const score = getDiagnosisV2AnswerScore(question, answers[question.id]);
      return sum + (score ?? 0) * question.weight;
    }, 0);
    const maximum = questions.reduce((sum, question) => sum + question.weight * 4, 0);
    axisScores[section.id] = roundOne((earned / maximum) * 100);
  }

  const criticalFlags = applicableQuestions
    .filter((question) => question.critical)
    .filter((question) => {
      const score = getDiagnosisV2AnswerScore(question, answers[question.id]);
      return score !== null && score <= 1;
    })
    .map((question) => question.id);

  if (unanswered.length > 0) {
    return {
      complete: false,
      unanswered,
      axisScores,
      totalScore: null,
      criticalFlags,
      judgment: null,
      publicWorksMode,
      applicableQuestionIds: applicableQuestions.map((question) => question.id)
    };
  }

  const totalQuestions = applicableQuestions.filter((question) =>
    publicWorksMode === "included" || question.section !== "public_works"
  );
  const earned = totalQuestions.reduce((sum, question) => {
    return sum + (getDiagnosisV2AnswerScore(question, answers[question.id]) ?? 0) * question.weight;
  }, 0);
  const maximum = totalQuestions.reduce((sum, question) => sum + question.weight * 4, 0);
  const totalScore = roundOne((earned / maximum) * 100);

  return {
    complete: true,
    unanswered,
    axisScores,
    totalScore,
    criticalFlags,
    judgment: getDiagnosisV2Judgment({
      totalScore,
      publicWorksScore: axisScores.public_works ?? 100,
      publicWorksIncluded: publicWorksMode === "included",
      criticalFlags,
      growthExecutionScore: getDiagnosisV2AnswerScore(DIAGNOSIS_V2_QUESTION_BY_ID.get("G03")!, answers.G03) ?? 0
    }),
    publicWorksMode,
    applicableQuestionIds: applicableQuestions.map((question) => question.id)
  };
}

export function getDiagnosisV2Judgment({
  totalScore,
  publicWorksScore,
  publicWorksIncluded = true,
  criticalFlags,
  growthExecutionScore
}: {
  totalScore: number;
  publicWorksScore: number;
  publicWorksIncluded?: boolean;
  criticalFlags: string[];
  growthExecutionScore: number;
}): DiagnosisV2Judgment {
  if (criticalFlags.length > 0) return "経営基盤の整備を優先";
  if (totalScore >= 75 && (!publicWorksIncluded || publicWorksScore >= 70)) return "自社対応可能＋必要時スポット支援";
  if (totalScore >= 55) return "一部支援推奨";
  if (growthExecutionScore >= 2) return "段階的な専門支援推奨";
  return "現時点では保留";
}

export function getDiagnosisV2OptionLabel(questionId: string, value: string | undefined) {
  const question = DIAGNOSIS_V2_QUESTION_BY_ID.get(questionId);
  return question?.options.find((option) => option.value === value)?.label
    ?? (ALL_SPECIALTY_QUESTIONS.some((candidate) => candidate.id === questionId)
      ? getSpecialtyQuestionLabel(questionId, value)
      : value ?? "未回答");
}

export function getQuickDiagnosisOptionLabel(questionId: string, value: string | undefined) {
  const question = QUICK_DIAGNOSIS_QUESTIONS.find((candidate) => candidate.id === questionId);
  return question?.options.find((option) => option.value === value)?.label ?? value ?? "未回答";
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
