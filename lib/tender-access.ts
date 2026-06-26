import "server-only";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createTenderSupabaseServerClient, createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { TENDER_PRODUCT_CODE, TENDER_TRIAL_DAYS } from "@/lib/tender-billing";

export type TenderSubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired" | "admin";

export type TenderMemberAccess = {
  userId: string;
  email: string;
  role: "viewer" | "admin";
  productCode: typeof TENDER_PRODUCT_CODE;
  subscriptionStatus: TenderSubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentCustomerId: string | null;
  paymentSubscriptionId: string | null;
  daysRemaining: number | null;
  isTrialExpired: boolean;
  canUse: boolean;
  setupError: string | null;
};

type CommonAuthUser = {
  id: string;
  email: string;
  role: "viewer" | "admin";
};

type AccessRow = {
  id: string;
  user_id: string;
  email: string | null;
  product_code: string;
  subscription_status: TenderSubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
};

export function canUseTenderAccess(access: TenderMemberAccess | null) {
  return Boolean(access?.canUse);
}

export async function getCurrentTenderAccess(options: { createTrialIfMissing?: boolean } = {}): Promise<TenderMemberAccess | null> {
  const user = await getCommonAuthUser();
  if (!user) return null;
  return getTenderAccessForUser(user, options);
}

export async function ensureTenderTrialForCurrentUser() {
  const user = await getCommonAuthUser();
  if (!user) redirect("/tenders/login");
  return getTenderAccessForUser(user, { createTrialIfMissing: true });
}

export async function ensureTenderTrialForUser(userId: string, email: string) {
  return getTenderAccessForUser(
    {
      id: userId,
      email,
      role: "viewer"
    },
    { createTrialIfMissing: true }
  );
}

export async function requireTenderMemberAccess() {
  const access = await getCurrentTenderAccess();
  if (!access) redirect("/tenders/login");
  return access;
}

export async function requireUsableTenderMember() {
  const access = await getCurrentTenderAccess();
  if (!access) redirect("/tenders/login");
  if (!access.canUse) redirect("/tenders/billing?trial=expired");
  return access;
}

export async function getTenderAccessDiagnostics() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      total: null,
      trialing: null,
      active: null,
      pastDue: null,
      canceled: null,
      expired: null,
      admin: null,
      trialEndsWithin3Days: null,
      trialAlreadyEnded: null,
      error: "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。"
    };
  }

  const statuses: TenderSubscriptionStatus[] = ["trialing", "active", "past_due", "canceled", "expired", "admin"];
  const results = await Promise.all([
    supabase.from("tender_user_access").select("id", { count: "exact", head: true }).eq("product_code", TENDER_PRODUCT_CODE),
    ...statuses.map((status) =>
      supabase
        .from("tender_user_access")
        .select("id", { count: "exact", head: true })
        .eq("product_code", TENDER_PRODUCT_CODE)
        .eq("subscription_status", status)
    ),
    supabase
      .from("tender_user_access")
      .select("id", { count: "exact", head: true })
      .eq("product_code", TENDER_PRODUCT_CODE)
      .eq("subscription_status", "trialing")
      .lte("trial_ends_at", new Date(Date.now() + 3 * 86_400_000).toISOString()),
    supabase
      .from("tender_user_access")
      .select("id", { count: "exact", head: true })
      .eq("product_code", TENDER_PRODUCT_CODE)
      .eq("subscription_status", "trialing")
      .lte("trial_ends_at", new Date().toISOString())
  ]);

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    return {
      total: null,
      trialing: null,
      active: null,
      pastDue: null,
      canceled: null,
      expired: null,
      admin: null,
      trialEndsWithin3Days: null,
      trialAlreadyEnded: null,
      error: firstError.message
    };
  }

  return {
    total: results[0].count ?? 0,
    trialing: results[1].count ?? 0,
    active: results[2].count ?? 0,
    pastDue: results[3].count ?? 0,
    canceled: results[4].count ?? 0,
    expired: results[5].count ?? 0,
    admin: results[6].count ?? 0,
    trialEndsWithin3Days: results[7].count ?? 0,
    trialAlreadyEnded: results[8].count ?? 0,
    error: null
  };
}

export function tenderAccessStatusLabel(status: TenderSubscriptionStatus) {
  return {
    trialing: "無料体験中",
    active: "有料利用中",
    past_due: "支払い確認中",
    canceled: "解約済み",
    expired: "無料体験終了",
    admin: "管理者"
  }[status];
}

export function tenderAccessNotice(access: TenderMemberAccess | null) {
  if (!access) return "ログインすると14日間無料で官公庁案件サーチを利用できます。";
  if (access.subscriptionStatus === "admin") return "管理者アカウントのため利用期限の対象外です。";
  if (access.subscriptionStatus === "trialing") {
    return access.daysRemaining === null
      ? "14日間の無料体験中です。"
      : `無料体験の残り日数: ${access.daysRemaining}日`;
  }
  if (access.subscriptionStatus === "active") return "有料プランで利用中です。";
  if (access.subscriptionStatus === "past_due") return "お支払いを確認できないため、利用が制限されています。";
  if (access.subscriptionStatus === "canceled") return "有料プランが解約済みのため、利用が制限されています。";
  return "14日間の無料体験が終了しました。有料プランへ申し込むと再開できます。";
}

