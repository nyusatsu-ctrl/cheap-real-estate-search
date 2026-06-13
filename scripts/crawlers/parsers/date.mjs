import { toHalfWidth } from "../core/fetch.mjs";

export function extractDate(text, labels = []) {
  const line = labels.length > 0
    ? text.split("\n").find((candidate) => labels.some((label) => candidate.includes(label)))
    : text;
  if (!line) return null;
  return parseJapaneseDate(line);
}

export function parseJapaneseDate(value) {
  const match = String(value).match(/(20[0-9]{2}[\/.-][0-9]{1,2}[\/.-][0-9]{1,2}|令和\s*[0-9０-９]+年\s*[0-9０-９]+月\s*[0-9０-９]+日|平成\s*[0-9０-９]+年\s*[0-9０-９]+月\s*[0-9０-９]+日)/);
  if (!match) return null;

  const normalized = toHalfWidth(match[1])
    .replace(/\s/g, "")
    .replace(/[年月]/g, "/")
    .replace(/日/g, "")
    .replace(/[.-]/g, "/");

  if (normalized.startsWith("令和")) return eraToIsoDate(normalized.replace("令和", ""), 2018);
  if (normalized.startsWith("平成")) return eraToIsoDate(normalized.replace("平成", ""), 1988);

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function eraToIsoDate(value, offsetYear) {
  const parts = value.split("/").map((part) => Number.parseInt(part, 10));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(Date.UTC(offsetYear + parts[0], parts[1] - 1, parts[2])).toISOString();
}
