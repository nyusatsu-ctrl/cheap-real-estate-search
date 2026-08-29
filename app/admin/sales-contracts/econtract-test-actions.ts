"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { maskEmail } from "@/lib/econtracts/crypto";
import {
  getEcontractBaseUrl,
  sendEcontractTestPreviewEmail
} from "@/lib/econtracts/email";
import { ECONTRACT_DISABLED_MESSAGE } from "@/lib/econtracts/rules";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";
import {
  buildEcontractTestPreviewUrl,
  buildTestPreviewManagementNumber,
  isAuthorizedAdminTestRecipient,
  loadEcontractTestPreview
} from "@/lib/econtracts/test-preview";

export async function sendAdminEcontractTestEmailAction(formData: FormData) {
  const admin = await requireAdmin();
  const contractId = requiredString(formData, "contract_id", 200);
  if (!isEcontractFeatureEnabled()) fail(contractId, ECONTRACT_DISABLED_MESSAGE);

  const testRecipient = optionalString(formData, "test_recipient", 320).toLowerCase();
  if (!isEmail(testRecipient)) fail(contractId, "テスト送信先メールアドレスを確認してください。");
  if (optionalString(formData, "test_send_confirm", 20) !== "confirmed") {
    fail(contractId, "テスト送信であり正式契約を発行しないことを確認してください。");
  }

  let preview: Awaited<ReturnType<typeof loadEcontractTestPreview>>;
  try {
    preview = await loadEcontractTestPreview(contractId);
  } catch (error) {
    fail(contractId, getPreviewErrorMessage(error));
  }
  if (testRecipient === preview.customer.email.trim().toLowerCase()) {
    fail(contractId, "顧客のメールアドレスはテスト送信先に指定できません。");
  }

  let isAdminRecipient = false;
  try {
    isAdminRecipient = await isAuthorizedAdminTestRecipient(testRecipient, admin);
  } catch {
    fail(contractId, "テスト送信先の管理者確認ができませんでした。");
  }
  if (!isAdminRecipient) {
    fail(contractId, "ログイン中または登録済みの管理者メールアドレスだけをテスト送信先に指定できます。");
  }

  const baseUrl = getEcontractBaseUrl();
  if (!baseUrl) fail(contractId, "電子契約の公開URL設定が未完了です。");
  const delivery = await sendEcontractTestPreviewEmail({
    testRecipient,
    customerName: preview.customer.name,
    documentTitle: preview.document.title,
    managementNumber: buildTestPreviewManagementNumber(preview.applicationNumber),
    signingUrl: buildEcontractTestPreviewUrl(baseUrl, contractId)
  });
  if (!delivery.ok) fail(contractId, delivery.error);

  success(contractId, `${maskEmail(testRecipient)} へ管理者用テストプレビューを送信しました。正式契約は発行されていません。`);
}

function requiredString(formData: FormData, key: string, maxLength: number) {
  const value = optionalString(formData, key, maxLength);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPreviewErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    message === "対象の販売契約が見つかりません。"
    || message === "顧客またはローン情報が見つかりません。"
    || message === "テスト送信はプレミアまたはアストで可決済みの自社ローン顧客だけに使用できます。"
  ) return message;
  return "テストプレビューを準備できませんでした。";
}

function success(contractId: string, message: string): never {
  redirect(`/admin/sales-contracts/${contractId}?econtract_message=${encodeURIComponent(message)}#econtracts`);
}

function fail(contractId: string, message: string): never {
  redirect(`/admin/sales-contracts/${contractId}?econtract_error=${encodeURIComponent(message)}#econtracts`);
}
