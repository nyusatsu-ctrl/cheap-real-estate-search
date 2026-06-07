"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDefenseLike, isWesternAreaAccounting, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import type { Tender, TenderCandidate, TenderCandidateReviewStatus, TenderCandidateType, TenderType } from "@/lib/types";

const candidatePath = path.join(process.cwd(), "data", "defense-candidates.json");
const tenderImportPath = path.join(process.cwd(), "data", "tender-imports.json");
type LocalTenderPayload = Omit<Tender, "id" | "created_at" | "updated_at" | "tender_sources">;

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function toPublishedTenderType(value: string): TenderType {
  if (value === "services") return "service";
  if (value === "small_discretionary" || value === "open_counter") return "open_counter";
  if (value === "qualification_required") return "unified_qualification";
  if (value === "goods") return "goods";
  return "service";
}

export async function approveTenderCandidateAction(formData: FormData) {
  const admin = await ensureAdminOrLocalFallback();

  const id = requiredString(formData, "id");
  const candidateType = requiredString(formData, "tender_type") as TenderCandidateType;
  const title = requiredString(formData, "title");
  const sourceUrl = requiredString(formData, "source_url");
  const localCandidate = readLocalCandidates().find((item) => item.id === id);

  const payload = normalizeDefenseTender({
    title,
    agency_name: requiredString(formData, "agency_name"),
    source_name: optionalString(formData, "source_name") ?? localCandidate?.source_name ?? null,
    organization_type: optionalString(formData, "organization_type") ?? localCandidate?.organization_type ?? null,
    tender_type: toPublishedTenderType(candidateType),
    region: requiredString(formData, "region"),
    prefecture: requiredString(formData, "prefecture"),
    base_location: optionalString(formData, "base_location") ?? localCandidate?.base_location ?? null,
    published_at: optionalString(formData, "published_at"),
    deadline_at: optionalString(formData, "deadline_at"),
    bid_at: optionalString(formData, "bid_at"),
    qualification_required: formData.get("qualification_required") === "on",
    required_qualification: optionalString(formData, "required_qualification"),
    source_url: sourceUrl,
    pdf_url: optionalString(formData, "pdf_url"),
    attachments: localCandidate?.attachments ?? [],
    raw_text: optionalString(formData, "raw_text"),
    detail_memo: optionalString(formData, "ai_summary") ?? optionalString(formData, "raw_text"),
    original_label: optionalString(formData, "original_label"),
    is_admin_verified: true,
    is_new: true,
    is_deadline_soon: isDeadlineSoon(optionalString(formData, "deadline_at")),
    is_defense: true,
    status: "published" as const,
    source_id: optionalString(formData, "source_id"),
    fetched_at: localCandidate?.fetched_at ?? new Date().toISOString()
  } satisfies LocalTenderPayload);

  const supabase = admin ? await createSupabaseServerClient() : null;
  if (supabase) {
    const { data: existing, error: findError } = await supabase.from("tenders").select("id").eq("source_url", sourceUrl).maybeSingle();
    if (!findError) {
      const result = existing
        ? await supabase.from("tenders").update(payload).eq("id", existing.id)
        : await supabase.from("tenders").insert(payload);
      if (!result.error) {
        const { error } = await supabase.from("tender_candidates").update({
          review_status: "approved",
          admin_note: optionalString(formData, "admin_note")
        }).eq("id", id);
        if (error) throw new Error(error.message);
        revalidateTenderPaths();
        redirect("/admin/tender-candidates");
      }
    }
  }

  approveLocalCandidate(id, payload, optionalString(formData, "admin_note"));

  revalidateTenderPaths();
  redirect("/admin/tender-candidates");
}

export async function updateTenderCandidateReviewAction(formData: FormData) {
  const admin = await ensureAdminOrLocalFallback();

  const status = requiredString(formData, "review_status") as TenderCandidateReviewStatus;
  if (!["pending", "rejected", "duplicate"].includes(status)) throw new Error("Invalid review status");
  const id = requiredString(formData, "id");

  const supabase = admin ? await createSupabaseServerClient() : null;
  if (supabase) {
    const { error } = await supabase.from("tender_candidates").update({
      review_status: status,
      admin_note: optionalString(formData, "admin_note")
    }).eq("id", id);
    if (!error) {
      revalidateTenderPaths();
      redirect("/admin/tender-candidates");
    }
  }

  updateLocalCandidateStatus(id, status, optionalString(formData, "admin_note"));

  revalidateTenderPaths();
  redirect("/admin/tender-candidates");
}

