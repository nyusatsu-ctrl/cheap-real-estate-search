import { fetchText } from "./fetch.mjs";

export async function checkRobots(source) {
  if (source.crawlPolicy === "disallow") {
    return {
      status: "disallowed",
      checkedAt: new Date().toISOString(),
      note: "crawl_policy が disallow のためクロールしません。"
    };
  }

  const robotsUrl = new URL("/robots.txt", source.baseUrl).toString();
  try {
    const robotsText = await fetchText(robotsUrl, { timeoutMs: 8000 });
    const disallowed = isDisallowedByRobots(robotsText, source.listUrl ?? source.baseUrl);
    return {
      status: disallowed ? "disallowed" : "allowed",
      checkedAt: new Date().toISOString(),
      note: disallowed ? "robots.txt の User-agent: * で対象URLがDisallowされています。" : "robots.txt を確認しました。"
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return {
        status: "not_found",
        checkedAt: new Date().toISOString(),
        note: "robots.txt は見つかりませんでした。"
      };
    }

    return {
      status: "error",
      checkedAt: new Date().toISOString(),
      note: `robots.txt確認失敗: ${error.message}`
    };
  }
}

function isDisallowedByRobots(robotsText, targetUrl) {
  const targetPath = new URL(targetUrl).pathname || "/";
  const lines = robotsText.split(/\r?\n/).map((line) => line.replace(/#.*/, "").trim()).filter(Boolean);
  let applies = false;

  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      applies = value === "*";
      continue;
    }

    if (!applies || key !== "disallow") continue;
    if (!value) continue;
    if (value === "/" || targetPath.startsWith(value)) return true;
  }

  return false;
}
