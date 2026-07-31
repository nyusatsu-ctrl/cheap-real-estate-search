import {
  DIAGNOSIS_V2_QUESTION_BY_ID,
  DIAGNOSIS_V2_SECTIONS,
  getApplicableDetailedQuestions,
  getDiagnosisV2AnswerScore,
  getDiagnosisV2OptionLabel,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringContext,
  type DiagnosisV2ScoringResult,
  type DiagnosisV2SectionId
} from "./questions.ts";
import {
  ALL_SPECIALTY_QUESTIONS,
  buildSpecialtyDiagnosisSummary,
  getPublicWorkIntentLabel,
  type PublicWorksScoringMode,
  type SpecialtyDiagnosisSummary
} from "./specialty-questions.ts";

export type DiagnosisV2ResultSnapshot = {
  strengths: DiagnosisV2ResultItem[];
  priorities: DiagnosisV2ResultItem[];
  publicWorks: {
    mode?: PublicWorksScoringMode;
    title: string;
    summary: string;
    currentState: string[];
    expansionPotential: string;
    prerequisites: string[];
  };
  specialty: SpecialtyDiagnosisSummary | null;
  consultation?: {
    heading: string;
    body: string;
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
    issue: "毎月の利益、銀行にあるお金、まだ入っていないお金を早めに確認することが課題です。",
    month1: ["毎月の売上、費用、利益が分かる日を確認する", "今後13週間の入金と支払いの表を作る", "まだ入っていないお金を一覧にする"],
    month2: ["毎月必ず出るお金と、銀行にあるお金を比べる", "入金と支払いを確認する担当者と日を決める"],
    month3: ["毎月の会議で、利益、銀行のお金、入金の遅れを確認する"],
    support: "入金と支払いの予定、毎月の数字、銀行へ説明する資料を整える支援"
  },
  profit: {
    issue: "工事ごとの予定費用と最低限残したい利益を見て、仕事を受けるか決めることが課題です。",
    month1: ["最近の工事で、予定していた費用と実際の費用を比べる", "追加や変更になった工事の請求漏れを探す"],
    month2: ["工事ごとの費用予定と、最低限残したい利益を決める", "追加工事を書類に残す手順を決める"],
    month3: ["実際の費用と完成時の利益予測を毎月比べ、仕事を受ける判断に使う"],
    support: "工事ごとの費用管理、見積もりの基準、残る利益を増やす仕組みづくり"
  },
  sales: {
    issue: "これからの仕事、取引先への売上の偏り、仕事が決まりそうな度合いを一覧にすることが課題です。",
    month1: ["今後6か月の案件一覧を作る", "顧客別売上と依存度を確認する"],
    month2: ["仕事を受けるか断るかの基準を決める", "仕事ごとに、決まりそうな度合い、残る利益、必要人数を記録する"],
    month3: ["受注予測と人員計画を月次で更新する"],
    support: "営業案件管理、顧客依存改善、受注判断基準の設計"
  },
  public_works: {
    issue: "建設業の許可、公共工事に必要な会社の審査、役所への登録、資格を持つ人、書類の更新をまとめて管理することが課題です。",
    month1: ["持っている許可、会社の審査期限、今参加している役所を一覧にする", "国や国の機関で、まだ登録していない所を確認する"],
    month2: ["申請書類、担当者、年間更新管理を整える", "参加候補の発注機関を絞る"],
    month3: ["登録または案件探しを始め、準備がどこまで進んだか毎月確認する"],
    support: "許可、会社の審査、役所への登録を確認し、参加先ごとの計画を整理する支援"
  },
  technical: {
    issue: "資格を持つ人を各現場へ置けるか、協力会社、安全、法律の確認を、これからの仕事と合わせる必要があります。",
    month1: ["資格を持つ人の一覧と、どの現場へ置けるかを確認する", "協力会社を地域と工事の種類ごとに整理する"],
    month2: ["安全・法令・社会保険関係の不足を是正する", "代替可能な協力会社を確保する"],
    month3: ["資格を持つ人の予定表を、これからの仕事に合わせて更新する"],
    support: "必要な資格、現場の人員、安全と法律の不足を確認する支援"
  },
  organization: {
    issue: "社長だけが行っている判断と仕事を分け、代わりに行う人と決めてよい金額を定める必要があります。",
    month1: ["社長しかできない業務を一覧化する", "見積・発注・現場判断・支払承認を分解する"],
    month2: ["役割、代わりに行う人、決めてよい金額を決める", "採用、教育、会社を引き継ぐ準備の順番を決める"],
    month3: ["社長以外の人へ仕事を任せ、問題と特別な対応を記録する"],
    support: "社内の役割分け、仕事を任せる方法、採用、教育、会社を引き継ぐ計画の支援"
  },
  control: {
    issue: "支払承認、請求・入金照合、契約書類の管理を一人に集中させない体制が課題です。",
    month1: ["送金・返金・高額支払いの承認手順を確認する", "契約・請求・入金の不一致を洗い出す"],
    month2: ["支払いを2人で確認し、支払う人と確認する人を分ける", "契約、注文、請求、入金の書類を工事ごとにまとめる"],
    month3: ["誰が操作したか、入金遅れ、請求漏れ、車や道具の一覧を定期確認する"],
    support: "お金の間違いや不正を防ぐ確認方法と、書類、車、道具の管理を整える支援"
  },
  growth: {
    issue: "3年後の目標を、90日で行うこと、担当者、使うお金へ分ける必要があります。",
    month1: ["事業と投資候補を優先順位付けする", "紙・口頭・個人表計算の業務を洗い出す"],
    month2: ["3か月で確認する数字、担当者、期限、やめる条件を決める", "パソコンやスマホでの管理を小さく始める"],
    month3: ["決めた数字を確認し、次の仕事、地域、役所へお金を使うか決める"],
    support: "成長計画、毎月確認する数字、パソコンやスマホでの管理、お金を使う判断の支援"
  }
};

