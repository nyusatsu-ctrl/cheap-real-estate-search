import "server-only";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { assessTenderDeadline, assessTenderSourceAvailability } from "@/lib/tender-deadlines";
import { getPublishedTenders, tenderMatchesNotificationRule } from "@/lib/tenders";
import type { TenderNotificationEvent, TenderNotificationRule } from "@/lib/types";

export type TenderNotificationListOptions = {
  unreadOnly?: boolean;
  ruleId?: string;
};

export type TenderNotificationData<T> = {
  data: T;
  error: string | null;
};

export async function getTenderNotificationRules(userId: string): Promise<TenderNotificationData<TenderNotificationRule[]>> {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return { data: [], error: "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。" };

  const { data, error } = await supabase
    .from("tender_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(normalizeRule), error: null };
}

export async function getTenderNotificationEvents(
  userId: string,
  options: TenderNotificationListOptions = {}
): Promise<TenderNotificationData<TenderNotificationEvent[]>> {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return { data: [], error: "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。" };

  let query = supabase
    .from("tender_notification_events")
    .select("*, tender_notifications(id, name), tenders(*)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (options.unreadOnly) query = query.eq("is_read", false);
  if (options.ruleId) query = query.eq("notification_rule_id", options.ruleId);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TenderNotificationEvent[], error: null };
}

export async function getUnreadTenderNotificationCount(userId: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("tender_notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function getNotificationRulePreviewCounts(rules: TenderNotificationRule[]) {
  if (!rules.length) return new Map<string, number>();
  const tenders = await getPublishedTenders({});
  const counts = new Map<string, number>();
  for (const rule of rules) {
    counts.set(rule.id, tenders.filter((tender) => tenderMatchesNotificationRule(tender, rule, { ignoreActive: true })).length);
  }
  return counts;
}

export async function getTenderNotificationDiagnostics() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      activeRuleCount: null,
      targetUserCount: null,
      latestCreatedCount: null,
      latestDuplicateSkippedCount: null,
      latestErrorCount: null,
      emailPendingCount: null,
      latestProcessedAt: null,
      error: "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。"
    };
  }

  const [rules, pendingEmails, latestLog] = await Promise.all([
    supabase.from("tender_notifications").select("user_id", { count: "exact" }).eq("is_active", true).is("deleted_at", null),
    supabase.from("tender_notification_email_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("tender_crawl_logs")
      .select("started_at, finished_at, error_message")
      .like("error_message", "tender_notifications_summary:%")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (rules.error) {
    return {
      activeRuleCount: null,
      targetUserCount: null,
      latestCreatedCount: null,
      latestDuplicateSkippedCount: null,
      latestErrorCount: null,
      emailPendingCount: null,
      latestProcessedAt: null,
      error: rules.error.message
    };
  }

  const users = new Set((rules.data ?? []).map((row) => String(row.user_id)));
  const summary = parseNotificationSummary(latestLog.data?.error_message);

  return {
    activeRuleCount: rules.count ?? 0,
    targetUserCount: users.size,
    latestCreatedCount: summary?.created_count ?? null,
    latestDuplicateSkippedCount: summary?.duplicate_skipped_count ?? null,
    latestErrorCount: summary?.error_count ?? null,
    emailPendingCount: pendingEmails.count ?? 0,
    latestProcessedAt: latestLog.data?.finished_at ?? latestLog.data?.started_at ?? null,
    error: pendingEmails.error?.message ?? latestLog.error?.message ?? null
  };
}

export function normalizeRule(row: Partial<TenderNotificationRule>): TenderNotificationRule {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: row.name ?? "通知条件",
    region: row.region ?? null,
    prefecture: row.prefecture ?? null,
    tender_type: row.tender_type ?? null,
    participation_condition: row.participation_condition ?? null,
    keyword: row.keyword ?? null,
    exclude_keyword: row.exclude_keyword ?? null,
    agency_name: row.agency_name ?? null,
    defense_only: Boolean(row.defense_only),
    open_counter_only: Boolean(row.open_counter_only),
    qualification_required_only: Boolean(row.qualification_required_only),
    deadline_soon_only: Boolean(row.deadline_soon_only),
    min_days_until_deadline: Number(row.min_days_until_deadline ?? 0),
    include_unknown_deadline: row.include_unknown_deadline !== false,
    email_enabled: row.email_enabled !== false,
    app_enabled: row.app_enabled !== false,
    is_active: row.is_active !== false,
    last_matched_at: row.last_matched_at ?? null,
    deleted_at: row.deleted_at ?? null,
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? new Date(0).toISOString()
  };
}

export function notificationDeadlineLabel(event: TenderNotificationEvent) {
  const tender = event.tenders;
  if (!tender) return "-";
  const deadline = assessTenderDeadline(tender);
  const availability = assessTenderSourceAvailability(tender);
  if (deadline.deadlineAt) return `${deadline.label} (${new Date(deadline.deadlineAt).toLocaleDateString("ja-JP")})`;
  if (availability.status === "source_open") return "期限不明・公式ページ掲載中";
  if (availability.status === "source_unknown") return "期限不明";
  return "期限不明";
}

function parseNotificationSummary(value?: string | null) {
  if (!value?.startsWith("tender_notifications_summary:")) return null;
  try {
    return JSON.parse(value.slice("tender_notifications_summary:".length)) as {
      created_count?: number;
      duplicate_skipped_count?: number;
      error_count?: number;
    };
  } catch {
    return null;
  }
}
