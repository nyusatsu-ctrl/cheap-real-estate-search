export type DiagnosisV2StartFormValues = Record<string, string>;

export const DIAGNOSIS_V22_QUESTION_DEFINITION_VERSION = "2026-08-01-short-mappings-v2";

export const DIAGNOSIS_V22_EMPLOYEE_OPTIONS = ["1人", "2～5人", "6～10人", "11～30人", "31～50人", "51人以上"];
export const DIAGNOSIS_V22_SALES_OPTIONS = [
  "3,000万円未満",
  "3,000万円以上1億円未満",
  "1億円以上3億円未満",
  "3億円以上5億円未満",
  "5億円以上10億円未満",
  "10億円以上",
  "回答しない"
];

export const DIAGNOSIS_V2_BASIC_FIELD_ORDER = [
  "primary_trade",
  "order_model",
  "employee_range",
  "sales_range",
  "public_work_intent"
] as const;

const REQUIRED_FIELDS: Array<{
  name: (typeof DIAGNOSIS_V2_BASIC_FIELD_ORDER)[number];
  message: string;
}> = [
  { name: "primary_trade", message: "会社の主な業種を選んでください" },
  { name: "order_model", message: "主な仕事の受け方を選んでください" },
  { name: "employee_range", message: "従業員数を選んでください" },
  { name: "sales_range", message: "年商区分を選んでください" },
  { name: "public_work_intent", message: "公共工事への考えを選んでください" }
];

export function sanitizeDiagnosisV2StartValues(input: unknown): DiagnosisV2StartFormValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const values: DiagnosisV2StartFormValues = {};
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === "string") {
      values[name] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      values[name] = String(value);
    } else if (Array.isArray(value)) {
      values[name] = JSON.stringify([
        ...new Set(value.filter((item): item is string => typeof item === "string"))
      ]);
    } else if (name === "privacy_consent" && value === true) {
      values[name] = "agreed";
    }
  }
  return values;
}

export function normalizeStoredDiagnosisV2StartValues(input: unknown) {
  const stored = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const hasCurrentVersion = stored.questionDefinitionVersion === DIAGNOSIS_V22_QUESTION_DEFINITION_VERSION;
  const rawValues = hasCurrentVersion ? stored.values : input;
  const values = sanitizeDiagnosisV2StartValues(rawValues);
  if (hasCurrentVersion) return { values, definitionUpdated: false };

  const reusableValues = Object.fromEntries(Object.entries(values).filter(([name]) =>
    DIAGNOSIS_V2_BASIC_FIELD_ORDER.includes(name as (typeof DIAGNOSIS_V2_BASIC_FIELD_ORDER)[number])
    || /^C0[1-8]$/.test(name)
    || /^PW0[1-3]$/.test(name)
  ));
  return { values: reusableValues, definitionUpdated: Object.keys(values).length > 0 };
}

export function serializeDiagnosisV2StartValues(values: DiagnosisV2StartFormValues) {
  return JSON.stringify({
    questionDefinitionVersion: DIAGNOSIS_V22_QUESTION_DEFINITION_VERSION,
    values
  });
}

export function pruneDiagnosisV2StartValues(
  values: DiagnosisV2StartFormValues,
  allowedQuestionIds: Iterable<string>
) {
  const allowed = new Set([...DIAGNOSIS_V2_BASIC_FIELD_ORDER, ...allowedQuestionIds]);
  return Object.fromEntries(Object.entries(values).filter(([name]) => allowed.has(name as (typeof DIAGNOSIS_V2_BASIC_FIELD_ORDER)[number])));
}

export function validateDiagnosisV2BasicStep(values: DiagnosisV2StartFormValues) {
  const errors: Record<string, string> = {};

  for (const field of REQUIRED_FIELDS) {
    if (!values[field.name]?.trim()) errors[field.name] = field.message;
  }

  return errors;
}

export function readDiagnosisV2MultiValue(value: string | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
