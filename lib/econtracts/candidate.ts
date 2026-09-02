import { canIssueLoanEcontract } from "@/lib/econtracts/rules";

export type EcontractCandidatePayload = {
  sourceSystem: "gas_loan_review";
  applicationType: "pre_screening";
  sourceRowKey: string;
  sourceRowNumber: number;
  sourceReceivedAt: string | null;
  applicationNumber: string;
  customerName: string;
  customerKana: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicleType: "car" | "bike";
  desiredVehicle: string | null;
  contractType: "loan";
  financeCompany: "premium" | "ast" | null;
  approvalStatus: "unrequested" | "pending" | "approved" | "guarantor_required" | "rejected";
};

export function normalizeEcontractCandidatePayload(value: unknown): EcontractCandidatePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const sourceRowKey = clean(input.sourceRowKey, 500);
  const sourceRowNumber = Number(input.sourceRowNumber);
  const customerName = clean(input.customerName, 200);
  const vehicleType = clean(input.vehicleType, 20);
  const contractType = clean(input.contractType, 20);
  const applicationType = clean(input.applicationType, 30);
  const financeCompany = nullableClean(input.financeCompany, 20);
  const approvalStatus = clean(input.approvalStatus, 30) || "unrequested";
  const supportedFinanceCompany = financeCompany === "premium" || financeCompany === "ast";
  const legacyApprovedCandidate = !applicationType && supportedFinanceCompany && approvalStatus === "approved";
  const applicationNumber = clean(input.applicationNumber, 500) || sourceRowKey;
  const email = clean(input.email, 320).toLowerCase();
  const receivedAt = normalizeTimestamp(input.sourceReceivedAt);

  if (
    !sourceRowKey
    || !customerName
    || !Number.isSafeInteger(sourceRowNumber)
    || sourceRowNumber < 2
    || sourceRowNumber > 10_000_000
    || !applicationNumber
    || (applicationType !== "pre_screening" && !legacyApprovedCandidate)
    || (vehicleType !== "car" && vehicleType !== "bike")
    || !canIssueLoanEcontract({ contractType })
    || (financeCompany !== null && !supportedFinanceCompany)
    || !["unrequested", "pending", "approved", "guarantor_required", "rejected"].includes(approvalStatus)
    || (financeCompany === null && approvalStatus !== "unrequested")
    || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return null;
  }

  return {
    sourceSystem: "gas_loan_review",
    applicationType: "pre_screening",
    sourceRowKey,
    sourceRowNumber,
    sourceReceivedAt: receivedAt,
    applicationNumber,
    customerName,
    customerKana: nullableClean(input.customerKana, 200),
    phone: nullableClean(input.phone, 100),
    email: email || null,
    address: nullableClean(input.address, 1000),
    vehicleType,
    desiredVehicle: nullableClean(input.desiredVehicle, 500),
    contractType: "loan",
    financeCompany: financeCompany as "premium" | "ast" | null,
    approvalStatus: approvalStatus as EcontractCandidatePayload["approvalStatus"]
  };
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").normalize("NFKC").trim().slice(0, maxLength);
}

function nullableClean(value: unknown, maxLength: number) {
  return clean(value, maxLength) || null;
}

function normalizeTimestamp(value: unknown) {
  const text = clean(value, 100);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}