export async function bulkApproveTenderCandidatesAction(formData: FormData) {
  await ensureAdminOrLocalFallback();
  const scope = requiredString(formData, "scope");
  const visibleIds = new Set(formData.getAll("candidate_id").map((value) => String(value)));
  const candidates = readLocalCandidates();
  const tenders = readImportedTenders();
  let approved = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  const nextCandidates = candidates.map((candidate) => {
    if (!isBulkScopeMatch(candidate, scope, visibleIds) || !isBulkApprovable(candidate)) {
      skipped += 1;
      return candidate;
    }
    const tender = tenderFromCandidate(candidate, now);
    if (hasDuplicateTender(tenders, tender)) {
      skipped += 1;
      return { ...candidate, review_status: "duplicate" as const, updated_at: now };
    }
    tenders.push(tender);
    approved += 1;
    return { ...candidate, review_status: "approved" as const, updated_at: now };
  });

  writeJson(candidatePath, nextCandidates);
  writeJson(tenderImportPath, tenders);
  revalidateTenderPaths();
  redirect(`/admin/tender-candidates?status=pending&bulkApproved=${approved}&bulkSkipped=${skipped}`);
}

function isDeadlineSoon(value: string | null) {
  if (!value) return false;
  const diff = new Date(value).getTime() - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

async function ensureAdminOrLocalFallback() {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  if (process.env.NODE_ENV !== "production" && fs.existsSync(candidatePath)) return null;
  redirect("/admin/login");
}

function approveLocalCandidate(id: string, payload: LocalTenderPayload, adminNote: string | null) {
  const candidates = readLocalCandidates();
  const tenders = readImportedTenders();
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) throw new Error("Candidate not found");

  const normalizedPayload = normalizeDefenseTender(payload);
  const tender = {
    id: `approved-${stableHash(`${payload.title}|${payload.agency_name}|${payload.source_url}|${payload.pdf_url ?? ""}|${payload.published_at ?? ""}|${payload.bid_at ?? ""}`)}`,
    ...normalizedPayload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tender_sources: {
      name: normalizedPayload.source_name ?? candidate.source_name ?? payload.agency_name,
      url: payload.source_url,
      source_name: normalizedPayload.source_name ?? candidate.source_name ?? payload.agency_name,
      organization_type: normalizedPayload.organization_type ?? candidate.organization_type ?? null,
      base_url: safeOrigin(payload.source_url)
    }
  } as Tender;

  if (!hasDuplicateTender(tenders, tender)) tenders.push(tender);
  writeJson(tenderImportPath, tenders);
  updateLocalCandidateStatus(id, "approved", adminNote);
}

function updateLocalCandidateStatus(id: string, status: TenderCandidateReviewStatus, adminNote: string | null) {
  const now = new Date().toISOString();
  const candidates = readLocalCandidates().map((candidate) => candidate.id === id ? {
    ...candidate,
    review_status: status,
    admin_note: adminNote ?? candidate.admin_note,
    updated_at: now
  } : candidate);
  writeJson(candidatePath, candidates);
}

function readLocalCandidates() {
  return readJson<Partial<TenderCandidate>[]>(candidatePath, []).map(normalizeLocalCandidate);
}

function normalizeLocalCandidate(candidate: Partial<TenderCandidate>, index: number) {
  const sourceName = candidate.source_name ?? candidate.agency_name ?? "取得元未設定";
  const createdAt = candidate.fetched_at ?? new Date(0).toISOString();
  return normalizeDefenseTender({
    id: candidate.id ?? `local-${stableHash(`${candidate.source_url ?? ""}|${candidate.title ?? ""}|${index}`)}`,
    source_id: candidate.source_id ?? null,
    source_name: sourceName,
    organization_type: candidate.organization_type ?? null,
    title: candidate.title ?? "",
    agency_name: candidate.agency_name ?? sourceName,
    tender_type: candidate.tender_type ?? "unknown",
    original_label: candidate.original_label ?? null,
    region: candidate.region ?? "全国",
    prefecture: candidate.prefecture ?? "未設定",
    base_location: candidate.base_location ?? null,
    published_at: candidate.published_at ?? null,
    deadline_at: candidate.deadline_at ?? null,
    bid_at: candidate.bid_at ?? null,
    qualification_required: Boolean(candidate.qualification_required),
    required_qualification: candidate.required_qualification ?? null,
    source_url: candidate.source_url ?? candidate.pdf_url ?? "",
    pdf_url: candidate.pdf_url ?? null,
    attachments: candidate.attachments ?? [],
    raw_text: candidate.raw_text ?? null,
    ai_summary: candidate.ai_summary ?? null,
    classification_confidence: candidate.classification_confidence ?? null,
    duplicate_candidate_id: candidate.duplicate_candidate_id ?? null,
    review_status: candidate.review_status ?? "pending",
    admin_note: candidate.admin_note ?? null,
    fetched_at: candidate.fetched_at ?? null,
    created_at: candidate.created_at ?? createdAt,
    updated_at: candidate.updated_at ?? createdAt
  } as TenderCandidate);
}

