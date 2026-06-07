import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const APP_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SOURCES_PATH = path.join(APP_ROOT, "data", "past-award-sources.json");
const OUTPUT_PATH = path.join(APP_ROOT, "data", "past-award-results.json");
const SUMMARY_PATH = path.join(APP_ROOT, "data", "past-award-crawl-summary.json");
const PORTAL_DOWNLOAD_BASE = "https://api.p-portal.go.jp/pps-web-biz/UAB03/OAB0301?fileversion=v001&filename=";
const REQUEST_TIMEOUT_MS = 20000;
const BATCH_SIZE = 1000;
const MAX_REASONABLE_YEN = 10_000_000_000_000;

const MINISTRY_CODES = {
  A1: "衆議院",
  B1: "参議院",
  C1: "国立国会図書館",
  D1: "最高裁判所",
  E1: "会計検査院",
  F1: "人事院",
  F2: "国家公務員倫理審査会",
  G1: "内閣官房",
  H1: "内閣法制局",
  I1: "安全保障会議",
  J1: "内閣府",
  J2: "宮内庁",
  J3: "公正取引委員会",
  J4: "国家公安委員会",
  J5: "警察庁",
  J6: "金融庁",
  J7: "消費者庁",
  J8: "個人情報保護委員会",
  J9: "カジノ管理委員会",
  K1: "総務省",
  K2: "公害等調整委員会",
  K3: "消防庁",
  L1: "法務省",
  L2: "検察庁",
  L3: "公安審査委員会",
  L4: "公安調査庁",
  M1: "外務省",
  N1: "財務省",
  N2: "国税庁",
  O1: "文部科学省",
  O2: "文化庁",
  O3: "スポーツ庁",
  P1: "厚生労働省",
  P2: "中央労働委員会",
  Q1: "農林水産省",
  Q2: "林野庁",
  Q3: "水産庁",
  R1: "経済産業省",
  R2: "資源エネルギー庁",
  R3: "特許庁",
  R4: "中小企業庁",
  S1: "国土交通省",
  S2: "運輸安全委員会",
  S3: "観光庁",
  S4: "気象庁",
  S5: "海上保安庁",
  T1: "環境省",
  T2: "原子力安全庁",
  U1: "防衛省",
  V1: "復興庁",
  W1: "デジタル庁",
  JA: "こども家庭庁",
  JB: "サイバー通信情報監理委員会"
};

const BIDDING_METHOD_CODES = {
  "8002010": "一般競争入札・最低価格",
  "8002020": "一般競争入札・最高価格",
  "8002040": "一般競争入札・総合評価",
  "8002050": "一般競争入札・複数落札",
  "8003010": "指名競争入札・最低価格",
  "8003020": "指名競争入札・最高価格",
  "8003040": "指名競争入札・総合評価",
  "8003050": "指名競争入札・複数落札",
  "8004025": "随意契約方式・複数業者",
  "8001010": "随意契約方式・オープンカウンタ",
  "8004020": "随意契約方式・特定業者",
  "8004030": "随意契約方式・公募型プロポーザル方式",
  "8014025": "随意契約方式・複数業者・少額",
  "8011010": "随意契約方式・オープンカウンタ・少額",
  "8014020": "随意契約方式・特定業者・少額",
  "8014030": "随意契約方式・公募型プロポーザル方式・少額"
};

const REGION_PREFECTURES = {
  北海道: ["北海道"],
  東北: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "山梨県"],
  中部: ["新潟県", "富山県", "石川県", "福井県", "長野県", "岐阜県", "静岡県", "愛知県"],
  近畿: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  中国: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
  四国: ["徳島県", "香川県", "愛媛県", "高知県"],
  九州: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
  沖縄: ["沖縄県"]
};

const PREFECTURE_REGIONS = Object.fromEntries(Object.entries(REGION_PREFECTURES).flatMap(([region, prefectures]) => prefectures.map((prefecture) => [prefecture, region])));