export function emailHash(email: string) {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

async function getTenderAccessForUser(user: CommonAuthUser, options: { createTrialIfMissing?: boolean }): Promise<TenderMemberAccess> {
  if (user.role === "admin") return adminAccess(user);

  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    const message = "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。";
    return process.env.NODE_ENV === "production" ? fallbackExpiredAccess(user, message) : fallbackTrialAccess(user, message);
  }

  const hash = emailHash(user.email);
  const selected = await supabase
    .from("tender_user_access")
    .select("*")
    .eq("product_code", TENDER_PRODUCT_CODE)
    .or(`user_id.eq.${user.id},email_hash.eq.${hash}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selected.error && isSchemaError(selected.error.message)) {
    return fallbackExpiredAccess(user, selected.error.message);
  }

  if (selected.error) return fallbackExpiredAccess(user, selected.error.message);

  let row = selected.data as AccessRow | null;
  if (!row && options.createTrialIfMissing) {
    row = await createTrialAccessRow(user, hash);
  }

  if (!row) return fallbackExpiredAccess(user, null);

  if (row.user_id !== user.id || normalizeEmail(row.email ?? "") !== normalizeEmail(user.email)) {
    const { data } = await supabase
      .from("tender_user_access")
      .update({ user_id: user.id, email: user.email, email_hash: hash })
      .eq("id", row.id)
      .select("*")
      .maybeSingle();
    row = (data as AccessRow | null) ?? row;
  }

  if (row.subscription_status === "trialing" && isPast(row.trial_ends_at)) {
    const { data } = await supabase
      .from("tender_user_access")
      .update({ subscription_status: "expired" })
      .eq("id", row.id)
      .eq("subscription_status", "trialing")
      .select("*")
      .maybeSingle();
    row = (data as AccessRow | null) ?? { ...row, subscription_status: "expired" };
  }

  return normalizeAccessRow(user, row);
}

async function getCommonAuthUser(): Promise<CommonAuthUser | null> {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) {
    return {
      id: "demo-tender-user",
      email: "demo@example.com",
      role: "viewer"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabase.from("profiles").select("role,email").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: profile?.email ?? user.email,
    role: profile?.role === "admin" ? "admin" : "viewer"
  };
}

async function createTrialAccessRow(user: CommonAuthUser, hash: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) throw new Error("TENDER_SUPABASE_SERVICE_ROLE_KEY is required.");
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TENDER_TRIAL_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("tender_user_access")
    .insert({
      user_id: user.id,
      email: user.email,
      email_hash: hash,
      product_code: TENDER_PRODUCT_CODE,
      subscription_status: "trialing",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AccessRow;
}

function normalizeAccessRow(user: CommonAuthUser, row: AccessRow): TenderMemberAccess {
  const status = row.subscription_status;
  const daysRemaining = status === "trialing" && row.trial_ends_at ? Math.max(0, Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86_400_000)) : null;
  const isTrialExpired = status === "trialing" && isPast(row.trial_ends_at);
  const canUse = status === "admin" || status === "active" || (status === "trialing" && !isTrialExpired);
  return {
    userId: user.id,
    email: user.email,
    role: "viewer",
    productCode: TENDER_PRODUCT_CODE,
    subscriptionStatus: status,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    paymentCustomerId: row.payment_customer_id,
    paymentSubscriptionId: row.payment_subscription_id,
    daysRemaining,
    isTrialExpired,
    canUse,
    setupError: null
  };
}

function adminAccess(user: CommonAuthUser): TenderMemberAccess {
  return {
    userId: user.id,
    email: user.email,
    role: "admin",
    productCode: TENDER_PRODUCT_CODE,
    subscriptionStatus: "admin",
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    paymentCustomerId: null,
    paymentSubscriptionId: null,
    daysRemaining: null,
    isTrialExpired: false,
    canUse: true,
    setupError: null
  };
}

function fallbackTrialAccess(user: CommonAuthUser, setupError: string): TenderMemberAccess {
  const trialEndsAt = new Date(Date.now() + TENDER_TRIAL_DAYS * 86_400_000).toISOString();
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    productCode: TENDER_PRODUCT_CODE,
    subscriptionStatus: "trialing",
    trialStartedAt: new Date().toISOString(),
    trialEndsAt,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    paymentCustomerId: null,
    paymentSubscriptionId: null,
    daysRemaining: TENDER_TRIAL_DAYS,
    isTrialExpired: false,
    canUse: true,
    setupError
  };
}

function fallbackExpiredAccess(user: CommonAuthUser, setupError: string | null): TenderMemberAccess {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    productCode: TENDER_PRODUCT_CODE,
    subscriptionStatus: "expired",
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    paymentCustomerId: null,
    paymentSubscriptionId: null,
    daysRemaining: null,
    isTrialExpired: true,
    canUse: false,
    setupError
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isPast(value: string | null) {
  if (!value) return false;
  return new Date(value).getTime() <= Date.now();
}

function isSchemaError(message: string) {
  return /schema cache|does not exist|Could not find|relation|column/i.test(message);
}
