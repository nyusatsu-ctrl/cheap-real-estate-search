const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; cheap-real-estate-search-crawler/0.1; +https://cheap-real-estate-search.vercel.app)";

export async function fetchText(url, options = {}) {
  const response = await fetchWithTimeout(url, {
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      accept: options.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      "user-agent": options.userAgent ?? USER_AGENT,
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = new Error(`Fetch failed ${response.status}: ${url}`);
    error.statusCode = response.status;
    error.url = url;
    throw error;
  }

  return response.text();
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, {
    ...options,
    accept: "application/json,text/plain,*/*"
  });

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error(`Invalid JSON response: ${url}`);
    parseError.cause = error;
    parseError.url = url;
    throw parseError;
  }
}

export function htmlToText(html) {
  return decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/th|\/td|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map(cleanupText)
    .filter(Boolean)
    .join("\n");
}

export function cleanupText(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(value) {
  let decoded = String(value ?? "");
  for (let index = 0; index < 2; index += 1) {
    decoded = decoded.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi, (entity, body) => {
      const lower = body.toLowerCase();
      if (lower.startsWith("#x")) return decodeCodePoint(Number.parseInt(lower.slice(2), 16), entity);
      if (lower.startsWith("#")) return decodeCodePoint(Number.parseInt(lower.slice(1), 10), entity);
      return NAMED_ENTITIES[lower] ?? entity;
    });
  }
  return decoded
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[−–—]/g, "-");
}

const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  minus: "-",
  quot: "\"",
  yen: "円",
  copy: "(c)"
};

function decodeCodePoint(codePoint, fallback) {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return fallback;
  return String.fromCodePoint(codePoint);
}

export function toHalfWidth(value) {
  return String(value)
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．，]/g, (char) => (char === "．" ? "." : ","));
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await fetch(url, {
      headers: options.headers,
      signal: controller.signal,
      redirect: "follow"
    });
  } finally {
    clearTimeout(timeout);
  }
}
