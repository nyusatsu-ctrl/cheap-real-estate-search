export type DiagnosisV2StartFormValues = Record<string, string>;

export const DIAGNOSIS_V2_BASIC_FIELD_ORDER = [
  "company_name",
  "respondent_name",
  "prefecture",
  "phone",
  "email",
  "primary_trade",
  "order_models",
  "prime_ratio",
  "subcontract_ratio",
  "public_ratio",
  "consumer_ratio",
  "public_work_intent",
  "privacy_consent"
] as const;

const REQUIRED_FIELDS: Array<{
  name: (typeof DIAGNOSIS_V2_BASIC_FIELD_ORDER)[number];
  message: string;
}> = [
  { name: "company_name", message: "会社名を入力してください" },
  { name: "respondent_name", message: "回答者名を入力してください" },
  { name: "prefecture", message: "都道府県を選択してください" },
  { name: "phone", message: "電話番号を入力してください" },
  { name: "email", message: "メールアドレスを入力してください" },
  { name: "primary_trade", message: "主な業態・工事業種を選択してください" },
  { name: "public_work_intent", message: "公共工事への意向を選択してください" }
];

const RATIO_FIELDS = ["prime_ratio", "subcontract_ratio", "public_ratio", "consumer_ratio"];

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

export function validateDiagnosisV2BasicStep(values: DiagnosisV2StartFormValues) {
  const errors: Record<string, string> = {};

  for (const field of REQUIRED_FIELDS) {
    if (!values[field.name]?.trim()) errors[field.name] = field.message;
  }

  if (readDiagnosisV2MultiValue(values.order_models).length === 0) {
    errors.order_models = "主な受注形態を1つ以上選択してください";
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "メールアドレスの形式を確認してください";
  }
  if (values.website_url && !/^https?:\/\/[^\s]+$/i.test(values.website_url)) {
    errors.website_url = "ホームページURLは http:// または https:// から入力してください";
  }
  if (values.founding_year && !/^\d{4}$/.test(values.founding_year)) {
    errors.founding_year = "創業年は西暦4桁で入力してください";
  }
  if (values.privacy_consent !== "agreed") {
    errors.privacy_consent = "個人情報の取扱いへの同意が必要です";
  }

  for (const field of RATIO_FIELDS) {
    const value = values[field];
    if (value && (!/^\d{1,3}$/.test(value) || Number(value) < 0 || Number(value) > 100)) {
      errors[field] = "0～100の範囲で入力してください";
    }
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
