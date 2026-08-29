import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/;

export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashOtp(econtractId: string, otp: string, pepper: string) {
  if (!pepper) throw new Error("ECONTRACT_OTP_PEPPER is required.");
  return createHmac("sha256", pepper).update(`${econtractId}:${otp}`, "utf8").digest("hex");
}

export function secureHexEqual(left: string, right: string) {
  if (!HEX_64_PATTERN.test(left) || !HEX_64_PATTERN.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function isValidOpaqueToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value);
}

export function normalizeIdentityName(value: string) {
  return value.normalize("NFKC").replace(/[\s\u3000・･]/g, "").toLocaleLowerCase("ja-JP");
}

export function identityNamesMatch(left: string, right: string) {
  const normalizedLeft = normalizeIdentityName(left);
  const normalizedRight = normalizeIdentityName(right);
  if (!normalizedLeft || !normalizedRight) return false;
  const leftHash = Buffer.from(sha256(normalizedLeft), "hex");
  const rightHash = Buffer.from(sha256(normalizedRight), "hex");
  return timingSafeEqual(leftHash, rightHash);
}

export function maskEmail(value: string) {
  const [local, domain] = value.trim().toLowerCase().split("@");
  if (!local || !domain) return "未設定";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, Math.min(8, local.length - visible.length)))}@${domain}`;
}

export function maskCustomerName(value: string) {
  const compact = value.trim();
  if (!compact) return "申込者";
  if (compact.length === 1) return `${compact}様`;
  return `${compact.slice(0, 1)}${"＊".repeat(Math.min(4, compact.length - 1))}様`;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function buildEvidenceHash(value: unknown) {
  return sha256(stableJson(value));
}

export function createManagementNumber(kind: "purchase_intent" | "vehicle_confirmation", now = new Date()) {
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now).replaceAll("-", "");
  const stage = kind === "purchase_intent" ? "EC" : "LEGACY";
  return `EL-${date}-${stage}-${randomBytes(8).toString("hex").toUpperCase()}`;
}