function readImportedTenders() {
  return readJson<Tender[]>(tenderImportPath, []);
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

function tenderFromCandidate(candidate: TenderCandidate, now: string) {
  const normalized = normalizeDefenseTender(candidate);
  return {
    id: `approved-${stableHash(`${normalized.title}|${normalized.agency_name}|${normalized.source_url}|${normalized.pdf_url ?? ""}|${normalized.published_at ?? ""}|${normalized.bid_at ?? ""}`)}`,
    source_id: normalized.source_id,
    source_name: normalized.source_name,
    organization_type: normalized.organization_type,
    title: normalized.title,
    agency_name: normalized.agency_name,
    tender_type: toPublishedTenderType(normalized.tender_type),
    region: normalized.region,
    prefecture: normalized.prefecture,
    base_location: normalized.base_location,
    published_at: normalized.published_at,
    deadline_at: normalized.deadline_at,
    bid_at: normalized.bid_at,
    qualification_required: normalized.qualification_required,
    required_qualification: normalized.required_qualification,
    source_url: normalized.source_url,
    pdf_url: normalized.pdf_url,
    attachments: normalized.attachments ?? [],
    raw_text: normalized.raw_text,
    detail_memo: normalized.ai_summary ?? normalized.raw_text,
    original_label: normalized.original_label,
    is_admin_verified: true,
    is_new: true,
    is_deadline_soon: isDeadlineSoon(normalized.deadline_at),
    is_defense: isDefenseLike(normalized),
    status: "published" as const,
    fetched_at: normalized.fetched_at ?? now,
    created_at: now,
    updated_at: now,
    tender_sources: {
      name: normalized.source_name ?? normalized.agency_name,
      url: normalized.source_url,
      source_name: normalized.source_name ?? normalized.agency_name,
      organization_type: normalized.organization_type ?? null,
      base_url: safeOrigin(normalized.source_url)
    }
  } as Tender;
}

function isBulkScopeMatch(candidate: TenderCandidate, scope: string, visibleIds: Set<string>) {
  const normalized = normalizeDefenseTender(candidate);
  if (scope === "visible") return visibleIds.has(candidate.id);
  if (scope === "defense") return isDefenseCandidate(normalized);
  if (scope === "gsdf") return normalized.organization_type === "ground_self_defense_force";
  if (scope === "msdf") return normalized.organization_type === "maritime_self_defense_force";
  if (scope === "asdf") return normalized.organization_type === "air_self_defense_force";
  if (scope === "open_counter") return normalized.tender_type === "open_counter" || normalized.tender_type === "small_discretionary";
  if (scope === "goods_services") return normalized.tender_type === "goods" || normalized.tender_type === "services";
  if (scope === "kyushu_defense") return isDefenseCandidate(normalized) && tenderRegion(normalized) === "九州";
  if (scope === "western_area") return isWesternAreaAccounting(normalized);
  if (scope === "kyushu_goods_services") return isDefenseCandidate(normalized) && tenderRegion(normalized) === "九州" && (normalized.tender_type === "goods" || normalized.tender_type === "services");
  if (scope === "kyushu_open_counter") return isDefenseCandidate(normalized) && tenderRegion(normalized) === "九州" && (normalized.tender_type === "open_counter" || normalized.tender_type === "small_discretionary");
  return false;
}

function isBulkApprovable(candidate: TenderCandidate) {
  if (!candidate.title.trim()) return false;
  if (!candidate.source_url && !candidate.pdf_url) return false;
  if (!candidate.agency_name.trim()) return false;
  if (candidate.review_status !== "pending") return false;
  if (candidate.duplicate_candidate_id) return false;
  if (candidate.tender_type === "unknown" || candidate.tender_type === "construction") return false;
  if (isClearlyExcludedCandidate(candidate)) return false;
  return true;
}

function isDefenseCandidate(candidate: TenderCandidate) {
  return isDefenseLike(candidate);
}

function isClearlyExcludedCandidate(candidate: TenderCandidate) {
  const target = `${candidate.title} ${candidate.raw_text ?? ""} ${candidate.source_url}`;
  if (/契約|調達|入札|公告|公募|公示|見積|オープンカウンタ|売払/.test(target)) return false;
  return /採用|広報|イベント|SNS|アクセス|お問い合わせ|部隊紹介|沿革|サイトマップ|プライバシーポリシー|オープンキャンパス|ポスター|リーフレット/.test(target);
}

function hasDuplicateTender(tenders: Tender[], tender: Tender) {
  return tenders.some((existing) => (
    existing.title === tender.title
    && existing.agency_name === tender.agency_name
    && existing.source_url === tender.source_url
    && (existing.pdf_url ?? null) === (tender.pdf_url ?? null)
    && (existing.published_at ?? null) === (tender.published_at ?? null)
    && (existing.bid_at ?? null) === (tender.bid_at ?? null)
  ));
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function revalidateTenderPaths() {
  revalidatePath("/tenders");
  revalidatePath("/admin/tender-candidates");
  revalidatePath("/admin/tenders");
  revalidatePath("/admin/defense-crawl");
}
