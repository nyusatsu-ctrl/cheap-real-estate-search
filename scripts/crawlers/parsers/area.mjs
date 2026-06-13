import { toHalfWidth } from "../core/fetch.mjs";

export function extractAreaM2(text, labels = [], options = {}) {
  const fallbackToFirst = options.fallbackToFirst ?? true;

  for (const label of labels) {
    const nextLine = text.match(new RegExp(`${label}\\s*\\n\\s*([0-9０-９,.，．]+)\\s*(?:㎡|m2|m²|平方メートル)`, "i"))?.[1];
    if (nextLine) return parseAreaM2(nextLine);

    const line = text.split("\n").find((candidate) => candidate.includes(label));
    const area = line?.match(/([0-9０-９,.，．]+)\s*(?:㎡|m2|m²|平方メートル)/i)?.[1];
    if (area) return parseAreaM2(area);
  }

  return fallbackToFirst ? extractFirstAreaM2(text) : null;
}

export function extractFirstAreaM2(text) {
  const area = text.match(/([0-9０-９,.，．]+)\s*(?:㎡|m2|m²|平方メートル)/i)?.[1];
  return area ? parseAreaM2(area) : null;
}

export function parseAreaM2(value) {
  const parsed = Number.parseFloat(toHalfWidth(value).replace(/[,\s，]/g, ""));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}