const CRITICAL_DETAILS: Record<string, string> = {
  F03: "銀行にあるお金が、家賃や給料などの毎月の支払いに足りなくなる可能性があります。仕事を増やす前に、銀行のお金と支払い予定を毎週確認してください。",
  T04: "安全の決まり、法律、社会保険、現場の人員が整っていないと、仕事を続けられない可能性があります。事実確認と改善を最優先にしてください。",
  I01: "銀行送金・返金・高額支払いを単独で実行できる状態は、誤送金や不正のリスクを高めます。二段階承認と上限設定が必要です。",
  I02: "請求、支払い、入金の確認を1人だけで終わらせず、別の担当者か社長も確認してください。",
  I03: "契約書、注文書、請求書、入金を工事ごとに追えないと、請求漏れや入金遅れの発見が遅れます。書類をまとめてください。",
  D02: "アスベスト、危険な物、地中の物、近所への影響の確認が足りません。法律違反、事故、追加費用を防ぐため、仕事を増やす前に直してください。",
  D04: "ゴミを運んだ場所、量、正しく処分したことを示す書類の管理が足りません。法律上必要な記録を最初に整えてください。",
  SC03: "資格、作業手順、点検、墜落防止等の安全管理に重大な不足があります。公共工事の有無にかかわらず、最優先で是正してください。"
};

const QUESTION_DETAILS: Record<string, string> = {
  P01: "工事金額だけでなく、予定している費用と最低限残したい利益を見て、仕事を受けるか決める仕組みが必要です。",
  P02: "工事が終わってから赤字を知るのではなく、工事中に実際の費用と完成時の利益予測を更新する必要があります。",
  P03: "追加・変更工事は、内容、金額、承認者、請求時期を書面で残し、請求漏れを防ぐ必要があります。",
  S02: "売上が1社に大きく偏ると、その会社の支払い条件が変わっただけで会社のお金が不足するおそれがあります。取引先ごとに残る利益と、別の取引先を確認してください。",
  S04: "今後6か月の案件を金額、確度、時期、必要人員で管理し、売上見込みと施工余力を同時に確認する必要があります。",
  K01: "現在と今後の工事分野に必要な許可業種、更新期限、変更届の状況を確認する必要があります。",
  K02: "公共工事に必要な会社の審査について、期限と点数を確認し、市町村、県、国の工事に参加する手続きを整理してください。",
  K04: "自治体だけでなく国・関連機関へ広げる場合は、発注者ごとの参加資格、所在地、技術者、実績要件を個別に確認する必要があります。",
  T01: "資格者が不足または1名に集中している場合、受注拡大前に配置要件と代替要員を確認してください。",
  T02: "現場の責任者や資格を持つ人を、いつどの現場へ置けるか一覧にし、仕事を選ぶ時に確認する必要があります。",
  O01: "社長が不在になると日常業務が止まる状態は、売上拡大の上限になります。見積、発注、現場判断、支払承認を分解し、代行者と決裁上限を定める必要があります。",
  O02: "役割と決裁権限を口頭だけにせず、金額・業務別の承認範囲と例外時の連絡先を明文化してください。",
  G01: "売上だけでなく、利益、力を入れる仕事、使うお金を含む3年後の目標を決め、90日で行うことへ分ける必要があります。",
  G02: "紙、口頭、担当者だけの表に分かれた情報を、工事、費用、資格、お客様ごとに1か所へまとめる余地があります。"
};

