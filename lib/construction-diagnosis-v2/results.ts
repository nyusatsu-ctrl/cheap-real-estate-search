import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_V2_QUESTION_BY_ID,
  DIAGNOSIS_V2_SECTIONS,
  getDiagnosisV2AnswerScore,
  getDiagnosisV2OptionLabel,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringResult,
  type DiagnosisV2SectionId
} from "@/lib/construction-diagnosis-v2/questions";

export type DiagnosisV2ResultSnapshot = {
  strengths: DiagnosisV2ResultItem[];
  priorities: DiagnosisV2ResultItem[];
  publicWorks: {
    title: string;
    summary: string;
    currentState: string[];
    expansionPotential: string;
    prerequisites: string[];
  };
  plan90Days: {
    month1: string[];
    month2: string[];
    month3: string[];
  };
  selfServiceActions: string[];
  professionalSupportActions: string[];
};

export type DiagnosisV2ResultItem = {
  id: string;
  label: string;
  score: number;
  detail: string;
};

const AXIS_ACTIONS: Record<DiagnosisV2SectionId, {
  issue: string;
  month1: string[];
  month2: string[];
  month3: string[];
  support: string;
}> = {
  finance: {
    issue: "月次の利益・資金残高・未回収債権を早い時点で確認できる管理体制が課題です。",
    month1: ["月次試算表の確定時期を確認する", "13週間資金繰り表を作る", "未回収債権を一覧化する"],
    month2: ["固定費と手元資金の関係を確認する", "資金繰りの確認担当と更新日を決める"],
    month3: ["月次会議で利益・資金残高・回収状況を継続確認する"],
    support: "資金繰り、月次管理、金融機関説明資料の整備"
  },
  profit: {
    issue: "工事ごとの予定原価と最低粗利益を基準に、受注・見送りを判断する仕組みが課題です。",
    month1: ["直近工事の予定原価と実績原価を確認する", "追加・変更工事の請求漏れを洗い出す"],
    month2: ["工事別予算と最低粗利益基準を作る", "追加工事を書面化する手順を決める"],
    month3: ["実績原価と完成予測を月次比較し、受注判断へ反映する"],
    support: "工事別原価管理、見積基準、粗利益改善の仕組みづくり"
  },
  sales: {
    issue: "受注残、顧客依存度、案件確度を一覧化し、利益と施工余力で受注判断する体制が課題です。",
    month1: ["今後6か月の案件一覧を作る", "顧客別売上と依存度を確認する"],
    month2: ["受注・見送り基準を決める", "案件ごとの確度・粗利益・必要人員を記録する"],
    month3: ["受注予測と人員計画を月次で更新する"],
    support: "営業案件管理、顧客依存改善、受注判断基準の設計"
  },
  public_works: {
    issue: "建設業許可、経審、参加資格、技術者、書類更新を一体で管理する体制が課題です。",
    month1: ["許可業種、経審期限、現在の参加先を一覧化する", "国・関連機関への未申請分を確認する"],
    month2: ["申請書類、担当者、年間更新管理を整える", "参加候補の発注機関を絞る"],
    month3: ["申請または案件探索を開始し、入札準備の進捗KPIを運用する"],
    support: "許可・経審・参加資格の確認と、発注機関別の参入計画整理"
  },
  technical: {
    issue: "資格者と現場配置余力、協力会社、安全・法令関係を受注計画と連動させる必要があります。",
    month1: ["資格者一覧と現場配置余力を確認する", "協力会社を地域・業種別に整理する"],
    month2: ["安全・法令・社会保険関係の不足を是正する", "代替可能な協力会社を確保する"],
    month3: ["技術者配置表を受注計画と連動して更新する"],
    support: "技術者要件、施工体制、安全・法令管理の不足確認"
  },
  organization: {
    issue: "社長に集中している判断と業務を分解し、代行者と決裁上限を定める必要があります。",
    month1: ["社長しかできない業務を一覧化する", "見積・発注・現場判断・支払承認を分解する"],
    month2: ["役割、代行者、決裁上限を決める", "採用・育成・承継の優先課題を整理する"],
    month3: ["権限移譲を試行し、問題点と例外処理を記録する"],
    support: "組織設計、権限移譲、採用育成・事業承継計画"
  },
  control: {
    issue: "支払承認、請求・入金照合、契約書類の管理を一人に集中させない体制が課題です。",
    month1: ["送金・返金・高額支払いの承認手順を確認する", "契約・請求・入金の不一致を洗い出す"],
    month2: ["二段階承認と職務分離を導入する", "案件単位で証憑を紐付ける"],
    month3: ["操作履歴、未収、請求漏れ、資産台帳を定期確認する"],
    support: "内部統制、職務分離、証憑・資産管理の整備"
  },
  growth: {
    issue: "3年後の事業目標を90日単位のKPI、責任者、投資判断へ落とし込む必要があります。",
    month1: ["事業と投資候補を優先順位付けする", "紙・口頭・個人表計算の業務を洗い出す"],
    month2: ["3か月のKPI、責任者、期限、撤退基準を決める", "小規模なデジタル化を始める"],
    month3: ["KPIを確認し、次の事業・地域・発注機関への投資判断を行う"],
    support: "成長計画、KPI、業務デジタル化、投資判断の設計"
  }
};

