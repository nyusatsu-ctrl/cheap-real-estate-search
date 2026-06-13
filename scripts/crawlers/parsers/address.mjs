export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const PREFECTURE_PATTERN = new RegExp(`(${PREFECTURES.join("|")})`);

export function extractPrefecture(text) {
  return String(text ?? "").match(PREFECTURE_PATTERN)?.[1] ?? null;
}

export function extractCity(text, prefecture, fallback = "市区町村未確認") {
  const value = cleanupLocationText(text);
  const withoutPrefecture = prefecture ? value.replace(prefecture, "") : value;
  const city = withoutPrefecture.match(/([^\s　,、|｜／\/]+?(?:市|区|町|村))/)?.[1];
  return normalizeCity(city, fallback);
}

export function extractAddress(text, fallbackPrefecture = null, fallbackCity = "市区町村未確認") {
  const lines = String(text ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const labeled = findValueAfterLabel(lines, ["所在地", "住所", "所在", "所在地番"]);
  const withPrefecture = lines.find((line) => extractPrefecture(line));
  const address = labeled && extractPrefecture(labeled) ? labeled : withPrefecture ?? labeled ?? `${fallbackPrefecture ?? ""}${fallbackCity}`;
  return cleanupLocationText(address).slice(0, 120);
}

export function normalizeCity(value, fallback = "市区町村未確認") {
  const city = cleanupLocationText(value)
    .replace(/^(所在地|住所|所在|所在地番)[:：\s]*/, "")
    .replace(/^(物件名|物件|名称)[:：\s]*/, "")
    .replace(/[「」『』]/g, "")
    .trim();
  return city || fallback;
}

function cleanupLocationText(value) {
  return String(value ?? "")
    .replace(/[【】\[\]［］（）()]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findValueAfterLabel(lines, labels) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const label = labels.find((candidate) => line === candidate || line.startsWith(candidate));
    if (!label) continue;
    const inline = line.replace(label, "").replace(/^[:：\s]+/, "").trim();
    if (inline) return inline;
    if (lines[index + 1]) return lines[index + 1];
  }
  return null;
}
