"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Award,
  BadgePercent,
  BriefcaseBusiness,
  Coins,
  Copy,
  Crown,
  Gauge,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  Target
} from "lucide-react";

type AgeBand = "under25" | "25_29" | "30_34" | "35_39" | "40_49" | "50plus";
type IncomeBand = "under300" | "300_499" | "500_699" | "700_999" | "1000_1499" | "1500plus";
type TraitKey =
  | "careerFit"
  | "action"
  | "continuity"
  | "sales"
  | "management"
  | "independence"
  | "sideBusiness";

type FormState = {
  ageBand: AgeBand;
  incomeBand: IncomeBand;
  traits: Record<TraitKey, number>;
};

type TraitDefinition = {
  key: TraitKey;
  label: string;
  low: string;
  high: string;
  weight: number;
};

const AGE_OPTIONS: { value: AgeBand; label: string; runway: number }[] = [
  { value: "under25", label: "24歳以下", runway: 1.12 },
  { value: "25_29", label: "25〜29歳", runway: 1.1 },
  { value: "30_34", label: "30〜34歳", runway: 1.04 },
  { value: "35_39", label: "35〜39歳", runway: 1 },
  { value: "40_49", label: "40〜49歳", runway: 0.94 },
  { value: "50plus", label: "50歳以上", runway: 0.88 }
];

const INCOME_OPTIONS: { value: IncomeBand; label: string; amount: number }[] = [
  { value: "under300", label: "300万円未満", amount: 260 },
  { value: "300_499", label: "300〜499万円", amount: 400 },
  { value: "500_699", label: "500〜699万円", amount: 600 },
  { value: "700_999", label: "700〜999万円", amount: 850 },
  { value: "1000_1499", label: "1,000〜1,499万円", amount: 1200 },
  { value: "1500plus", label: "1,500万円以上", amount: 1700 }
];

const TRAITS: TraitDefinition[] = [
  { key: "careerFit", label: "職業適性", low: "合っていない", high: "かなり合っている", weight: 1.15 },
  { key: "action", label: "行動力", low: "慎重に動く", high: "すぐ動く", weight: 1.25 },
  { key: "continuity", label: "継続力", low: "続きにくい", high: "積み上げられる", weight: 1.15 },
  { key: "sales", label: "営業力", low: "苦手", high: "得意", weight: 1.2 },
  { key: "management", label: "管理能力", low: "感覚型", high: "仕組み化できる", weight: 1.05 },
  { key: "independence", label: "独立適性", low: "安定志向", high: "自分で取りに行く", weight: 1.15 },
  { key: "sideBusiness", label: "副業適性", low: "時間を作りにくい", high: "複数収入を作れる", weight: 1.05 }
];

const INITIAL_FORM: FormState = {
  ageBand: "30_34",
  incomeBand: "500_699",
  traits: {
    careerFit: 4,
    action: 4,
    continuity: 4,
    sales: 3,
    management: 3,
    independence: 3,
    sideBusiness: 3
  }
};

