import "server-only";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";

type EmailResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };

type LinkEmailInput = {
  to: string;
  customerName: string;
  documentTitle: string;
  managementNumber: string;
  signingUrl: string;
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
  return sendResendEmail({
    to: input.to,
    subject: `【株式会社エコループ】${input.documentTitle}のご確認`,
    text: `${input.customerName} 様\n\n株式会社エコループです。\n次の専用URLから「${input.documentTitle}」をご確認ください。\n\n${input.signingUrl}\n\n契約管理番号: ${input.managementNumber}\n\nURLを開いた後、申込者氏名の確認とメール認証が必要です。このメールに心当たりがない場合は、URLを開かず当社へご連絡ください。`,
    html: `<p>${escapeHtml(input.customerName)} 様</p><p>株式会社エコループです。</p><p>次の専用URLから「${escapeHtml(input.documentTitle)}」をご確認ください。</p><p><a href="${escapeHtml(input.signingUrl)}">契約内容を確認する</a></p><p>契約管理番号: ${escapeHtml(input.managementNumber)}</p><p>URLを開いた後、申込者氏名の確認とメール認証が必要です。このメールに心当たりがない場合は、URLを開かず当社へご連絡ください。</p>`
  });
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
