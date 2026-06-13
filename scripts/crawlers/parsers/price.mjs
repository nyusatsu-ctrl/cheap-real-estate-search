import { toHalfWidth } from "../core/fetch.mjs";

export function extractPriceYen(html = "", text = "") {
  const source = `${html}\n${text}`;
  const patterns = [
    /(?:価格|売却価格|売買価格|希望価格|販売価格|代金|最低入札価額|見積価額)[\s\S]{0,180}?(無料|無償|応相談|相談|0\s*円|[0-9０-９,.，．]+\s*万円|[0-9０-９,，]+\s*円)/i,
    /(無料|無償|応相談|相談|0\s*円|[0-9０-９,.，．]+\s*万円|[0-9０-９,，]+\s*円)/
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    return {
      priceYen: parseYen(match[1]),
      rawPriceText: match[1]
    };
  }

  return {
    priceYen: null,
    rawPriceText: null
  };
}

export function parseYen(value) {
  if (value === null || value === undefined) return null;
  const normalized = toHalfWidth(value).replace(/[,\s，]/g, "");
  if (/無料|無償|^0円$/.test(normalized)) return 0;
  if (/応相談|相談/.test(normalized)) return null;

  const amount = Number.parseFloat(normalized.replace(/[万円円]/g, ""));
  if (!Number.isFinite(amount)) return null;
  return normalized.includes("万円") ? Math.round(amount * 10000) : Math.round(amount);
}

export function formatYen(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toLocaleString("ja-JP")}円`;
}