export function IncomePotentialDiagnosis() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const result = useMemo(() => calculateResult(form), [form]);

  const updateTrait = (key: TraitKey, value: number) => {
    setForm((current) => ({
      ...current,
      traits: {
        ...current.traits,
        [key]: value
      }
    }));
  };

  const copyResult = async () => {
    const lines = [
      `人生で到達し得る最高年収： 約${result.maxIncome.toLocaleString("ja-JP")}万円`,
      result.hasReachedThousand
        ? "年収1,000万円以上到達：到達済み"
        : `年収1,000万円以上到達確率：${result.probability}%`,
      result.hasReachedThousand && result.continuationLabel
        ? `継続・再到達可能性：${result.continuationLabel}`
        : "",
      `独立適性：${result.independenceLabel}`,
      `副業適性：${result.sideBusinessLabel}`,
      result.comment.join("\n")
    ].filter(Boolean);
    const text = lines.join("\n");

    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard access can be unavailable in non-secure local contexts.
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0a0f] text-stone-100">
      <section className="border-b border-[#2a2418] bg-[#0b0a0f]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded border border-[#8f6b2f] bg-[#18130d] px-3 py-1 text-xs font-black text-[#f4d58d]">
              <Sparkles className="h-4 w-4" />
              年収ポテンシャル診断
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-normal text-stone-50 md:text-5xl">
              人生で到達し得る最高年収を診断する
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 md:text-base">
              現在の年収、職業適性、行動力、継続力、営業力、管理能力、独立適性、副業適性から、年収の上限値と1,000万円到達可能性を算出します。
            </p>
          </div>

          <ResultCard result={result} compact />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-[#2a2418] bg-[#131016] p-4 shadow-2xl shadow-black/30 md:p-6">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[#f4d58d]" />
            <h2 className="text-lg font-black text-stone-50">入力</h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label htmlFor="ageBand" className="grid gap-2 text-sm font-bold text-stone-200">
              年齢帯
              <select
                id="ageBand"
                value={form.ageBand}
                onChange={(event) => setForm((current) => ({ ...current, ageBand: event.target.value as AgeBand }))}
                className="h-12 rounded border border-[#403626] bg-[#0b0a0f] px-3 text-stone-50 outline-none ring-offset-[#0b0a0f] focus:ring-2 focus:ring-[#f4d58d]"
              >
                {AGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="incomeBand" className="grid gap-2 text-sm font-bold text-stone-200">
              現在の年収
              <select
                id="incomeBand"
                value={form.incomeBand}
                onChange={(event) => setForm((current) => ({ ...current, incomeBand: event.target.value as IncomeBand }))}
                className="h-12 rounded border border-[#403626] bg-[#0b0a0f] px-3 text-stone-50 outline-none ring-offset-[#0b0a0f] focus:ring-2 focus:ring-[#f4d58d]"
              >
                {INCOME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-4">
            {TRAITS.map((trait) => (
              <TraitSlider
                key={trait.key}
                trait={trait}
                value={form.traits[trait.key]}
                onChange={(value) => updateTrait(trait.key, value)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setForm(INITIAL_FORM)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded border border-[#4b4030] bg-[#17130f] px-4 text-sm font-black text-stone-100 outline-none ring-offset-[#0b0a0f] hover:border-[#f4d58d] focus:ring-2 focus:ring-[#f4d58d]"
            >
              <RefreshCw className="h-4 w-4" />
              リセット
            </button>
            <button
              type="button"
              onClick={copyResult}
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#f4d58d] px-4 text-sm font-black text-[#14100a] outline-none ring-offset-[#0b0a0f] hover:bg-[#ffe4a6] focus:ring-2 focus:ring-[#f4d58d]"
            >
              <Copy className="h-4 w-4" />
              結果をコピー
            </button>
          </div>
        </section>

        <div className="hidden lg:sticky lg:top-5 lg:block">
          <ResultCard result={result} />
        </div>
      </div>
    </div>
  );
}

function TraitSlider({
  trait,
  value,
  onChange
}: {
  trait: TraitDefinition;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-[#2f281c] bg-[#0f0d12] p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={trait.key} className="text-sm font-black text-stone-100">
          {trait.label}
        </label>
        <div className="grid grid-cols-[32px_32px_32px] overflow-hidden rounded border border-[#3d3020] bg-[#17120d]">
          <button
            type="button"
            aria-label={`${trait.label}を下げる`}
            disabled={value <= 1}
            onClick={() => onChange(clamp(value - 1, 1, 5))}
            className="flex h-8 items-center justify-center text-stone-300 outline-none hover:bg-[#21170d] focus:ring-2 focus:ring-[#f4d58d] disabled:text-stone-700"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="inline-flex h-8 items-center justify-center border-x border-[#3d3020] px-2 text-sm font-black text-[#f4d58d]">
            {value}
          </span>
          <button
            type="button"
            aria-label={`${trait.label}を上げる`}
            disabled={value >= 5}
            onClick={() => onChange(clamp(value + 1, 1, 5))}
            className="flex h-8 items-center justify-center text-stone-300 outline-none hover:bg-[#21170d] focus:ring-2 focus:ring-[#f4d58d] disabled:text-stone-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <input
        id={trait.key}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer accent-[#f4d58d]"
      />
      <div className="mt-2 flex justify-between gap-3 text-xs font-semibold text-stone-500">
        <span>{trait.low}</span>
        <span className="text-right">{trait.high}</span>
      </div>
    </div>
  );
}

function ResultCard({ result, compact = false }: { result: ReturnType<typeof calculateResult>; compact?: boolean }) {
  return (
    <section className={`rounded-lg border border-[#8f6b2f] bg-[#17120d] shadow-2xl shadow-black/40 ${compact ? "p-4 lg:hidden" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-[#f4d58d]">Result</p>
          <h2 className="mt-1 text-xl font-black text-stone-50">診断結果</h2>
        </div>
        <Crown className="h-7 w-7 text-[#f4d58d]" />
      </div>

      <div className="mt-5 rounded-lg border border-[#3d3020] bg-[#0b0a0f] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-stone-300">
          <Award className="h-5 w-5 text-[#f4d58d]" />
          人生最高年収ポテンシャル
        </div>
        <p className="mt-3 text-sm font-bold text-stone-400">人生で到達し得る最高年収</p>
        <p className="mt-1 break-words text-4xl font-black leading-none tracking-normal text-stone-50 sm:text-5xl">
          約{result.maxIncome.toLocaleString("ja-JP")}万円
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {result.hasReachedThousand ? (
          <>
            <ResultMetric
              icon={<BadgePercent className="h-5 w-5 text-[#f4d58d]" />}
              label="年収1,000万円以上到達"
              value="到達済み"
            />
            {result.continuationLabel ? (
              <ResultMetric
                icon={<Gauge className="h-5 w-5 text-[#f4d58d]" />}
                label="継続・再到達可能性"
                value={result.continuationLabel}
              />
            ) : null}
          </>
        ) : (
          <ResultMetric
            icon={<BadgePercent className="h-5 w-5 text-[#f4d58d]" />}
            label="年収1,000万円以上到達確率"
            value={`${result.probability}%`}
          />
        )}
        <ResultMetric
          icon={<BriefcaseBusiness className="h-5 w-5 text-emerald-300" />}
          label="独立適性"
          value={result.independenceLabel}
        />
        <ResultMetric
          icon={<Coins className="h-5 w-5 text-sky-300" />}
          label="副業適性"
          value={result.sideBusinessLabel}
        />
      </div>

      <div className="mt-4 rounded-lg border border-[#3d3020] bg-[#21170d] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-[#f4d58d]">
          <Target className="h-4 w-4" />
          診断コメント
        </div>
        <div className="mt-3 grid gap-2 text-sm font-semibold leading-7 text-stone-200">
          {result.comment.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-[#3d3020] bg-[#0f0d12] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#201911]">{icon}</span>
        <p className="min-w-0 text-sm font-bold leading-5 text-stone-300">{label}</p>
      </div>
      <p className="shrink-0 text-xl font-black text-stone-50">{value}</p>
    </div>
  );
}

function calculateResult(form: FormState) {
  const currentIncome = INCOME_OPTIONS.find((option) => option.value === form.incomeBand)?.amount ?? 500;
  const ageRunway = AGE_OPTIONS.find((option) => option.value === form.ageBand)?.runway ?? 1;
  const weightedTotal = TRAITS.reduce((sum, trait) => sum + form.traits[trait.key] * trait.weight, 0);
  const maxTotal = TRAITS.reduce((sum, trait) => sum + 5 * trait.weight, 0);
  const abilityScore = Math.round((weightedTotal / maxTotal) * 100);
  const leverageScore = form.traits.sales * 1.15
    + form.traits.management
    + form.traits.independence * 1.15
    + form.traits.sideBusiness * 0.9;
  const habitScore = form.traits.action * 1.1 + form.traits.continuity * 1.1 + form.traits.careerFit;

  const rawPotential = currentIncome
    + abilityScore * 3.2 * ageRunway
    + leverageScore * 26
    + habitScore * 17
    + Math.max(0, currentIncome - 500) * 0.55;
  const maxIncome = roundToNearest(clamp(rawPotential, Math.max(currentIncome, 420), 4500), 50);

  const hasReachedThousand = currentIncome >= 1000;
  const probabilityBase = -24
    + abilityScore * 0.35
    + incomeProbabilityBonus(currentIncome)
    + form.traits.sales * 1.8
    + form.traits.management * 1.3
    + form.traits.independence * 1.5
    + form.traits.sideBusiness * 1.1
    + form.traits.action * 1.2
    + form.traits.continuity
    + Math.max(0, abilityScore - 60) * 0.55
    + (maxIncome >= 1000 ? Math.min(8, (maxIncome - 1000) / 100) : -5);
  const probability = hasReachedThousand ? null : Math.round(clamp(probabilityBase, 1, 88));
  const continuationProbability = hasReachedThousand
    ? Math.round(clamp(
      84
      + Math.max(0, abilityScore - 60) * 0.35
      + (currentIncome >= 1500 ? 4 : 0)
      + (maxIncome >= 2500 ? 3 : 0),
      86,
      96
    ))
    : null;
  const continuationLabel = continuationProbability === null ? null : `${aptitudeLabelFromProbability(continuationProbability)}（${continuationProbability}%）`;

  const independenceScore = Math.round(((form.traits.independence * 1.35 + form.traits.sales + form.traits.management + form.traits.action) / 21.75) * 100);
  const sideBusinessScore = Math.round(((form.traits.sideBusiness * 1.4 + form.traits.continuity + form.traits.action + form.traits.careerFit * 0.8) / 21) * 100);

  return {
    maxIncome,
    probability,
    hasReachedThousand,
    continuationProbability,
    continuationLabel,
    independenceLabel: aptitudeLabel(independenceScore),
    sideBusinessLabel: aptitudeLabel(sideBusinessScore),
    comment: buildComment(form, probability, maxIncome, hasReachedThousand, continuationLabel)
  };
}

function buildComment(
  form: FormState,
  probability: number | null,
  maxIncome: number,
  hasReachedThousand: boolean,
  continuationLabel: string | null
) {
  const strengths = [
    { key: "careerFit", label: "職業適性" },
    { key: "action", label: "行動力" },
    { key: "continuity", label: "継続力" },
    { key: "sales", label: "営業力" },
    { key: "management", label: "管理能力" },
    { key: "independence", label: "独立適性" },
    { key: "sideBusiness", label: "副業適性" }
  ] satisfies { key: TraitKey; label: string }[];
  const topStrengths = strengths
    .sort((a, b) => form.traits[b.key] - form.traits[a.key])
    .slice(0, 2)
    .map((item) => item.label)
    .join("と");
  const topScore = Math.max(...strengths.map((item) => form.traits[item.key]));
  const stretch = strengths
    .filter((item) => form.traits[item.key] <= 2)
    .map((item) => item.label)[0];

  const lines = [
    topScore <= 2
      ? "現時点では、年収上限を押し上げる要素がまだ弱めです。まずは行動量、継続力、職業適性の土台作りが優先になります。"
      : `${topStrengths}が収入上限を押し上げる中心要素です。現在の収入土台を伸ばしながら、単価の高い役割や収入源を取りに行けるタイプです。`,
    hasReachedThousand
      ? `年収1,000万円以上には到達済みです。試算上は約${maxIncome.toLocaleString("ja-JP")}万円まで狙える余地があり、継続・再到達可能性は${continuationLabel ?? "高い"}です。`
      : `試算上は約${maxIncome.toLocaleString("ja-JP")}万円まで狙える余地があり、年収1,000万円以上への到達確率は${probability}%です。`
  ];

  if (stretch) {
    lines.push(`${stretch}を底上げすると、結果の安定感と再現性がさらに上がります。`);
  } else {
    lines.push("全体のバランスが良く、組織内外の選択肢を組み合わせるほど伸びやすい状態です。");
  }

  return lines;
}

function aptitudeLabel(score: number) {
  if (score >= 82) return "かなり高い";
  if (score >= 68) return "高い";
  if (score >= 48) return "普通";
  return "低い";
}

function incomeProbabilityBonus(currentIncome: number) {
  if (currentIncome >= 700) return 8;
  if (currentIncome >= 500) return 2;
  if (currentIncome >= 300) return -3;
  return -8;
}

function aptitudeLabelFromProbability(value: number) {
  if (value >= 95) return "かなり高い";
  if (value >= 86) return "高い";
  if (value >= 70) return "普通";
  return "低い";
}

function roundToNearest(value: number, unit: number) {
  return Math.round(value / unit) * unit;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
