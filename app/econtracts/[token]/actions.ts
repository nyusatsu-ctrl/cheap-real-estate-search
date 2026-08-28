"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  buildEvidenceHash,
  generateOpaqueToken,
  generateOtpCode,
  hashOtp,
  identityNamesMatch,
  isValidOtp,
  secureHexEqual,
  sha256
} from "@/lib/econtracts/crypto";
import { sendEcontractOtpEmail } from "@/lib/econtracts/email";
import { getEcontractAvailability, getOtpChallengeAvailability, validateConsentIds } from "@/lib/econtracts/rules";
import {
  ECONTRACT_ACCESS_COOKIE,
  findEcontractByToken,
  getLatestVerification,
  getRequestEvidence,
  getValidAccessSession,
  insertEcontractEvent,
  isEcontractFeatureEnabled,
  requireEcontractServiceClient
} from "@/lib/econtracts/server";
import type { EcontractConsentSnapshot } from "@/lib/econtracts/types";

const ACCESS_SESSION_MINUTES = 30;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;
const IDENTITY_ATTEMPTS_PER_15_MINUTES = 5;

export async function confirmEcontractIdentityAction(formData: FormData) {
  requirePublicEcontractFeature();
  const token = requiredString(formData, "token");
  const name = requiredString(formData, "customer_name").slice(0, 200);
  const econtract = await requireAvailableEcontract(token);
  const client = requireEcontractServiceClient();
  const evidence = await getRequestEvidence();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const failedResult = await client
    .from("sales_econtract_events")
    .select("id", { count: "exact", head: true })
    .eq("econtract_id", econtract.id)
    .eq("event_type", "identity_failed")
    .gte("created_at", cutoff);
  if (failedResult.error) throw failedResult.error;
  if ((failedResult.count ?? 0) >= IDENTITY_ATTEMPTS_PER_15_MINUTES) {
    fail(token, "氏名確認の試行回数が上限に達しました。15分後にもう一度お試しください。");
  }
  if (!identityNamesMatch(name, econtract.customer_snapshot.name)) {
    await insertEcontractEvent({ econtractId: econtract.id, eventType: "identity_failed", actorKind: "customer", evidence });
    fail(token, "申込時の氏名と一致しません。全角・半角や空白を確認してください。");
  }

  const sessionToken = generateOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_SESSION_MINUTES * 60 * 1000);
  const insertResult = await client.from("sales_econtract_access_sessions").insert({
    econtract_id: econtract.id,
    session_token_hash: sha256(sessionToken),
    expires_at: expiresAt.toISOString(),
    identity_confirmed_at: now.toISOString(),
    delivery_revision: econtract.delivery_revision,
    last_seen_at: now.toISOString()
  });
  if (insertResult.error) throw insertResult.error;
  const updatePayload = econtract.identity_confirmed_at ? {} : { identity_confirmed_at: now.toISOString() };
  if (Object.keys(updatePayload).length) {
    const updateResult = await client.from("sales_econtracts").update(updatePayload).eq("id", econtract.id);
    if (updateResult.error) throw updateResult.error;
  }
  const cookieStore = await cookies();
  cookieStore.set(ECONTRACT_ACCESS_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/econtracts",
    expires: expiresAt
  });
  await insertEcontractEvent({ econtractId: econtract.id, eventType: "identity_confirmed", actorKind: "customer", evidence });
  revalidatePath(`/econtracts/${token}`);
  redirect(`/econtracts/${token}`);
}

