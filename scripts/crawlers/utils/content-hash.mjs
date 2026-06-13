import { createHash } from "node:crypto";

export function buildContentHash(candidate) {
  return createHash("sha256")
    .update(JSON.stringify(buildSnapshot(candidate)))
    .digest("hex");
}

export function buildSnapshot(candidate) {
  return {
    title: normalizeValue(candidate.title),
    price_yen: candidate.price_yen ?? null,
    prefecture: normalizeValue(candidate.prefecture),
    city: normalizeValue(candidate.city),
    address_display: normalizeValue(candidate.address_display),
    property_type: normalizeValue(candidate.property_type),
    property_category: normalizeValue(candidate.property_category),
    land_area_m2: normalizeNumber(candidate.land_area_m2),
    building_area_m2: normalizeNumber(candidate.building_area_m2),
    source_url: normalizeValue(candidate.source_url),
    remarks: normalizeValue(candidate.remarks)
  };
}

export function normalizeValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}
