export type DiagnosisV22ResultIntent = "save" | "details" | "consultation";

export type DiagnosisV22ResultContactInput = {
  intent: DiagnosisV22ResultIntent;
  companyName: string;
  email: string;
  privacyConsent: string;
  contactName?: string;
  phone?: string;
  consultationTopic?: string;
  preferredDates?: string[];
};

export function validateDiagnosisV22ResultContact(input: DiagnosisV22ResultContactInput) {
  const fieldErrors: Record<string, string> = {};
  if (!input.companyName.trim()) fieldErrors.company_name = "会社名を入力してください";
  if (!input.email.trim()) {
    fieldErrors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    fieldErrors.email = "メールアドレスをもう一度確認してください";
  }
  if (input.privacyConsent !== "agreed") fieldErrors.privacy_consent = "個人情報の取扱いへの同意が必要です";

  if (input.intent === "consultation") {
    if (!input.contactName?.trim()) fieldErrors.contact_name = "氏名を入力してください";
    if (!input.phone?.trim()) fieldErrors.phone = "電話番号を入力してください";
    if (!input.consultationTopic?.trim()) fieldErrors.consultation_topic = "相談したい内容を入力してください";
    if (!input.preferredDates?.some((value) => value.trim())) fieldErrors.preferred_meeting_dates = "希望日時を1つ以上入力してください";
  }

  return fieldErrors;
}