export async function sendEcontractOtpAction(formData: FormData) {
  requirePublicEcontractFeature();
  const token = requiredString(formData, "token");
  const econtract = await requireAvailableEcontract(token);
  const accessSession = await requireAccess(token, econtract.id);
  if (econtract.status === "cancelled") fail(token, "この電子契約は取消済みです。");
  const pepper = getOtpPepper();
  if (!pepper) fail(token, "本人確認設定が未完了です。株式会社エコループへご連絡ください。");
  const destination = econtract.customer_snapshot.email;
  const now = new Date();
  const latest = await getLatestVerification(econtract.id, econtract.delivery_revision, { includeInvalidated: true });
  const sessionLatest = await getLatestVerification(econtract.id, econtract.delivery_revision, { accessSessionId: accessSession.id });
  if (sessionLatest?.verified_at) success(token, "この端末の本人確認は完了しています。");
  if (latest && new Date(latest.resend_available_at).getTime() > now.getTime()) {
    const seconds = Math.max(1, Math.ceil((new Date(latest.resend_available_at).getTime() - now.getTime()) / 1000));
    fail(token, `認証コードは${seconds}秒後に再送できます。`);
  }
  const existingWindowIsActive = Boolean(latest && now.getTime() - new Date(latest.rate_window_started_at).getTime() < 60 * 60 * 1000);
  const resendCount = existingWindowIsActive ? (latest?.resend_count ?? 0) + 1 : 1;
  if (resendCount > OTP_MAX_PER_HOUR) fail(token, "認証コードの送信回数が上限に達しました。1時間後にもう一度お試しください。");

  const client = requireEcontractServiceClient();
  if (sessionLatest && !sessionLatest.invalidated_at && !sessionLatest.verified_at) {
    const invalidateResult = await client.from("sales_econtract_verifications").update({ invalidated_at: now.toISOString() }).eq("id", sessionLatest.id);
    if (invalidateResult.error) throw invalidateResult.error;
  }
  const otp = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAt = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);
  const insertResult = await client.from("sales_econtract_verifications").insert({
    econtract_id: econtract.id,
    access_session_id: accessSession.id,
    delivery_revision: econtract.delivery_revision,
    method: "email_otp",
    destination_masked: econtract.delivery_destination_masked,
    otp_hash: hashOtp(econtract.id, otp, pepper),
    expires_at: expiresAt.toISOString(),
    attempt_count: 0,
    max_attempts: 5,
    sent_at: now.toISOString(),
    resend_available_at: resendAt.toISOString(),
    rate_window_started_at: existingWindowIsActive ? latest?.rate_window_started_at : now.toISOString(),
    resend_count: resendCount
  }).select("id").single();
  if (insertResult.error) throw insertResult.error;
  const delivery = await sendEcontractOtpEmail({
    to: destination,
    customerName: econtract.customer_snapshot.name,
    documentTitle: econtract.document_title,
    otp,
    expiresMinutes: OTP_EXPIRY_MINUTES
  });
  const evidence = await getRequestEvidence();
  if (!delivery.ok) {
    await client.from("sales_econtract_verifications").update({ invalidated_at: new Date().toISOString() }).eq("id", insertResult.data.id);
    await insertEcontractEvent({ econtractId: econtract.id, eventType: "otp_delivery_failed", actorKind: "customer", evidence });
    fail(token, delivery.error);
  }
  await insertEcontractEvent({
    econtractId: econtract.id,
    eventType: "otp_sent",
    actorKind: "customer",
    evidence,
    metadata: { method: "email_otp", destinationMasked: econtract.delivery_destination_masked, resendCount }
  });
  success(token, `${econtract.delivery_destination_masked} へ認証コードを送信しました。`);
}