async function main() {
  const command = process.argv[2] ?? "crawl";
  const sourceFilter = argValue("--source") ?? "all";
  const sources = (await readJson(SOURCES_PATH, [])).filter((source) => sourceFilter === "all" || source.organization_group === sourceFilter || source.source_type.includes(sourceFilter));
  const maxSources = numberArg("--max-sources");
  const targetSources = maxSources ? sources.slice(0, maxSources) : sources;

  const sourceResults = [];
  const awards = [];
  const errors = [];

  for (const source of targetSources) {
    try {
      const result = source.source_type === "p_portal_open_data"
        ? await crawlProcurementPortal(source)
        : await crawlHtmlAwardSource(source);
      sourceResults.push(result.summary);
      for (const award of result.awards) awards.push(award);
    } catch (error) {
      const summary = summaryFor(source, { status: "failed", error: error.message });
      sourceResults.push(summary);
      errors.push({ source_name: source.source_name, url: source.url, error: error.message });
    }
  }

  const uniqueAwards = uniqueBy(awards.map(normalizeAward), (award) => award.dedupe_key);
  const saveResult = command === "audit" || process.argv.includes("--dry-run")
    ? { skipped: true, reason: "audit or --dry-run was specified.", imported: 0, updated: 0 }
    : await saveAwards(uniqueAwards);
  const summary = {
    command,
    source: sourceFilter,
    mode: argValue("--mode") ?? "latest-year",
    finished_at: new Date().toISOString(),
    discovered_count: awards.length,
    unique_count: uniqueAwards.length,
    saved: saveResult,
    source_results: sourceResults,
    errors
  };
  await writeJson(SUMMARY_PATH, summary);
  nodeWriteJson(summary);
}

async function crawlProcurementPortal(source) {
  const html = await fetchText(source.url);
  const files = choosePortalFiles(extractPortalZipFiles(html));
  const awards = [];
  const fileResults = [];

  for (const fileName of files) {
    const zipBuffer = await fetchBuffer(`${PORTAL_DOWNLOAD_BASE}${encodeURIComponent(fileName)}`);
    const csvFiles = await extractZipCsvFiles(Buffer.from(zipBuffer), fileName);
    let fileRows = 0;
    for (const file of csvFiles) {
      const rows = parseCsv(file.content.toString("utf8").replace(/^\uFEFF/, ""), { headerless: true });
      fileRows += rows.length;
      awards.push(...rows.map((row) => pPortalRowToAward(row, fileName)).filter(Boolean));
    }
    fileResults.push({ file_name: fileName, row_count: fileRows });
  }

  return {
    awards,
    summary: summaryFor(source, {
      status: "success",
      candidate_count: awards.length,
      file_count: files.length,
      files: fileResults
    })
  };
}

async function crawlHtmlAwardSource(source) {
  const html = await fetchText(source.url);
  const pageLinks = extractLinks(html, source.url);
  const awardLinks = pageLinks.filter((link) => /契約|落札|入札結果|公共調達|適正化|公表|kouhyou|keiyaku|rakusatu|jisseki|result|pdf|xls|xlsx/i.test(`${link.text} ${link.url}`));
  const rows = extractTableRows(html).map((row) => htmlRowToAward(row, source)).filter(Boolean);
  const documents = await crawlAwardDocuments(awardLinks, source);

  return {
    awards: [...rows, ...documents.awards],
    summary: summaryFor(source, {
      status: "success",
      candidate_count: rows.length + documents.awards.length,
      award_link_count: awardLinks.length,
      parsed_document_count: documents.parsed_document_count,
      sample_links: awardLinks.slice(0, 10)
    })
  };
}

function pPortalRowToAward(row, fileName) {
  const procurementNo = row[0]?.trim();
  const title = row[1]?.trim();
  const openedAt = isoDate(row[2]);
  const awardAmount = yen(row[3]);
  const ministryCode = row[4]?.trim();
  const biddingMethodCode = row[5]?.trim();
  const winnerName = row[6]?.trim();
  const corporationNo = row[7]?.trim();
  if (!procurementNo || !title || !openedAt || !awardAmount) return null;

  const agencyName = MINISTRY_CODES[ministryCode] ?? `府省コード ${ministryCode}`;
  const detailId = String(Number(procurementNo));
  const sourceUrl = Number.isFinite(Number(detailId))
    ? `https://www.p-portal.go.jp/pps-web-biz/UAA01/OAA0104?procurementItemInfoId=${detailId}&SyFromFlg=1`
    : "https://www.p-portal.go.jp/pps-web-biz/UAB02/OAB0201";
  const rawText = [
    `調達案件番号: ${procurementNo}`,
    `府省コード: ${ministryCode}`,
    `入札方式: ${BIDDING_METHOD_CODES[biddingMethodCode] ?? biddingMethodCode}`,
    corporationNo ? `法人番号: ${corporationNo}` : null,
    `取得ファイル: ${fileName}`
  ].filter(Boolean).join("\n");

  return {
    agency_name: agencyName,
    title,
    region: "全国",
    prefecture: null,
    business_type: BIDDING_METHOD_CODES[biddingMethodCode] ?? null,
    tender_type: inferTenderType(title, biddingMethodCode),
    winner_name: winnerName || null,
    award_amount_yen: awardAmount,
    planned_price_yen: null,
    win_rate: null,
    published_at: null,
    opened_at: openedAt,
    source_url: sourceUrl,
    pdf_url: null,
    raw_text: rawText,
    source_name: "調達ポータル 落札実績オープンデータ",
    fetched_at: new Date().toISOString(),
    review_status: "approved"
  };
}

