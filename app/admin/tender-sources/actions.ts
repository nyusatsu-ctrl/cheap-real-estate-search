"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { TENDER_SOURCE_SEEDS, type TenderSourceSeed } from "@/lib/tender-source-seeds";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tender, TenderCandidateType } from "@/lib/types";

const sourceFields = [
  "source_name",
  "organization_type",
  "region",
  "prefecture",
  "base_url",
  "tender_list_url",
  "open_counter_url",
  "result_url",
  "target_types",
  "source_format",
  "crawler_type",
  "crawler_difficulty",
  "crawl_priority",
  "crawl_frequency",
  "is_active",
  "robots_note",
  "terms_note",
  "admin_note",
  "crawl_ready"
];

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableString(formData: FormData, key: string) {
  return stringValue(formData, key) || null;
}

function boolValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "on" || normalized === "true" || normalized === "1" || normalized === "yes";
}

function arrayValue(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[,\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sourcePayload(formData: FormData) {
  const sourceName = stringValue(formData, "source_name") || stringValue(formData, "name");
  const tenderListUrl = stringValue(formData, "tender_list_url") || stringValue(formData, "url");
  const baseUrl = stringValue(formData, "base_url") || getOrigin(tenderListUrl);
  const crawlerType = stringValue(formData, "crawler_type") || stringValue(formData, "source_type") || "manual_only";

  return {
    name: sourceName,
    url: tenderListUrl || baseUrl,
    source_type: crawlerType,
    source_name: sourceName,
    organization_type: stringValue(formData, "organization_type") || "other",
    region: nullableString(formData, "region"),
    prefecture: nullableString(formData, "prefecture"),
    base_url: baseUrl || null,
    tender_list_url: tenderListUrl || null,
    open_counter_url: nullableString(formData, "open_counter_url"),
    result_url: nullableString(formData, "result_url"),
    target_types: arrayValue(formData.get("target_types")),
    source_format: stringValue(formData, "source_format") || "html",
    crawler_type: crawlerType,
    crawler_difficulty: stringValue(formData, "crawler_difficulty") || "medium",
    crawl_priority: stringValue(formData, "crawl_priority") || "C",
    crawl_frequency: stringValue(formData, "crawl_frequency") || "weekly",
    is_active: boolValue(formData.get("is_active")),
    robots_note: nullableString(formData, "robots_note"),
    terms_note: nullableString(formData, "terms_note"),
    admin_note: nullableString(formData, "admin_note"),
    crawl_ready: boolValue(formData.get("crawl_ready"))
  };
}

function seedPayload(seed: TenderSourceSeed) {
  return {
    name: seed.source_name ?? "取得元",
    url: seed.tender_list_url ?? seed.base_url ?? "",
    source_type: seed.crawler_type ?? "manual_only",
    source_name: seed.source_name,
    organization_type: seed.organization_type,
    region: seed.region,
    prefecture: seed.prefecture,
    base_url: seed.base_url,
    tender_list_url: seed.tender_list_url,
    open_counter_url: seed.open_counter_url,
    result_url: seed.result_url,
    target_types: seed.target_types,
    source_format: seed.source_format,
    crawler_type: seed.crawler_type,
    crawler_difficulty: seed.crawler_difficulty,
    crawl_priority: seed.crawl_priority,
    crawl_frequency: seed.crawl_frequency,
    is_active: seed.is_active,
    robots_note: seed.robots_note,
    terms_note: seed.terms_note,
    admin_note: seed.admin_note,
    crawl_ready: seed.crawl_ready
  };
}

export async function saveTenderSourceAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const id = nullableString(formData, "id");
  const payload = sourcePayload(formData);
  const result = id
    ? await supabase.from("tender_sources").update(payload).eq("id", id)
    : await supabase.from("tender_sources").insert(payload);

  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/tender-sources");
  redirect("/admin/tender-sources");
}

export async function deleteTenderSourceAction(formData: FormData) {
  await requireAdmin();
  const id = stringValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const { error } = await supabase.from("tender_sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tender-sources");
  redirect("/admin/tender-sources");
}

export async function seedTenderSourcesAction() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  for (const seed of TENDER_SOURCE_SEEDS) {
    const payload = seedPayload(seed);
    const { data: existing, error: findError } = await supabase
      .from("tender_sources")
      .select("id")
      .eq("url", payload.url)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    const result = existing
      ? await supabase.from("tender_sources").update(payload).eq("id", existing.id)
      : await supabase.from("tender_sources").insert(payload);
    if (result.error) throw new Error(result.error.message);
  }

  revalidatePath("/admin/tender-sources");
  redirect("/admin/tender-sources");
}