const CRITICAL_DETAILS: Record<string, string> = {
  F03: "手元資金が固定費に対して不足する可能性があります。受注拡大より先に、資金残高と支払予定を週次で確認してください。",
  T04: "安全・法令・社会保険・施工体制の未整備は、受注継続や公共工事参加の前提に関わります。事実確認と是正を最優先にしてください。",
  I01: "銀行送金・返金・高額支払いを単独で実行できる状態は、誤送金や不正のリスクを高めます。二段階承認と上限設定が必要です。",
  I02: "請求・支払・入金照合を同一人物だけで完結させず、別担当または代表者による確認を導入してください。",
  I03: "契約書・注文書・請求書・入金が案件単位で追えない状態は、請求漏れや未収の発見を遅らせます。証憑の一元化が必要です。"
};

const QUESTION_DETAILS: Record<string, string> = {
  P01: "受注金額ではなく、工事ごとの予定原価と最低粗利益を基準に、受注・見送りを判断できる仕組みが必要です。",
  P02: "完工後に赤字を知るのではなく、進行中に実績原価と完成予測を更新する運用が必要です。",
  P03: "追加・変更工事は、内容、金額、承認者、請求時期を書面で残し、請求漏れを防ぐ必要があります。",
  S02: "売上上位顧客への依存が高い場合、取引条件の変更が資金繰りへ直結します。顧客別粗利益と代替受注先を確認してください。",
  S04: "今後6か月の案件を金額、確度、時期、必要人員で管理し、売上見込みと施工余力を同時に確認する必要があります。",
  K01: "現在と今後の工事分野に必要な許可業種、更新期限、変更届の状況を確認する必要があります。",
  K02: "経審の有効期限と点数を確認し、自治体や国・関連機関への参加に必要な手続きを整理してください。",
  K04: "自治体だけでなく国・関連機関へ広げる場合は、発注者ごとの参加資格、所在地、技術者、実績要件を個別に確認する必要があります。",
  T01: "資格者が不足または1名に集中している場合、受注拡大前に配置要件と代替要員を確認してください。",
  T02: "現場代理人・主任技術者等の配置可能時期を一覧化し、案件選定と連動させる必要があります。",
  O01: "社長が不在になると日常業務が止まる状態は、売上拡大の上限になります。見積、発注、現場判断、支払承認を分解し、代行者と決裁上限を定める必要があります。",
  O02: "役割と決裁権限を口頭だけにせず、金額・業務別の承認範囲と例外時の連絡先を明文化してください。",
  G01: "売上だけでなく利益、事業構成、投資額を含む3年目標を決め、90日単位のKPIへ落とし込む必要があります。",
  G02: "紙・口頭・個人表計算に分散した情報を、案件・原価・資格・顧客ごとに一元化する余地があります。"
};