export async function verifyEcontractOtpAction(formData: FormData) {
  requirePublicEcontractFeature();
  const token = requiredString(formData, "token");
  const otp = requiredString(formData, "otp").normalize("NFKC");
  const econtract = await requireAvailableEcontract(token);
  const accessSession = await requireAccess(token, econtract.id);
  if (!isValidOtp(otp)) fail(token, "6桁の認証コードを入力してください。");
  const pepper = getOtpPepper();
  if (!pepper) fail(token, "本人確認設定が未完了です。株式会社エコループへご連絡ください。");
  const verification = await getLatestVerification(econtract.id, econtract.delivery_revision, { accessSessionId: accessSession.id });
  const evidence = await getRequestEvidence();
  if (!verification) fail(token, "認証コードを先に送信してください。");
  const challengeState = getOtpChallengeAvailability(verification);
  if (challengeState === "invalidated") fail(token, "認証コードを先に送信してください。");
  if (challengeState === "verified") success(token, "本人確認は完了しています。");
  if (challengeState === "expired") {
    await insertEcontractEvent({ econtractId: econtract.id, eventType: "otp_expired", actorKind: "customer", evidence });
    fail(token, "認証コードの有効期限が切れています。新しいコードを送信してください。");
  }
  if (challengeState === "locked") fail(token, "認証コードの試行回数が上限に達しました。新しいコードを送信してください。");
  const actualHash = hashOtp(econtract.id, otp, pepper);
  const client = requireEcontractServiceClient();
  if (!secureHexEqual(actualHash, verification.otp_hash)) {
    const attempts = verification.attempt_count + 1;
    const updateResult = await client.from("sales_econtract_verifications").update({
      attempt_count: attempts,
      invalidated_at: attempts >= verification.max_attempts ? new Date().toISOString() : null
    }).eq("id", verification.id)
      .eq("attempt_count", verification.attempt_count)
      .is("verified_at", null)
      .is("invalidated_at", null)
      .select("id")
      .maybeSingle();
    if (updateResult.error) throw updateResult.error;
    if (!updateResult.data) fail(token, "認証状態が更新されています。画面を更新してもう一度お試しください。");
    await insertEcontractEvent({
      econtractId: econtract.id,
      eventType: "otp_failed",
      actorKind: "customer",
      evidence,
      metadata: { attemptCount: attempts, locked: attempts >= verification.max_attempts }
    });
    fail(token, attempts >= verification.max_attempts ? "試行回数の上限に達しました。新しいコードを送信してください。" : "認証コードが正しくありません。");
  }
  const verifiedAt = new Date().toISOString();
  const verificationResult = await client.rpc("sales_econtract_complete_otp_verification", {
    p_econtract_id: econtract.id,
    p_access_session_id: accessSession.id,
    p_verification_id: verification.id,
    p_expected_attempt_count: verification.attempt_count,
    p_verified_at: verifiedAt
  });
  if (verificationResult.error) throw verificationResult.error;
  if (verificationResult.data !== true) fail(token, "認証コードの状態が更新されています。新しいコードを確認してください。");
  await insertEcontractEvent({
    econtractId: econtract.id,
    eventType: "otp_verified",
    actorKind: "customer",
    evidence,
    metadata: { method: "email_otp", destinationMasked: verification.destination_masked }
  });
  success(token, "本人確認が完了しました。重要事項をすべて確認し、契約してください。");
}