export async function importTenderSourcesCsvAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const file = formData.get("csv_file");
  const rawText = file instanceof File ? await file.text() : stringValue(formData, "csv_text");
  const rows = parseCsv(rawText);

  for (const row of rows) {
    const fake = new FormData();
    for (const key of sourceFields) fake.set(key, row[key] ?? "");
    const payload = sourcePayload(fake);
    const { data: existing, error: findError } = await supabase
      .from("tender_sources")
      .select("id")
      .eq("url", payload.url)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    const result = existing
      ? await supabase.from("tender_sources").update(payload).eq("id", existing.id)
      : await supabase.from("tender_sources").insert(payload);
    if (result.error) throw new Error(result.error.message);
  }

  revalidatePath("/admin/tender-sources");
  redirect("/admin/tender-sources");
}

export async function runTenderSourceCrawlAction(formData: FormData) {
  await requireAdmin();
  const sourceId = stringValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const startedAt = new Date().toISOString();
  const { data: source, error: sourceError } = await supabase
    .from("tender_sources")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (sourceError) throw new Error(sourceError.message);

  if (!source.crawl_ready || source.crawler_type === "manual_only") {
    const message = !source.crawl_ready
      ? "robots.txt・利用規約の確認が未完了のため、自動クロール対象外です。"
      : "manual_only の取得元です。管理画面から手動登録してください。";
    await supabase.from("tender_crawl_logs").insert({
      source_id: sourceId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "failed",
      error_message: message,
      skipped_count: 1
    });
    await supabase.from("tender_sources").update({
      last_crawled_at: new Date().toISOString(),
      last_error_at: new Date().toISOString(),
      last_error_message: message
    }).eq("id", sourceId);
    revalidatePath("/admin/tender-sources");
    redirect("/admin/tender-sources");
  }

  const imported = readImportedTenders();
  let created = 0;
  let duplicates = 0;
  for (const tender of imported) {
    const { data: existingTender } = await supabase.from("tenders").select("id").eq("source_url", tender.source_url).maybeSingle();
    const { data: existingCandidate } = await supabase.from("tender_candidates").select("id").eq("source_url", tender.source_url).maybeSingle();
    if (existingTender || existingCandidate) {
      duplicates += 1;
      continue;
    }

    const candidateType = toCandidateType(tender);
    const { error } = await supabase.from("tender_candidates").insert({
      source_id: sourceId,
      title: tender.title,
      agency_name: tender.agency_name,
      tender_type: candidateType,
      original_label: tender.original_label ?? null,
      region: tender.region,
      prefecture: tender.prefecture,
      published_at: tender.published_at,
      deadline_at: tender.deadline_at,
      bid_at: tender.bid_at,
      qualification_required: tender.qualification_required,
      required_qualification: tender.required_qualification,
      source_url: tender.source_url,
      pdf_url: tender.pdf_url,
      raw_text: tender.detail_memo,
      ai_summary: tender.detail_memo,
      classification_confidence: candidateType === "unknown" ? 0.35 : 0.75,
      review_status: "pending",
      fetched_at: tender.fetched_at ?? new Date().toISOString()
    });
    if (!error) created += 1;
  }

  await supabase.from("tender_crawl_logs").insert({
    source_id: sourceId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: "success",
    fetched_count: imported.length,
    created_count: created,
    duplicate_count: duplicates
  });
  await supabase.from("tender_sources").update({
    last_crawled_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
    last_error_message: null
  }).eq("id", sourceId);

  revalidatePath("/admin/tender-sources");
  revalidatePath("/admin/tender-candidates");
  redirect("/admin/tender-candidates");
}

function getOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const [headerLine, ...body] = lines;
  if (!headerLine) return [] as Record<string, string>[];
  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  return body.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function readImportedTenders() {
  try {
    const filePath = path.join(process.cwd(), "data", "tender-imports.json");
    if (!fs.existsSync(filePath)) return [] as Tender[];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Tender[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as Tender[];
  }
}

function toCandidateType(tender: Tender): TenderCandidateType {
  const text = `${tender.title} ${tender.detail_memo ?? ""} ${tender.original_label ?? ""}`;
  if (/工事|建設|土木|建築|電気工事|管工事|舗装|解体|改修工事|建築一式|とび|しゅんせつ/.test(text)) return "construction";
  if (/オープンカウンタ|公開見積|公募型見積|定例見積|見積依頼|見積合わせ|見積書提出|少額/.test(text)) return "open_counter";
  if (tender.qualification_required) return "qualification_required";
  if (tender.tender_type === "service") return "services";
  if (tender.tender_type === "goods") return "goods";
  if (tender.tender_type === "open_counter") return "open_counter";
  return "unknown";
}
