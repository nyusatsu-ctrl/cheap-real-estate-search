export type EcontractLinkEmailContentInput = {
  customerName: string;
  documentTitle: string;
  managementNumber: string;
  signingUrl: string;
};

export type EcontractEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildEcontractLinkEmailContent(input: EcontractLinkEmailContentInput): EcontractEmailContent {
  return {
    subject: `【株式会社エコループ】${input.documentTitle}のご確認`,
    text: `${input.customerName} 様\n\n株式会社エコループです。\n次の専用URLから「${input.documentTitle}」をご確認ください。\n\n${input.signingUrl}\n\n契約管理番号: ${input.managementNumber}\n\nURLを開いた後、申込者氏名の確認とメール認証が必要です。このメールに心当たりがない場合は、URLを開かず当社へご連絡ください。`,
    html: `<p>${escapeHtml(input.customerName)} 様</p><p>株式会社エコループです。</p><p>次の専用URLから「${escapeHtml(input.documentTitle)}」をご確認ください。</p><p><a href="${escapeHtml(input.signingUrl)}">契約内容を確認する</a></p><p>契約管理番号: ${escapeHtml(input.managementNumber)}</p><p>URLを開いた後、申込者氏名の確認とメール認証が必要です。このメールに心当たりがない場合は、URLを開かず当社へご連絡ください。</p>`
  };
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
