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
  { id: "finance", label: "財務・資金繰り", shortLabel: "財務", description: "利益、手元資金、月次決算、債権管理を確認します。" },
  { id: "profit", label: "原価・収益管理", shortLabel: "原価", description: "工事別粗利益、実績原価、追加工事、赤字工事を確認します。" },
  { id: "sales", label: "受注基盤・営業", shortLabel: "受注", description: "受注残、顧客依存、受注判断、案件見込みを確認します。" },
  { id: "public_works", label: "公共工事参入体制", shortLabel: "公共工事", description: "許可、経審、入札資格、参加実績、書類体制を確認します。" },
  { id: "technical", label: "施工・技術体制", shortLabel: "施工", description: "資格者、配置余力、協力会社、安全・法令管理を確認します。" },
  { id: "organization", label: "組織・人材", shortLabel: "組織", description: "社長依存、権限、採用育成、承継体制を確認します。" },
  { id: "control", label: "内部統制・管理", shortLabel: "内部統制", description: "支払承認、職務分離、証憑、資産管理を確認します。" },
  { id: "growth", label: "成長実行力・DX", shortLabel: "成長", description: "成長目標、デジタル化、投資余力を確認します。" }
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
    question: "直近3期の売上は、増加・横ばい・減少のどれですか。",
    options: [
      { value: "4", label: "増加", score: 4 },
      { value: "2", label: "横ばい", score: 2 },
      { value: "0", label: "減少", score: 0 },
      { value: "1", label: "不明", score: 1 }
    ],
    categories: ["management", "growth"],
    displayOrder: 1
  },
  { id: "Q02", question: "直近決算は営業黒字ですか。", options: STANDARD_OPTIONS, categories: ["management", "profit"], displayOrder: 2 },
  { id: "Q03", question: "月次の利益と資金残高を翌月中に確認できますか。", options: STANDARD_OPTIONS, categories: ["management", "profit"], displayOrder: 3 },
  { id: "Q04", question: "工事ごとの予定粗利益と実際の粗利益を把握していますか。", options: STANDARD_OPTIONS, categories: ["profit"], displayOrder: 4 },
  { id: "Q05", question: "社長が1週間不在でも通常業務は回りますか。", options: STANDARD_OPTIONS, categories: ["organization"], displayOrder: 5 },
  { id: "Q06", question: "経営事項審査を毎年受けていますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 6 },
  { id: "Q07", question: "現在、自治体入札に継続参加していますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 7 },
  { id: "Q08", question: "国・関連機関の建設工事に参加していますか。", options: STANDARD_OPTIONS, categories: ["public_works"], displayOrder: 8 },
  { id: "Q09", question: "有資格技術者と現場配置余力を一覧で把握していますか。", options: STANDARD_OPTIONS, categories: ["organization", "public_works"], displayOrder: 9 },
  { id: "Q10", question: "今後3年で、公共工事の参加先または会社の売上・利益を増やしたいですか。", options: STANDARD_OPTIONS, categories: ["growth"], displayOrder: 10 }
];

export const QUICK_CATEGORY_LABELS: Record<QuickDiagnosisCategory, string> = {
  management: "経営基盤",
  profit: "収益管理",
  organization: "組織体制",
  public_works: "公共工事への参入余地",
  growth: "成長意欲"
};

const option = (score: number, label: string): DiagnosisV2Option => ({
  value: String(score),
  label,
  score
});

export const DETAILED_DIAGNOSIS_QUESTIONS: DiagnosisV2Question[] = [
  {
    id: "F01", section: "finance", question: "直近3期の売上高はどのように推移していますか。", weight: 2, critical: false, displayOrder: 1,
    options: [option(0, "3期連続で大幅減少"), option(1, "減少傾向"), option(2, "横ばい"), option(3, "増加傾向"), option(4, "安定して増加")]
  },
  {
    id: "F02", section: "finance", question: "直近3期の営業利益または経常利益はどのような状態ですか。", weight: 3, critical: false, displayOrder: 2,
    options: [option(0, "連続赤字"), option(1, "赤字と黒字を反復"), option(2, "低水準の黒字"), option(3, "安定黒字"), option(4, "利益率も改善")]
  },
  {
    id: "F03", section: "finance", question: "手元資金で固定費を何か月分まかなえますか。", weight: 3, critical: true, displayOrder: 3,
    options: [option(0, "1か月未満"), option(1, "1～2か月"), option(2, "3か月"), option(3, "4～6か月"), option(4, "7か月以上")]
  },
  {
    id: "F04", section: "finance", question: "月次試算表は翌月のいつまでに確定しますか。", weight: 2, critical: false, displayOrder: 4,
    options: [option(0, "作成していない"), option(1, "3か月超"), option(2, "翌々月"), option(3, "翌月末"), option(4, "翌月15日頃まで")]
  },
  {
    id: "F05", section: "finance", question: "未回収債権・支払遅延の管理状況はどうですか。", weight: 2, critical: false, displayOrder: 5,
    options: [option(0, "把握できていない"), option(1, "長期滞留が多い"), option(2, "一覧はあるが対応が遅い"), option(3, "月次で確認している"), option(4, "早期警告と回収手順がある")]
  },
  {
    id: "P01", section: "profit", question: "工事・案件ごとの粗利益を受注前に把握していますか。", weight: 3, critical: false, displayOrder: 6,
    options: [option(0, "把握していない"), option(1, "概算のみ"), option(2, "主要案件のみ"), option(3, "原則全件"), option(4, "最低利益基準まで設定")]
  },
  {
    id: "P02", section: "profit", question: "工事ごとに予算と実績原価を比較していますか。", weight: 3, critical: false, displayOrder: 7,
    options: [option(0, "していない"), option(1, "赤字時のみ"), option(2, "完工後のみ"), option(3, "月次で比較"), option(4, "進行中に完成予測を修正")]
  },
  {
    id: "P03", section: "profit", question: "追加・変更工事の記録と請求は徹底されていますか。", weight: 2, critical: false, displayOrder: 8,
    options: [option(0, "口頭中心で請求漏れが多い"), option(1, "記録が不統一"), option(2, "主要案件のみ"), option(3, "書面化している"), option(4, "承認・証拠・請求まで標準化")]
  },
  {
    id: "P04", section: "profit", question: "資材費・労務費の上昇を見積・契約価格へ反映できていますか。", weight: 2, critical: false, displayOrder: 9,
    options: [option(0, "ほぼできない"), option(1, "一部のみ"), option(2, "案件による"), option(3, "原則反映"), option(4, "根拠資料と交渉手順がある")]
  },
  {
    id: "P05", section: "profit", question: "赤字工事の発生頻度と原因分析はどうですか。", weight: 2, critical: false, displayOrder: 10,
    options: [option(0, "頻発しており原因不明"), option(1, "頻発しており属人的対応"), option(2, "時々発生"), option(3, "原因分析と再発防止を実施"), option(4, "受注判断にも反映")]
  },
  {
    id: "S01", section: "sales", question: "現在の受注残は、固定費の何か月分をカバーしていますか。", weight: 2, critical: false, displayOrder: 11,
    options: [option(0, "1か月未満"), option(1, "1～2か月"), option(2, "3か月"), option(3, "4～6か月"), option(4, "7か月以上")]
  },
  {
    id: "S02", section: "sales", question: "売上上位1社への依存度はどの程度ですか。", weight: 2, critical: false, displayOrder: 12,
    options: [option(0, "70％以上"), option(1, "50～69％"), option(2, "30～49％"), option(3, "15～29％"), option(4, "15％未満")]
  },
  {
    id: "S03", section: "sales", question: "受注する案件・見送る案件の判断基準がありますか。", weight: 2, critical: false, displayOrder: 13,
    options: [option(0, "社長の感覚のみ"), option(1, "価格中心"), option(2, "一部基準あり"), option(3, "利益・人員・資金で判断"), option(4, "案件評価を記録している")]
  },
  {
    id: "S04", section: "sales", question: "今後6か月の案件見込みを一覧で管理していますか。", weight: 2, critical: false, displayOrder: 14,
    options: [option(0, "管理していない"), option(1, "社長の記憶のみ"), option(2, "案件一覧のみ"), option(3, "確度・金額・時期を管理"), option(4, "受注予測と人員計画へ反映")]
  },
  {
    id: "K01", section: "public_works", question: "必要な建設業許可業種を保有し、更新管理できていますか。", weight: 3, critical: false, displayOrder: 15,
    options: [option(0, "不足または失効リスクあり"), option(1, "一部不足"), option(2, "現状業務分のみ"), option(3, "成長分野も含めて保有"), option(4, "更新・変更届まで管理")]
  },
  {
    id: "K02", section: "public_works", question: "経営事項審査を継続して受審していますか。", weight: 3, critical: false, displayOrder: 16,
    options: [option(0, "未受審"), option(1, "過去のみ・期限切れ"), option(2, "受審中"), option(3, "毎年継続"), option(4, "点数改善まで計画")]
  },
  {
    id: "K03", section: "public_works", question: "自治体の入札参加資格・実績はどの程度ありますか。", weight: 3, critical: false, displayOrder: 17,
    options: [option(0, "未参加"), option(1, "申請準備中"), option(2, "資格あり・実績なし"), option(3, "継続参加"), option(4, "複数自治体で実績あり")]
  },
  {
    id: "K04", section: "public_works", question: "国・関連機関の建設工事への参加体制はどの程度ですか。", weight: 3, critical: false, displayOrder: 18,
    options: [option(0, "未調査"), option(1, "関心のみ"), option(2, "一部資格取得または申請中"), option(3, "複数機関へ参加可能"), option(4, "案件探索・入札運用まで実施")]
  },
  {
    id: "K05", section: "public_works", question: "公共工事に必要な実績・書類・担当体制を管理していますか。", weight: 2, critical: false, displayOrder: 19,
    options: [option(0, "未整備"), option(1, "都度対応"), option(2, "一部様式あり"), option(3, "標準化済み"), option(4, "期限・更新・案件情報を一元管理")]
  },
  {
    id: "T01", section: "technical", question: "施工分野に対応する有資格技術者は足りていますか。", weight: 3, critical: false, displayOrder: 20,
    options: [option(0, "明確に不足"), option(1, "1名に依存"), option(2, "現状案件分のみ"), option(3, "一定の余力あり"), option(4, "受注拡大に対応可能")]
  },
  {
    id: "T02", section: "technical", question: "現場代理人・主任技術者等の配置可能状況を把握していますか。", weight: 3, critical: false, displayOrder: 21,
    options: [option(0, "把握していない"), option(1, "都度確認"), option(2, "一覧はあるが更新不十分"), option(3, "最新一覧で管理"), option(4, "受注計画と連動")]
  },
  {
    id: "T03", section: "technical", question: "協力会社・下請ネットワークは安定していますか。", weight: 2, critical: false, displayOrder: 22,
    options: [option(0, "確保困難"), option(1, "特定1社へ依存"), option(2, "分野に偏りがある"), option(3, "複数社を確保"), option(4, "地域・業種別に代替先がある")]
  },
  {
    id: "T04", section: "technical", question: "安全・法令・社会保険・施工体制関係の管理状況はどうですか。", weight: 3, critical: true, displayOrder: 23,
    options: [option(0, "重大な未整備がある"), option(1, "指摘・是正が常態化"), option(2, "最低限対応"), option(3, "定期確認"), option(4, "教育・監査・記録まで実施")]
  },
  {
    id: "O01", section: "organization", question: "社長が不在でも日常業務と現場判断は回りますか。", weight: 3, critical: false, displayOrder: 24,
    options: [option(0, "ほぼ停止"), option(1, "大半が社長依存"), option(2, "一部代行可能"), option(3, "通常業務は継続"), option(4, "権限と代行者が明確")]
  },
  {
    id: "O02", section: "organization", question: "役割・決裁権限・責任範囲は明文化されていますか。", weight: 2, critical: false, displayOrder: 25,
    options: [option(0, "未定義"), option(1, "口頭のみ"), option(2, "一部のみ"), option(3, "主要業務で明確"), option(4, "例外承認や見直しも記録")]
  },
  {
    id: "O03", section: "organization", question: "採用・育成・定着に関する仕組みがありますか。", weight: 2, critical: false, displayOrder: 26,
    options: [option(0, "採用困難・離職が多い"), option(1, "場当たり的"), option(2, "採用または育成の一部"), option(3, "計画あり"), option(4, "採用・評価・育成まで連動")]
  },
  {
    id: "O04", section: "organization", question: "技術者の高齢化・後継者・事業承継への対応状況はどうですか。", weight: 2, critical: false, displayOrder: 27,
    options: [option(0, "未検討で期限が迫っている"), option(1, "課題認識のみ"), option(2, "候補または計画の一部"), option(3, "具体的計画あり"), option(4, "引継ぎ・育成を実行中")]
  },
  {
    id: "I01", section: "control", question: "銀行送金・返金・高額支払いに二段階承認がありますか。", weight: 3, critical: true, displayOrder: 28,
    options: [option(0, "単独で自由に実行可能"), option(1, "形式的確認のみ"), option(2, "高額分のみ一部確認"), option(3, "二段階承認"), option(4, "権限・上限・操作履歴まで管理")]
  },
  {
    id: "I02", section: "control", question: "請求・支払・入金照合を同一人物だけで完結させない体制ですか。", weight: 3, critical: true, displayOrder: 29,
    options: [option(0, "1人で完結"), option(1, "実質1人"), option(2, "月末のみ別の人が確認"), option(3, "職務を分離"), option(4, "外部または代表の定期監査あり")]
  },
  {
    id: "I03", section: "control", question: "契約書・注文書・請求書・入金を案件単位で紐付けていますか。", weight: 3, critical: true, displayOrder: 30,
    options: [option(0, "散在しており確認不能"), option(1, "紙中心で不一致がある"), option(2, "一部電子化"), option(3, "案件単位で一元管理"), option(4, "未収・請求漏れを自動警告")]
  },
  {
    id: "I04", section: "control", question: "車両・機械・工具・在庫等の資産管理は正確ですか。", weight: 2, critical: false, displayOrder: 31,
    options: [option(0, "所在・数量が不明"), option(1, "台帳と現物が不一致"), option(2, "年1回確認"), option(3, "定期照合"), option(4, "移動・処分・貸出まで記録")]
  },
  {
    id: "G01", section: "growth", question: "3年後の売上・利益・事業構成の目標がありますか。", weight: 2, critical: false, displayOrder: 32,
    options: [option(0, "目標なし"), option(1, "売上目標のみ"), option(2, "数値と方向性あり"), option(3, "事業別計画あり"), option(4, "月次KPIと投資計画まで設定")]
  },
  {
    id: "G02", section: "growth", question: "業務のデジタル化・自動化はどの程度進んでいますか。", weight: 2, critical: false, displayOrder: 33,
    options: [option(0, "紙・口頭中心"), option(1, "表計算の個人管理"), option(2, "一部クラウド化"), option(3, "主要業務を一元化"), option(4, "データで意思決定・自動通知")]
  },
  {
    id: "G03", section: "growth", question: "新しい事業・地域・発注機関へ進むための投資余力と担当時間がありますか。", weight: 3, critical: false, displayOrder: 34,
    options: [option(0, "余力なし"), option(1, "資金または人員が不足"), option(2, "小規模な検証なら可能"), option(3, "予算・担当を確保可能"), option(4, "期限・責任者・撤退基準まで設定")]
  }
];

export const DIAGNOSIS_V2_QUESTION_BY_ID = new Map(
  DETAILED_DIAGNOSIS_QUESTIONS.map((question) => [question.id, question])
);

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