export function buildDiagnosisV2Result(
  answers: DiagnosisV2AnswerMap,
  scoring: DiagnosisV2ScoringResult,
  context: DiagnosisV2ScoringContext = {}
): DiagnosisV2ResultSnapshot {
  if (!scoring.complete || scoring.totalScore === null || !scoring.judgment) {
    throw new Error("A complete detailed diagnosis is required.");
  }

  const sortedSections = DIAGNOSIS_V2_SECTIONS
    .map((section) => ({ ...section, score: scoring.axisScores[section.id] }))
    .filter((section): section is typeof section & { score: number } => typeof section.score === "number")
    .sort((a, b) => b.score - a.score);

  const strengths = sortedSections
    .filter((section) => section.score >= 70)
    .slice(0, 2)
    .map((section) => ({
      id: section.id,
      label: section.shortLabel,
      score: section.score,
      detail: getStrengthDetail(section.id)
    }));

  const criticalSections = scoring.criticalFlags
    .map((flag) => getQuestionById(flag)?.section)
    .filter((section): section is DiagnosisV2SectionId => Boolean(section));
  const prioritySectionIds = [
    ...new Set([
      ...criticalSections,
      ...[...sortedSections].reverse().map((section) => section.id)
    ])
  ].slice(0, 3);

  const priorities = prioritySectionIds.map((sectionId) => {
    const section = DIAGNOSIS_V2_SECTIONS.find((candidate) => candidate.id === sectionId)!;
    const lowQuestion = getLowestQuestion(sectionId, answers, context);
    const criticalFlag = scoring.criticalFlags.find((flag) => getQuestionById(flag)?.section === sectionId);
    const sectionScore = scoring.axisScores[sectionId] ?? 0;
    return {
      id: sectionId,
      label: section.shortLabel,
      score: sectionScore,
      detail: criticalFlag
        ? CRITICAL_DETAILS[criticalFlag]
        : sectionScore >= 70
          ? `${getStrengthDetail(sectionId)} 現在の水準を維持し、記録と定期確認によって再現性を高めてください。`
        : QUESTION_DETAILS[lowQuestion?.id ?? ""] ?? AXIS_ACTIONS[sectionId].issue
    };
  });

  const publicWorks = buildPublicWorksDiagnosis(answers, scoring, context.publicWorkIntent);
  const specialty = context.includeSpecialty !== false && context.primaryTrade
    ? buildSpecialtyDiagnosisSummary(context.primaryTrade, answers)
    : null;
  const plan90Days = build90DayPlan(prioritySectionIds);
  if (specialty) {
    plan90Days.month1 = [...new Set([...specialty.plan90Days.slice(0, 2), ...plan90Days.month1])].slice(0, 6);
  }
  const selfServiceActions = buildSelfServiceActions(prioritySectionIds, scoring);
  const professionalSupportActions = buildProfessionalSupportActions(prioritySectionIds, scoring);
  const consultation = buildConsultationCopy(scoring.publicWorksMode);

  return {
    strengths,
    priorities,
    publicWorks,
    specialty,
    consultation,
    plan90Days,
    selfServiceActions,
    professionalSupportActions
  };
}

function getLowestQuestion(
  section: DiagnosisV2SectionId,
  answers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext
) {
  return getApplicableDetailedQuestions(context)
    .filter((question) => question.section === section)
    .map((question) => ({
      question,
      score: getDiagnosisV2AnswerScore(question, answers[question.id]) ?? 4
    }))
    .sort((a, b) => a.score - b.score || b.question.weight - a.question.weight)[0]?.question;
}

function getQuestionById(id: string) {
  return DIAGNOSIS_V2_QUESTION_BY_ID.get(id)
    ?? ALL_SPECIALTY_QUESTIONS.find((question) => question.id === id);
}

function getStrengthDetail(section: DiagnosisV2SectionId) {
  const details: Record<DiagnosisV2SectionId, string> = {
    finance: "利益、銀行にあるお金、まだ入っていないお金を続けて確認する土台があります。",
    profit: "工事ごとに残る利益と実際の費用を、仕事を受ける判断と工事中の確認に使えています。",
    sales: "これから入りそうな仕事と取引先の偏りを整理し、仕事を選ぶ土台があります。",
    public_works: "建設業の許可、公共工事に必要な会社の審査、役所への登録を使い、参加先を考えられる状態です。",
    technical: "資格を持つ人、現場の人員、協力会社、安全の確認を、仕事を増やす準備につなげられます。",
    organization: "社長以外の人の役割と決めてよい範囲があり、社内で仕事を続けられる土台があります。",
    control: "支払い、請求、入金の書類、車や道具を複数の人で確認する土台があります。",
    growth: "目標、使えるお金、パソコンやスマホでの管理を、90日間に行うことへつなげられる状態です。"
  };
  return details[section];
}