export function buildDiagnosisV2Result(
  answers: DiagnosisV2AnswerMap,
  scoring: DiagnosisV2ScoringResult
): DiagnosisV2ResultSnapshot {
  if (!scoring.complete || scoring.totalScore === null || !scoring.judgment) {
    throw new Error("A complete detailed diagnosis is required.");
  }

  const sortedSections = DIAGNOSIS_V2_SECTIONS
    .map((section) => ({ ...section, score: scoring.axisScores[section.id] }))
    .sort((a, b) => b.score - a.score);

  const strengths = sortedSections
    .filter((section) => section.score >= 70)
    .slice(0, 2)
    .map((section) => ({
      id: section.id,
      label: section.label,
      score: section.score,
      detail: getStrengthDetail(section.id)
    }));

  const criticalSections = scoring.criticalFlags
    .map((flag) => DIAGNOSIS_V2_QUESTION_BY_ID.get(flag)?.section)
    .filter((section): section is DiagnosisV2SectionId => Boolean(section));
  const prioritySectionIds = [
    ...new Set([
      ...criticalSections,
      ...[...sortedSections].reverse().map((section) => section.id)
    ])
  ].slice(0, 3);

  const priorities = prioritySectionIds.map((sectionId) => {
    const section = DIAGNOSIS_V2_SECTIONS.find((candidate) => candidate.id === sectionId)!;
    const lowQuestion = getLowestQuestion(sectionId, answers);
    const criticalFlag = scoring.criticalFlags.find((flag) => DIAGNOSIS_V2_QUESTION_BY_ID.get(flag)?.section === sectionId);
    return {
      id: sectionId,
      label: section.label,
      score: scoring.axisScores[sectionId],
      detail: criticalFlag
        ? CRITICAL_DETAILS[criticalFlag]
        : QUESTION_DETAILS[lowQuestion?.id ?? ""] ?? AXIS_ACTIONS[sectionId].issue
    };
  });

  const publicWorks = buildPublicWorksDiagnosis(answers, scoring);
  const plan90Days = build90DayPlan(prioritySectionIds);
  const selfServiceActions = buildSelfServiceActions(prioritySectionIds, scoring);
  const professionalSupportActions = buildProfessionalSupportActions(prioritySectionIds, scoring);

  return {
    strengths,
    priorities,
    publicWorks,
    plan90Days,
    selfServiceActions,
    professionalSupportActions
  };
}

function getLowestQuestion(section: DiagnosisV2SectionId, answers: DiagnosisV2AnswerMap) {
  return DETAILED_DIAGNOSIS_QUESTIONS
    .filter((question) => question.section === section)
    .map((question) => ({
      question,
      score: getDiagnosisV2AnswerScore(question, answers[question.id]) ?? 4
    }))
    .sort((a, b) => a.score - b.score || b.question.weight - a.question.weight)[0]?.question;
}

function getStrengthDetail(section: DiagnosisV2SectionId) {
  const details: Record<DiagnosisV2SectionId, string> = {
    finance: "利益・資金・債権を継続確認する経営管理の基礎が整っています。",
    profit: "工事別の粗利益と原価を受注判断・進行管理へ活用できています。",
    sales: "受注見込みと顧客構成を整理し、案件を選ぶ基盤があります。",
    public_works: "許可・経審・参加資格を活用し、公共工事の参加先を検討できる状態です。",
    technical: "資格者、配置、協力会社、安全管理を受注拡大へつなげられる体制があります。",
    organization: "社長以外の役割と権限があり、組織で業務を継続できる基盤があります。",
    control: "支払・請求・証憑・資産を複数の目で確認する管理基盤があります。",
    growth: "目標、投資余力、デジタル化を90日単位の実行へつなげられる状態です。"
  };
  return details[section];
}

