import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.join(process.cwd(), "data", "defense-html");
const targets = [
  ["western-accounting-r8-ippan", "https://www.mod.go.jp/gsdf/wae/info/nyusatu/wa-fin/kou/R8ippan.htm"],
  ["western-accounting-r8-sheet001", "https://www.mod.go.jp/gsdf/wae/info/nyusatu/wa-fin/kou/R8ippan.files/sheet001.htm"],
  ["northern-accounting-kokoku", "https://www.mod.go.jp/gsdf/nae/fin/nafin/kokoku-index.html"],
  ["tohoku-accounting-index", "https://www.mod.go.jp/gsdf/neae/koukoku/fin/index_l.htm"],
  ["central-accounting-fee", "https://www.mod.go.jp/gsdf/dc/cfin/html/fee.html"]
];

await fs.mkdir(outputDir, { recursive: true });

const results = [];
for (const [name, url] of targets) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "loan-system-defense-crawler/0.1 (+official-sites-only; metadata-only)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    const html = decodeBuffer(buffer, contentType);
    const filePath = path.join(outputDir, `${name}.html`);
    await fs.writeFile(filePath, html);
    results.push({ name, url: response.url, status: response.status, ok: response.ok, bytes: buffer.length, filePath });
  } catch (error) {
    results.push({ name, url, ok: false, error: error.message });
  }
}

console.log(JSON.stringify(results, null, 2));

function decodeBuffer(buffer, contentType) {
  const head = buffer.subarray(0, 4096).toString("latin1");
  const declared = contentType.match(/charset=([^;\s]+)/i)?.[1] ?? head.match(/charset=["']?([^"'\s/>]+)/i)?.[1] ?? "";
  const labels = normalizeCharset(declared) ? [normalizeCharset(declared)] : ["utf-8", "shift_jis", "euc-jp"];
  let best = "";
  let bestScore = Infinity;

  for (const label of labels) {
    try {
      const text = new TextDecoder(label, { fatal: false }).decode(buffer);
      const score = mojibakeScore(text);
      if (score < bestScore) {
        best = text;
        bestScore = score;
      }
    } catch {
      // Try next encoding.
    }
  }

  return best || new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function normalizeCharset(value) {
  const lower = value.toLowerCase();
  if (!lower) return "";
  if (["shift_jis", "shift-jis", "sjis", "windows-31j", "cp932"].includes(lower)) return "shift_jis";
  if (["euc-jp", "euc_jp"].includes(lower)) return "euc-jp";
  if (["utf-8", "utf8"].includes(lower)) return "utf-8";
  return lower;
}

function mojibakeScore(text) {
  return (text.match(/�/g)?.length ?? 0) + (text.match(/縺|譁|荳|螟/g)?.length ?? 0) * 5;
}