function buildPublicWorksDiagnosis(
  answers: DiagnosisV2AnswerMap,
  scoring: DiagnosisV2ScoringResult,
  publicWorkIntent: string | null | undefined
): DiagnosisV2ResultSnapshot["publicWorks"] {
  if (scoring.publicWorksMode === "excluded") {
    return {
      mode: "excluded",
      title: "公共工事は総合評価の対象外です",
      summary: "公共工事は、御社の今の希望に合わせて総合点に入れていません。公共工事に必要な会社の審査や役所への登録がないことを、会社の弱点とは判定していません。",
      currentState: [`公共工事への意向: ${getPublicWorkIntentLabel(publicWorkIntent)}`],
      expansionPotential: "今後、公共工事を考える場合は、建設業の許可、資格を持つ人、会社の審査、役所への登録の順に確認できます。",
      prerequisites: ["今は、民間工事の取り方、工事で残る利益、現場の人員と安全の改善を優先してください。"]
    };
  }

  const values = ["K01", "K02", "K03", "K04", "K05", "T01", "T02", "T03"].map((id) => ({
    id,
    score: getDiagnosisV2AnswerScore(DIAGNOSIS_V2_QUESTION_BY_ID.get(id)!, answers[id]) ?? 0,
    label: getDiagnosisV2OptionLabel(id, answers[id])
  }));
  const byId = Object.fromEntries(values.map((value) => [value.id, value]));
  const score = scoring.axisScores.public_works ?? 0;
  const title = score >= 70
    ? "参加先拡大を具体的に検討できる段階"
    : score >= 45
      ? "不足要件を整えながら段階的に参加する段階"
      : "参加に必要な許可、会社の審査、人員を確認する段階";

  const currentState = [
    `建設業許可: ${byId.K01.label}`,
    `公共工事に必要な会社の審査: ${byId.K02.label}`,
    `市町村・県への登録と参加: ${byId.K03.label}`,
    `国・関連機関: ${byId.K04.label}`,
    `実績・書類・担当体制: ${byId.K05.label}`,
    `資格を持つ人: ${byId.T01.label}`,
    `現場へ責任者を置ける余裕: ${byId.T02.label}`,
    `協力会社: ${byId.T03.label}`
  ];

  const prerequisites: string[] = [];
  if (byId.K01.score <= 2) prerequisites.push("必要な許可業種と更新・変更届の状況を確認する");
  if (byId.K02.score <= 2) prerequisites.push("公共工事に必要な会社の審査を受けているか、期限、点数を確認する");
  if (byId.K03.score <= 2) prerequisites.push("市町村や県の工事へ参加するための登録先を整理する");
  if (byId.K04.score <= 2) prerequisites.push("国・関連機関ごとの参加資格、所在地、実績要件を調査する");
  if (byId.T01.score <= 2 || byId.T02.score <= 2) prerequisites.push("技術者要件と案件ごとの配置可能状況を確認する");
  if (byId.K05.score <= 2) prerequisites.push("申請・更新・実績・案件書類の担当者と期限管理を決める");
  if (prerequisites.length === 0) prerequisites.push("参加先候補ごとに個別の資格・技術者・所在地要件を照合する");

  return {
    mode: scoring.publicWorksMode,
    title,
    summary: scoring.publicWorksMode === "reference"
      ? "公共工事は参考として表示し、総合点には入れていません。回答から、許可、会社の審査、役所への登録、資格を持つ人、書類の準備を確認できます。"
      : "回答を見る限り、市町村や県以外の国の機関へ参加先を広げられる可能性があります。ただし、許可、会社の審査、資格を持つ人、所在地、現場の人員、発注する機関ごとの条件を確認する必要があります。",
    currentState,
    expansionPotential: score >= 70
      ? "現在の参加体制を活用し、国・関連機関を含む参加先を選別して案件探索の幅を広げられる可能性があります。"
      : "不足項目を順番に整えることで、現在より参加候補となる発注機関を増やせる可能性があります。",
    prerequisites
  };
}

function buildConsultationCopy(mode: PublicWorksScoringMode) {
  if (mode === "included") {
    return {
      heading: "公共工事への参加先拡大や体制整備について相談する",
      body: "診断結果をもとに、建設業の許可、公共工事に必要な会社の審査、資格を持つ人、役所への登録と、工事業種ごとの課題を整理できます。"
    };
  }
  if (mode === "reference") {
    return {
      heading: "御社が公共工事へ進める状態か確認する",
      body: "公共工事を総合点へ含めず、将来検討する場合に必要となる条件を確認できます。"
    };
  }
  return {
    heading: "診断結果について個別に確認する",
    body: "診断結果の内容や、今後公共工事を検討する場合の条件について確認したい方は、個別相談をご利用ください。"
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
