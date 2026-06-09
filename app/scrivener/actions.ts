"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUseMemberFeatures } from "@/lib/tenders";
import { requireMember } from "@/lib/user";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fileName(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || !value.name) return "";
  return value.name;
}

function buildApplicationMessage(formData: FormData) {
  const businessType = requiredString(formData, "business_type");
  const baseMessage = optionalString(formData, "message") || "補足事項なし";
  const fields =
    businessType === "corporation"
      ? [
          ["法人番号", optionalString(formData, "corporate_number")],
          ["代表者名", optionalString(formData, "representative_name")],
          ["本店所在地", optionalString(formData, "head_office_address")],
          ["履歴事項全部証明書", fileName(formData, "corporation_registry_file")],
          ["納税証明書その2（法人）", fileName(formData, "corporation_tax_2_file")],
          ["納税証明書その3の3", fileName(formData, "corporation_tax_3_3_file")],
          ["直近2期分の財務諸表", fileName(formData, "corporation_financial_file")],
          ["委任状", fileName(formData, "corporation_power_of_attorney_file")]
        ]
      : [
          ["氏名", optionalString(formData, "individual_name")],
          ["生年月日", optionalString(formData, "individual_birthdate")],
          ["事業所住所", optionalString(formData, "individual_business_address")],
          ["本人確認書類", fileName(formData, "individual_identity_file")],
          ["納税証明書その2（個人）", fileName(formData, "individual_tax_2_file")],
          ["納税証明書その3の2", fileName(formData, "individual_tax_3_2_file")],
          ["財務諸表または収支内訳書", fileName(formData, "individual_financial_file")],
          ["開業届", fileName(formData, "individual_opening_notice_file")]
        ];

  return [
    "全省庁統一資格の取得代行依頼",
    `料金表示: 通常88,000円 -> 49,800円`,
    `申請区分: ${businessType === "corporation" ? "法人" : "個人事業主（個人）"}`,
    `開業/設立直後: ${formData.get("newly_established") === "on" ? "はい" : "いいえ"}`,
    `希望資格区分: ${optionalString(formData, "desired_qualification_type")}`,
    `希望地域: ${optionalString(formData, "desired_regions") || "未入力"}`,
    `補足事項: ${baseMessage}`,
    ...fields.map(([label, value]) => `${label}: ${value || "未入力または未添付"}`)
  ].join("\n");
}

export async function submitScrivenerInquiryAction(formData: FormData) {
  const member = await requireMember();
  if (!canUseMemberFeatures(member)) redirect("/billing?trial=expired");

  const consentPrivacy = formData.get("consent_privacy") === "on";
  const consentShare = formData.get("consent_share_to_scrivener") === "on";
  if (!consentPrivacy || !consentShare) throw new Error("Consent is required");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/scrivener?sent=1");

  const { error } = await supabase.from("scrivener_inquiries").insert({
    user_id: member.id,
    company_name: requiredString(formData, "company_name"),
    contact_name: requiredString(formData, "contact_name"),
    email: requiredString(formData, "email"),
    phone: requiredString(formData, "phone"),
    prefecture: requiredString(formData, "prefecture"),
    business_type: requiredString(formData, "business_type"),
    qualification_status: requiredString(formData, "qualification_status"),
    request_type: requiredString(formData, "request_type"),
    message: buildApplicationMessage(formData),
    consent_privacy: consentPrivacy,
    consent_share_to_scrivener: consentShare,
    status: "new"
  });

  if (error) throw new Error(error.message);
  redirect("/scrivener?sent=1");
}
