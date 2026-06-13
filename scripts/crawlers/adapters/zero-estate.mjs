import { fetchJson } from "../core/fetch.mjs";
import { extractFirstAreaM2 } from "../parsers/area.mjs";

export async function crawl(source, options = {}) {
  const limit = options.limit ?? 20;
  const candidates = [];
  const warnings = [];
  let found = 0;
  let page = 1;

  while (candidates.length < limit) {
    const data = await fetchZeroEstatePage(source, page);
    const items = data.items ?? [];
    found += items.length;

    for (const item of items) {
      if (candidates.length >= limit) break;
      if (item.isSuspended || !String(item.publicStatus ?? item.status ?? "").includes("募集中")) continue;

      candidates.push(parseItem(item, source));
    }

    if (!data.totalPages || page >= data.totalPages || items.length === 0) break;
    page += 1;
  }

  return { found, candidates, warnings };
}

async function fetchZeroEstatePage(source, page) {
  const input = encodeURIComponent(JSON.stringify({ 0: { json: { page } } }));
  return (await fetchJson(`${source.apiUrl}?batch=1&input=${input}`))?.[0]?.result?.data?.json ?? { items: [] };
}

function parseItem(item, source) {
  const address = cleanup(`${item.address ?? `${item.prefecture ?? ""}${item.city ?? ""}`}`);
  const title = cleanup(item.title ?? `${item.prefecture ?? ""}${item.city ?? ""}の0円物件`);
  const text = `${title}\n${address}\n${item.propertyType ?? ""}`;
  const firstArea = extractFirstAreaM2(text);

  return {
    source_external_id: item.id ? String(item.id) : null,
    source_listing_url: source.listUrl,
    source_url: `https://zero.estate/properties/${item.id}`,
    title,
    price_yen: 0,
    raw_price_text: "0円",
    prefecture: item.prefecture ?? null,
    city: item.city ?? null,
    address_display: address,
    land_area_m2: firstArea,
    building_area_m2: /家|戸建|住宅|建物/.test(`${item.propertyType ?? ""}${title}`) ? firstArea : null,
    construction_year: item.builtYear ? Number.parseInt(String(item.builtYear), 10) || null : null,
    transaction_type: "無償譲渡",
    source_published_at: item.createdAt ?? item.publishedAt ?? null,
    source_updated_at: item.updatedAt ?? null,
    remarks: "みんなの0円物件の公開情報から取得候補を検出。詳細確認は元サイトで実施。"
  };
}

function cleanup(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