export async function signEcontractAction(formData: FormData) {
  requirePublicEcontractFeature();
  const token = requiredString(formData, "token");
  const econtract = await requireAvailableEcontract(token);
  const accessSession = await requireAccess(token, econtract.id);
  if (econtract.status === "signed") redirect(`/econtracts/${token}`);
  if (econtract.status !== "verified" || !econtract.verified_at) fail(token, "本人確認を完了してから契約してください。");
  const consentIds = formData.getAll("consent").map(String);
  const expectedIds = econtract.important_items_snapshot.map((item) => item.id);
  if (!validateConsentIds(expectedIds, consentIds)) fail(token, "重要事項をすべて個別に確認してください。");
  const verification = await getLatestVerification(econtract.id, econtract.delivery_revision, { accessSessionId: accessSession.id });
  if (!verification?.verified_at) fail(token, "本人確認を完了してから契約してください。");
  const signedAt = new Date().toISOString();
  const evidence = await getRequestEvidence();
  const consentSnapshot: EcontractConsentSnapshot = {
    confirmedAt: signedAt,
    items: econtract.important_items_snapshot.map((item) => ({ ...item, agreed: true }))
  };
  const signatureSnapshot = {
    signerName: econtract.customer_snapshot.name,
    method: "email_otp",
    destinationMasked: verification.destination_masked,
    identityConfirmedAt: accessSession.identity_confirmed_at,
    verifiedAt: verification.verified_at,
    signedAt,
    documentHash: econtract.document_hash
  };
  const evidenceHash = buildEvidenceHash({
    contractId: econtract.id,
    managementNumber: econtract.management_number,
    documentHash: econtract.document_hash,
    customerSnapshot: econtract.customer_snapshot,
    termsSnapshot: econtract.terms_snapshot,
    consentSnapshot,
    signatureSnapshot,
    ipAddress: evidence.ipAddress,
    userAgent: evidence.userAgent,
    device: evidence.device
  });
  const client = requireEcontractServiceClient();
  const updateResult = await client.from("sales_econtracts").update({
    status: "signed",
    signed_at: signedAt,
    consent_snapshot: consentSnapshot,
    signature_snapshot: signatureSnapshot,
    evidence_hash: evidenceHash,
    signer_ip: evidence.ipAddress,
    signer_user_agent: evidence.userAgent,
    signer_device_json: evidence.device
  }).eq("id", econtract.id).eq("status", "verified").is("signed_at", null).select("id").maybeSingle();
  if (updateResult.error) throw updateResult.error;
  if (!updateResult.data) {
    const current = await findEcontractByToken(token);
    if (current?.status === "signed") redirect(`/econtracts/${token}`);
    fail(token, "契約処理を完了できませんでした。画面を更新してもう一度お試しください。");
  }
  await Promise.all([
    insertEcontractEvent({
      econtractId: econtract.id,
      eventType: "signed",
      actorKind: "customer",
      evidence,
      metadata: { documentHash: econtract.document_hash, evidenceHash }
    }),
    client.from("sales_audit_logs").insert({
      actor_profile_id: null,
      target_table: "sales_econtracts",
      target_id: econtract.id,
      action: "econtract_signed",
      before_json: { status: "verified" },
      after_json: { status: "signed", signedAt, documentHash: econtract.document_hash, evidenceHash },
      memo: "顧客が電子契約を締結"
    })
  ]);
  revalidatePath(`/econtracts/${token}`);
  redirect(`/econtracts/${token}?completed=1`);
}

async function requireAvailableEcontract(token: string) {
  requirePublicEcontractFeature();
  const econtract = await findEcontractByToken(token);
  if (!econtract) fail(token, "電子契約URLが正しくありません。");
  const availability = getEcontractAvailability(econtract.status, econtract.link_expires_at);
  if (availability === "expired") {
    fail(token, "電子契約URLの有効期限が切れています。株式会社エコループへ再送をご依頼ください。");
  }
  if (availability === "cancelled") fail(token, "この電子契約は取消済みです。");
  return econtract;
}

async function requireAccess(token: string, econtractId: string) {
  requirePublicEcontractFeature();
  const econtract = await findEcontractByToken(token);
  const accessSession = econtract?.id === econtractId
    ? await getValidAccessSession(econtractId, econtract.delivery_revision)
    : null;
  if (!econtract || !accessSession) {
    fail(token, "申込時の氏名を確認してください。");
  }
  return accessSession;
}

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function getOtpPepper() {
  return process.env.ECONTRACT_OTP_PEPPER?.trim() || null;
}

function requirePublicEcontractFeature() {
  if (!isEcontractFeatureEnabled()) notFound();
}

function success(token: string, message: string): never {
  redirect(`/econtracts/${token}?message=${encodeURIComponent(message)}`);
}

function fail(token: string, message: string): never {
  const safeToken = /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "invalid";
  redirect(`/econtracts/${safeToken}?error=${encodeURIComponent(message)}`);
}
