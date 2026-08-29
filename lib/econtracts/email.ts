import "server-only";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";
import {
  buildEcontractLinkEmailContent,
  type EcontractLinkEmailContentInput
} from "@/lib/econtracts/email-content";

type EmailResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };

type LinkEmailInput = EcontractLinkEmailContentInput & {
  to: string;
};

type TestPreviewEmailInput = EcontractLinkEmailContentInput & {
  testRecipient: string;
};

type OtpEmailInput = {
  to: string;
  customerName: string;
  documentTitle: string;
  otp: string;
  expiresMinutes: number;
};

export function getEcontractBaseUrl() {
  if (!isEcontractFeatureEnabled()) return null;
  return process.env.ECONTRACT_BASE_URL?.trim().replace(/\/$/, "") || null;
}

export async function sendEcontractLinkEmail(input: LinkEmailInput): Promise<EmailResult> {
  return sendResendEmail({ to: input.to, ...buildEcontractLinkEmailContent(input) });
}

export async function sendEcontractTestPreviewEmail(input: TestPreviewEmailInput): Promise<EmailResult> {
  return sendResendEmail({ to: input.testRecipient, ...buildEcontractLinkEmailContent(input) });
}

export async function sendEcontractOtpEmail(input: OtpEmailInput): Promise<EmailResult> {
  return sendResendEmail({
    to: input.to,
    subject: "【株式会社エコループ】本人確認コード",
    text: `${input.customerName} 様\n\n「${input.documentTitle}」の本人確認コードは ${input.otp} です。\n有効時間は${input.expiresMinutes}分です。\n\nこのコードを第三者へ伝えないでください。心当たりがない場合は入力せず、当社へご連絡ください。`,
    html: `<p>${escapeHtml(input.customerName)} 様</p><p>「${escapeHtml(input.documentTitle)}」の本人確認コードです。</p><p style="font-size:28px;font-weight:700;letter-spacing:0.25em">${input.otp}</p><p>有効時間は${input.expiresMinutes}分です。</p><p>このコードを第三者へ伝えないでください。心当たりがない場合は入力せず、当社へご連絡ください。</p>`
  });
}

async function sendResendEmail(input: { to: string; subject: string; text: string; html: string }): Promise<EmailResult> {
  if (!isEcontractFeatureEnabled()) {
    return { ok: false, error: "電子契約機能は現在無効です。" };
  }
  const apiKey = process.env.ECONTRACT_RESEND_API_KEY?.trim();
  const from = process.env.ECONTRACT_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "電子契約メールの送信設定が未完了です。" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.json().catch(() => null) as { id?: string } | null;
    if (!response.ok) return { ok: false, error: "電子契約メールを送信できませんでした。" };
    return { ok: true, providerMessageId: body?.id ?? null };
  } catch {
    return { ok: false, error: "電子契約メールサービスへ接続できませんでした。" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}