function htmlRowToAward(cells, source) {
  const text = cells.join(" ");
  if (cells.length < 4 || !/落札|契約|予定価格|契約金額|落札金額/.test(text)) return null;

  const amountCells = cells.map(yen).filter((value) => value !== null);
  if (!amountCells.length) return null;

  const date = cells.map(isoDate).find(Boolean);
  const title = cells.find((cell) => cell.length >= 4 && !isoDate(cell) && yen(cell) === null && !/契約担当官|支出負担行為|法人番号|一般競争|指名競争|随意契約/.test(cell));
  if (!title || !date) return null;

  const agency = cells.find((cell) => /防衛省|自衛隊|省|庁|市|区|町|村|都|府|県/.test(cell) && cell !== title) ?? source.source_name;
  const winner = cells.find((cell) => /株式会社|有限会社|合同会社|（株）|\(株\)|一般社団|公益社団|財団法人|学校法人/.test(cell)) ?? null;
  const planned = amountCells.length >= 2 ? amountCells[0] : null;
  const award = amountCells.length >= 2 ? amountCells[amountCells.length - 1] : amountCells[0];
  const winRate = planned && award ? Number(((award / planned) * 100).toFixed(2)) : null;

  return {
    agency_name: cleanText(agency),
    title: cleanText(title),
    region: regionFromText(text),
    prefecture: prefectureFromText(text),
    business_type: inferBusinessType(title),
    tender_type: inferTenderType(title, ""),
    winner_name: winner ? cleanText(winner) : null,
    award_amount_yen: award,
    planned_price_yen: planned,
    win_rate: winRate,
    published_at: null,
    opened_at: date,
    source_url: source.url,
    pdf_url: null,
    raw_text: text.slice(0, 2000),
    source_name: source.source_name,
    fetched_at: new Date().toISOString(),
    review_status: "pending"
  };
}

