"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PastAwardResult, PastAwardReviewStatus } from "@/lib/types";

const pastAwardPath = path.join(process.cwd(), "data", "past-award-results.json");

type PastAwardImportPayload = Omit<PastAwardResult, "id" | "created_at" | "updated_at">;

export async function importPastAwardCsvAction(formData: FormData) {
  const admin = await ensureAdminOrLocalFallback();
  const csvText = await csvFromFormData(formData);
  const defaultStatus = reviewStatus(String(formData.get("review_status") ?? "approved"));
  const rows = parseCsv(csvText);
  const payloads = rows.map((row) => rowToPastAward(row, defaultStatus)).filter(Boolean) as PastAwardImportPayload[];
  if (!payloads.length) throw new Error("Importable rows were not found.");

  const supabase = admin ? await createSupabaseServerClient() : null;
  if (supabase) {
    const result = await saveToSupabase(supabase, payloads);
    if (!result.failed) {
      revalidatePastAwardPaths();
      redirect(`/admin/past-awards?imported=${result.imported}&updated=${result.updated}`);
    }
  }

  const result = saveToLocal(payloads);
  revalidatePastAwardPaths();
  redirect(`/admin/past-awards?imported=${result.imported}&updated=${result.updated}&local=1`);
}

async function ensureAdminOrLocalFallback() {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  if (process.env.NODE_ENV !== "production") return null;
  redirect("/admin/login");
}

async function csvFromFormData(formData: FormData) {
  const pasted = String(formData.get("csv_text") ?? "").trim();
  if (pasted) return pasted;
  const file = formData.get("csv_file");
  if (file && typeof file === "object" && "text" in file) {
    const text = await file.text();
    if (text.trim()) return text;
  }
  throw new Error("CSV file or pasted CSV text is required.");
}

async function saveToSupabase(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, payloads: PastAwardImportPayload[]) {
  let imported = 0;
  let updated = 0;
  const chunks = chunk(payloads, 1000);
  for (const items of chunks) {
    const keys = items.map((payload) => payload.dedupe_key).filter(Boolean);
    const { data: existing, error: findError } = await supabase
      .from("past_award_results")
      .select("dedupe_key")
      .in("dedupe_key", keys);
    if (findError) return { imported, updated, failed: true };

    const existingKeys = new Set((existing ?? []).map((row) => row.dedupe_key));
    const newItems = items.filter((item) => !existingKeys.has(item.dedupe_key));
    if (newItems.length) {
      const { error } = await supabase
        .from("past_award_results")
        .insert(newItems);
      if (error) return { imported, updated, failed: true };
    }
    imported += newItems.length;
    updated += items.length - newItems.length;
  }
  return { imported, updated, failed: false };
}

function saveToLocal(payloads: PastAwardImportPayload[]) {
  const existing = readJson<PastAwardResult[]>(pastAwardPath, []);
  const indexByKey = new Map(existing.map((award, index) => [award.dedupe_key, index]));
  let imported = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const payload of payloads) {
    const index = indexByKey.get(payload.dedupe_key);
    if (typeof index === "number") {
      existing[index] = { ...existing[index], ...payload, updated_at: now };
      updated += 1;
    } else {
      existing.push({
        id: `past-award-${stableHash(payload.dedupe_key ?? `${payload.agency_name}|${payload.title}|${payload.source_url}`)}`,
        ...payload,
        created_at: now,
        updated_at: now
      });
      indexByKey.set(payload.dedupe_key, existing.length - 1);
      imported += 1;
    }
  }

  writeJson(pastAwardPath, existing);
  return { imported, updated };
}

function rowToPastAward(row: Record<string, string>, defaultStatus: PastAwardReviewStatus): PastAwardImportPayload | null {
  const agencyName = field(row, ["発注機関", "agency_name", "agency"]);
  const title = field(row, ["案件名", "title", "件名"]);
  const sourceUrl = field(row, ["URL", "url", "source_url", "元URL"]);
  if (!agencyName || !title || !sourceUrl) return null;

  const awardAmount = numberField(row, ["落札額", "award_amount_yen", "award_amount"]);
  const plannedPrice = numberField(row, ["予定価格", "planned_price_yen", "planned_price"]);
  const rawWinRate = numberField(row, ["落札率", "win_rate"]);
  const winRate = rawWinRate ?? (awardAmount && plannedPrice ? Number(((awardAmount / plannedPrice) * 100).toFixed(2)) : null);
  const publishedAt = dateField(row, ["公告日", "published_at"]);
  const openedAt = dateField(row, ["開札日", "opened_at", "落札日", "awarded_at"]);
  const dedupeKey = stableHash(`${agencyName}|${title}|${openedAt ?? ""}`);

  return {
    agency_name: agencyName,
    title,
    region: field(row, ["地域", "region"]) || "全国",
    prefecture: field(row, ["都道府県", "prefecture"]) || null,
    business_type: field(row, ["業種", "business_type", "業務種別"]) || null,
    tender_type: tenderType(field(row, ["案件種別", "tender_type", "種別"])),
    winner_name: field(row, ["落札業者", "winner_name", "落札者"]) || null,
    award_amount_yen: awardAmount,
    planned_price_yen: plannedPrice,
    win_rate: winRate,
    published_at: publishedAt,
    opened_at: openedAt,
    source_url: sourceUrl,
    pdf_url: field(row, ["PDF URL", "pdf_url", "PDF"]) || null,
    raw_text: field(row, ["元データ", "raw_text", "備考"]) || null,
    source_name: field(row, ["取得元", "source_name"]) || null,
    fetched_at: new Date().toISOString(),
    review_status: reviewStatus(field(row, ["確認状態", "review_status"]) || defaultStatus),
    dedupe_key: dedupeKey
  };
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
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
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function field(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) return value;
  }
  return "";
}

function numberField(row: Record<string, string>, keys: string[]) {
  const value = field(row, keys);
  if (!value) return null;
  const normalized = value.replace(/[,\s円¥￥%]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateField(row: Record<string, string>, keys: string[]) {
  const value = field(row, keys);
  if (!value) return null;
  const normalized = value
    .replace(/令和(\d+)年(\d+)月(\d+)日/, (_, year, month, day) => `${2018 + Number(year)}-${month}-${day}`)
    .replace(/[年月]/g, "-")
    .replace(/日/g, "");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function tenderType(value: string) {
  if (value === "物品" || value === "goods") return "goods";
  if (value === "役務" || value === "service" || value === "services") return "service";
  if (value.includes("オープン") || value === "open_counter") return "open_counter";
  if (value.includes("資格") || value === "unified_qualification") return "unified_qualification";
  if (value === "工事" || value === "construction") return "construction";
  return value ? "other" : null;
}

function reviewStatus(value: string): PastAwardReviewStatus {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  if (value === "確認待ち") return "pending";
  if (value === "承認済み") return "approved";
  if (value === "却下") return "rejected";
  return "approved";
}

function readJson<T>(filePath: string, fallback: T) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function revalidatePastAwardPaths() {
  revalidatePath("/admin/past-awards");
  revalidatePath("/tenders");
}