function buildPublicWorksDiagnosis(
  answers: DiagnosisV2AnswerMap,
  scoring: DiagnosisV2ScoringResult
): DiagnosisV2ResultSnapshot["publicWorks"] {
  const values = ["K01", "K02", "K03", "K04", "K05", "T01", "T02", "T03"].map((id) => ({
    id,
    score: getDiagnosisV2AnswerScore(DIAGNOSIS_V2_QUESTION_BY_ID.get(id)!, answers[id]) ?? 0,
    label: getDiagnosisV2OptionLabel(id, answers[id])
  }));
  const byId = Object.fromEntries(values.map((value) => [value.id, value]));
  const score = scoring.axisScores.public_works;
  const title = score >= 70
    ? "参加先拡大を具体的に検討できる段階"
    : score >= 45
      ? "不足要件を整えながら段階的に参加する段階"
      : "参加前提となる許可・経審・体制を確認する段階";

  const currentState = [
    `建設業許可: ${byId.K01.label}`,
    `経営事項審査: ${byId.K02.label}`,
    `自治体入札: ${byId.K03.label}`,
    `国・関連機関: ${byId.K04.label}`,
    `実績・書類・担当体制: ${byId.K05.label}`,
    `有資格技術者: ${byId.T01.label}`,
    `現場配置余力: ${byId.T02.label}`,
    `協力会社: ${byId.T03.label}`
  ];

  const prerequisites: string[] = [];
  if (byId.K01.score <= 2) prerequisites.push("必要な許可業種と更新・変更届の状況を確認する");
  if (byId.K02.score <= 2) prerequisites.push("経審の受審状況、有効期限、点数を確認する");
  if (byId.K03.score <= 2) prerequisites.push("自治体の入札参加資格と現在の登録先を整理する");
  if (byId.K04.score <= 2) prerequisites.push("国・関連機関ごとの参加資格、所在地、実績要件を調査する");
  if (byId.T01.score <= 2 || byId.T02.score <= 2) prerequisites.push("技術者要件と案件ごとの配置可能状況を確認する");
  if (byId.K05.score <= 2) prerequisites.push("申請・更新・実績・案件書類の担当者と期限管理を決める");
  if (prerequisites.length === 0) prerequisites.push("参加先候補ごとに個別の資格・技術者・所在地要件を照合する");

  return {
    title,
    summary: "回答内容を見る限り、自治体以外の発注機関へ参加先を広げられる可能性があります。ただし、許可業種、経審、技術者、所在地、施工体制、発注者ごとの資格要件を個別に確認する必要があります。",
    currentState,
    expansionPotential: score >= 70
      ? "現在の参加体制を活用し、国・関連機関を含む参加先を選別して案件探索の幅を広げられる可能性があります。"
      : "不足項目を順番に整えることで、現在より参加候補となる発注機関を増やせる可能性があります。",
    prerequisites
  };
}

function build90DayPlan(sectionIds: DiagnosisV2SectionId[]) {
  const collect = (month: "month1" | "month2" | "month3", limit: number) => {
    const values = sectionIds.flatMap((sectionId) => AXIS_ACTIONS[sectionId][month]);
    return [...new Set(values)].slice(0, limit);
  };
  return {
    month1: collect("month1", 5),
    month2: collect("month2", 5),
    month3: collect("month3", 5)
  };
}

function buildSelfServiceActions(
  sectionIds: DiagnosisV2SectionId[],
  scoring: DiagnosisV2ScoringResult
) {
  const items = sectionIds.map((sectionId) => AXIS_ACTIONS[sectionId].month1[0]);
  if (scoring.judgment === "自社対応可能＋必要時スポット支援") {
    items.unshift("社内責任者と期限を決め、90日計画を自社で運用する");
  }
  return [...new Set(items)].slice(0, 5);
}

function buildProfessionalSupportActions(
  sectionIds: DiagnosisV2SectionId[],
  scoring: DiagnosisV2ScoringResult
) {
  if (scoring.judgment === "現時点では保留") {
    return ["現状資料と不足情報を整理し、支援が必要な範囲を改めて判断する"];
  }
  const items = sectionIds.map((sectionId) => AXIS_ACTIONS[sectionId].support);
  if (scoring.criticalFlags.length > 0) {
    items.unshift("重大フラグに関する事実確認と優先順位の整理");
  }
  return [...new Set(items)].slice(0, 5);
}
