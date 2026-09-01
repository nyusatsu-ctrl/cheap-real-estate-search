import type { AdminIdentity } from "@/lib/admin";

export function normalizeTestRecipientEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isKnownAdminTestRecipient(
  recipient: string,
  currentAdmin: AdminIdentity,
  registeredAdminEmails: unknown[] = []
) {
  const normalizedRecipient = normalizeTestRecipientEmail(recipient);
  if (!normalizedRecipient) return false;
  if (normalizedRecipient === normalizeTestRecipientEmail(currentAdmin.email)) return true;
  return registeredAdminEmails.some((email) => normalizeTestRecipientEmail(email) === normalizedRecipient);
}