async function crawlAwardDocuments(links, source) {
  const maxDocs = numberArg("--max-docs") || 25;
  const documentLinks = uniqueBy(links.filter((link) => /\.(xlsx?|csv)(\?|#|$)/i.test(link.url)), (link) => link.url).slice(0, maxDocs);
  const awards = [];
  let parsedDocumentCount = 0;

  for (const link of documentLinks) {
    try {
      const buffer = Buffer.from(await fetchBuffer(link.url));
      const rows = await rowsFromAwardDocument(buffer, link.url);
      const parsed = rows.map((row) => documentRowToAward(row, source, link)).filter(Boolean);
      if (parsed.length) parsedDocumentCount += 1;
      awards.push(...parsed);
    } catch {
      // Some public pages link to legacy .xls or protected files. Keep the source audit moving.
    }
  }

  return { awards, parsed_document_count: parsedDocumentCount };
}

async function rowsFromAwardDocument(buffer, url) {
  if (/\.csv(\?|#|$)/i.test(url)) return parseCsv(decodeBuffer(buffer), { headerless: true });
  if (/\.xlsx(\?|#|$)/i.test(url)) return parseXlsxRows(buffer);
  return [];
}

function documentRowToAward(cells, source, link) {
  const cleaned = cells.map(cleanText).filter(Boolean);
  const text = cleaned.join(" ");
  if (cleaned.length < 4 || !/落札|契約|契約金額|落札金額|予定価格|商号|名称|一般競争|指名競争|随意/.test(text)) return null;

  const amountCells = cleaned
    .map((cell, index) => ({ cell, index, value: yen(cell) }))
    .filter((entry) => entry.value !== null && entry.value >= 10000 && entry.value <= MAX_REASONABLE_YEN && !isoDate(entry.cell) && !/^\d{13,14}$/.test(numberText(entry.cell)))
    .map((entry) => entry.value);
  const openedAt = cleaned.map(isoDate).find(Boolean);
  const title = pickTitleCell(cleaned);
  if (!title || !openedAt || !amountCells.length) return null;

  const agency = cleaned.find((cell) => /防衛省|自衛隊|契約担当官|会計隊|補給処|基地|駐屯地|省|庁|市|区|町|村|都|府|県/.test(cell) && cell !== title) ?? source.source_name;
  const winner = cleaned.find((cell) => /株式会社|有限会社|合同会社|（株）|\(株\)|一般社団|公益社団|財団法人|学校法人|協同組合/.test(cell)) ?? null;
  const planned = amountCells.length >= 2 ? amountCells[0] : null;
  const award = amountCells.length >= 2 ? amountCells[amountCells.length - 1] : amountCells[0];
  const winRate = planned && award ? Number(((award / planned) * 100).toFixed(2)) : null;

  return {
    agency_name: cleanAgencyName(agency, source),
    title,
    region: regionFromText(text),
    prefecture: prefectureFromText(text),
    business_type: inferBusinessType(title),
    tender_type: inferTenderType(title, ""),
    winner_name: winner ? cleanText(winner) : null,
    award_amount_yen: award,
    planned_price_yen: planned,
    win_rate: winRate,
    published_at: null,
    opened_at: openedAt,
    source_url: source.url,
    pdf_url: link.url,
    raw_text: text.slice(0, 2000),
    source_name: source.source_name,
    fetched_at: new Date().toISOString(),
    review_status: "pending"
  };
}

function pickTitleCell(cells) {
  return cells.find((cell) => {
    if (cell.length < 4 || cell.length > 120) return false;
    if (isoDate(cell) || yen(cell) !== null) return false;
    if (/契約担当官|支出負担行為|法人番号|商号|名称|所在地|予定価格|契約金額|落札金額|契約方式|一般競争|指名競争|随意契約|単価/.test(cell)) return false;
    return /購入|借上|賃貸借|保守|点検|整備|修理|清掃|委託|役務|業務|工事|印刷|製造|納入|燃料|電気|交換|設置|撤去|更新|運搬|給食|洗濯|処分|契約/.test(cell);
  }) ?? null;
}

function cleanAgencyName(value, source) {
  const text = cleanText(value).replace(/^契約担当官\s*/, "");
  if (!text || /支出負担行為|契約担当官/.test(text) && text.length > 80) return source.source_name;
  return text;
}

async function saveAwards(awards) {
  if (process.argv.includes("--no-db")) return saveAwardsToLocal(awards);

  const supabase = await supabaseClient();
  if (!supabase) {
    return {
      imported: 0,
      updated: 0,
      failed: true,
      destination: "supabase",
      error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Use --no-db only for local JSON export."
    };
  }

  return saveAwardsToSupabase(supabase, awards);
}

async function saveAwardsToSupabase(supabase, awards) {
  let imported = 0;
  let updated = 0;
  for (const items of chunk(awards, BATCH_SIZE)) {
    const keys = items.map((award) => award.dedupe_key).filter(Boolean);
    const { data: existing, error: findError } = await supabase
      .from("past_award_results")
      .select("dedupe_key")
      .in("dedupe_key", keys);
    if (findError) return { imported, updated, failed: true, error: findError.message };

    const existingKeys = new Set((existing ?? []).map((row) => row.dedupe_key));
    const newItems = items.filter((award) => !existingKeys.has(award.dedupe_key));
    if (newItems.length) {
      const { error } = await supabase.from("past_award_results").insert(newItems);
      if (error) return { imported, updated, failed: true, error: error.message };
    }
    imported += newItems.length;
    updated += items.length - newItems.length;
  }
  return { imported, updated, failed: false, destination: "supabase" };
}

async function saveAwardsToLocal(awards) {
  const existing = process.argv.includes("--replace-local") ? [] : await readJson(OUTPUT_PATH, []);
  const indexByKey = new Map(existing.map((award, index) => [award.dedupe_key, index]));
  const now = new Date().toISOString();
  let imported = 0;
  let updated = 0;

  for (const award of awards) {
    const index = indexByKey.get(award.dedupe_key);
    if (typeof index === "number") {
      existing[index] = { ...existing[index], ...award, updated_at: now };
      updated += 1;
    } else {
      existing.push({
        id: `past-award-${award.dedupe_key}`,
        ...award,
        created_at: now,
        updated_at: now
      });
      indexByKey.set(award.dedupe_key, existing.length - 1);
      imported += 1;
    }
  }
  await writeJson(OUTPUT_PATH, existing);
  return { imported, updated, failed: false, destination: "local_json" };
}

function normalizeAward(award) {
  const openedAt = award.opened_at ?? null;
  return {
    ...award,
    region: award.region ?? "全国",
    prefecture: award.prefecture ?? null,
    business_type: award.business_type ?? null,
    tender_type: award.tender_type ?? null,
    winner_name: award.winner_name ?? null,
    award_amount_yen: award.award_amount_yen ?? null,
    planned_price_yen: award.planned_price_yen ?? null,
    win_rate: award.win_rate ?? null,
    published_at: award.published_at ?? null,
    opened_at: openedAt,
    pdf_url: award.pdf_url ?? null,
    raw_text: award.raw_text ?? null,
    source_name: award.source_name ?? null,
    fetched_at: award.fetched_at ?? new Date().toISOString(),
    review_status: award.review_status ?? "pending",
    dedupe_key: stableHash(`${award.agency_name}|${award.title}|${openedAt ?? ""}`)
  };
}

function choosePortalFiles(files) {
  const mode = argValue("--mode") ?? "latest-year";
  const year = argValue("--year");
  let selected = files;
  if (year) selected = files.filter((fileName) => fileName.includes(`_${year}.zip`) || fileName.includes(`_${year}`));
  else if (mode === "diff") selected = files.filter((fileName) => fileName.includes("_diff_"));
  else if (mode === "all-years") selected = files.filter((fileName) => fileName.includes("_all_"));
  else selected = files.filter((fileName) => fileName.includes("_all_")).slice(0, 1);

  const maxFiles = numberArg("--max-files");
  return maxFiles ? selected.slice(0, maxFiles) : selected;
}

function extractPortalZipFiles(html) {
  return uniqueBy([...html.matchAll(/doDownload\('([^']+\.zip)'\)/g)].map((match) => match[1]), (value) => value);
}

async function extractZipCsvFiles(buffer, fileName) {
  try {
    return extractZipFiles(buffer).filter((file) => file.name.endsWith(".csv"));
  } catch {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "past-award-"));
    const zipPath = path.join(tempDir, fileName);
    await fs.writeFile(zipPath, buffer);
    try {
      const content = execFileSync("unzip", ["-p", zipPath], { maxBuffer: 1024 * 1024 * 200 });
      return [{ name: fileName.replace(/\.zip$/i, ".csv"), content }];
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

function extractZipFiles(buffer) {
  const files = [];
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const compressed = buffer.subarray(dataStart, dataEnd);
    const content = method === 0 ? compressed : zlib.inflateRawSync(compressed);
    files.push({ name, content });
    offset = dataEnd;
  }
  return files;
}

async function parseXlsxRows(buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "past-award-xlsx-"));
  const xlsxPath = path.join(tempDir, "award.xlsx");
  await fs.writeFile(xlsxPath, buffer);
  try {
    const names = execFileSync("unzip", ["-Z1", xlsxPath], { maxBuffer: 1024 * 1024 * 20 }).toString("utf8").split(/\r?\n/).filter(Boolean);
    const sharedStrings = names.includes("xl/sharedStrings.xml")
      ? parseSharedStrings(execFileSync("unzip", ["-p", xlsxPath, "xl/sharedStrings.xml"], { maxBuffer: 1024 * 1024 * 100 }).toString("utf8"))
      : [];
    const sheetNames = names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).slice(0, 3);
    const rows = [];
    for (const sheetName of sheetNames) {
      const xml = execFileSync("unzip", ["-p", xlsxPath, sheetName], { maxBuffer: 1024 * 1024 * 100 }).toString("utf8");
      rows.push(...parseWorksheetRows(xml, sharedStrings));
    }
    return rows;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => {
    const withoutPhoneticRuns = match[0].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
    return [...withoutPhoneticRuns.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((textMatch) => cleanText(decodeXml(textMatch[1])))
      .join("");
  });
}

function parseWorksheetRows(xml, sharedStrings) {
  return [...xml.matchAll(/<row\b[\s\S]*?<\/row>/g)].map((rowMatch) => {
    const cells = [];
    for (const cellMatch of rowMatch[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const index = ref ? columnIndex(ref) : cells.length;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      let value = decodeXml(rawValue);
      if (type === "s") value = sharedStrings[Number(value)] ?? "";
      else if (type === "inlineStr") value = cleanText(stripTags(body.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")));
      cells[index] = cleanText(value);
    }
    return cells.map((value) => value ?? "");
  }).filter((cells) => cells.some(Boolean));
}

function columnIndex(column) {
  let index = 0;
  for (const char of column) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

function parseCsv(input, options = {}) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  if (options.headerless) return rows;
  const headers = rows[0] ?? [];
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function extractTableRows(html) {
  return [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)]
    .map((match) => [...match[0].matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((cell) => cleanText(stripTags(cell[0]))))
    .filter((cells) => cells.length);
}

function extractLinks(html, pageUrl) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const href = match[1].match(/href\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? "";
    return {
      text: cleanText(stripTags(match[2])),
      url: safeUrl(href, pageUrl)
    };
  }).filter((link) => link.url);
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeBuffer(buffer);
}

async function fetchBuffer(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.arrayBuffer();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "loan-system-past-award-crawler/0.1 (+metadata-only; contact: admin)",
        "Accept": "text/html,application/xhtml+xml,application/zip,text/csv,*/*"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function decodeBuffer(buffer) {
  const utf8 = buffer.toString("utf8");
  if (!/�|縺|譁|荳|螟/.test(utf8)) return utf8;
  return buffer.toString("latin1");
}

function inferTenderType(title, biddingMethodCode) {
  if (String(biddingMethodCode).includes("1010") || /オープンカウンタ|少額/.test(title)) return "open_counter";
  if (/工事|建築|土木|舗装|解体/.test(title)) return "construction";
  if (/清掃|点検|保守|委託|運用|管理|修繕|リース|調査|業務/.test(title)) return "service";
  if (/資格/.test(title)) return "unified_qualification";
  return "goods";
}

function inferBusinessType(title) {
  if (/清掃/.test(title)) return "清掃";
  if (/警備/.test(title)) return "警備";
  if (/点検|保守|運用/.test(title)) return "保守・運用";
  if (/印刷|封入/.test(title)) return "印刷";
  if (/電気|ガス|燃料/.test(title)) return "エネルギー";
  if (/工事|建築|土木/.test(title)) return "工事";
  if (/車両|物品|備品|購入/.test(title)) return "物品";
  return null;
}

function regionFromText(text) {
  const prefecture = prefectureFromText(text);
  return prefecture ? PREFECTURE_REGIONS[prefecture] : "全国";
}

function prefectureFromText(text) {
  return Object.keys(PREFECTURE_REGIONS).find((prefecture) => text.includes(prefecture)) ?? null;
}

function yen(value) {
  if (!value) return null;
  const normalized = numberText(value);
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function numberText(value) {
  return String(value ?? "").trim().replace(/[,円¥￥]/g, "");
}

function isoDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const reiwa = text.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (reiwa) return dateToIso(2018 + Number(reiwa[1]), Number(reiwa[2]), Number(reiwa[3]));
  const western = text.match(/(20\d{2})[-/.年]\s*(\d{1,2})[-/.月]\s*(\d{1,2})/);
  if (western) return dateToIso(Number(western[1]), Number(western[2]), Number(western[3]));
  if (/^\d{5}$/.test(text)) {
    const serial = Number(text);
    if (serial >= 30000 && serial <= 80000) {
      const date = new Date(Date.UTC(1899, 11, 30 + serial));
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }
  return null;
}

function dateToIso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function stripTags(value = "") {
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
}

function cleanText(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function safeUrl(href, pageUrl) {
  try {
    if (!href || href.startsWith("javascript:")) return "";
    return new URL(cleanText(href), pageUrl).href;
  } catch {
    return "";
  }
}

async function supabaseClient() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadEnv() {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const content = await fs.readFile(path.join(APP_ROOT, fileName), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    } catch {
      // Environment files are optional for local crawls.
    }
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function nodeWriteJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function stableHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function summaryFor(source, values) {
  return {
    source_name: source.source_name,
    url: source.url,
    source_type: source.source_type,
    organization_group: source.organization_group,
    priority: source.priority,
    ...values
  };
}

function argValue(name) {
  return process.argv.find((arg) => arg.startsWith(`${name}=`))?.split("=")[1] ?? null;
}

function numberArg(name) {
  const value = Number(argValue(name) ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

if (!fsSync.existsSync(SOURCES_PATH)) {
  throw new Error(`Missing ${SOURCES_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
