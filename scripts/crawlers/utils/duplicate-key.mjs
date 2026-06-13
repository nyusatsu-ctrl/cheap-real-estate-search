import { createHash } from "node:crypto";
import { normalizeNumber, normalizeValue } from "./content-hash.mjs";

export function buildDuplicateKey(candidate) {
  if (candidate.source_external_id) {
    return hashKey(["external", candidate.source_key, candidate.source_external_id]);
  }

  return hashKey([
    "location",
    candidate.prefecture,
    candidate.city,
    candidate.address_display,
    candidate.price_yen,
    normalizeNumber(candidate.land_area_m2),
    normalizeNumber(candidate.building_area_m2),
    normalizeTitle(candidate.title)
  ]);
}

function hashKey(parts) {
  return createHash("sha256")
    .update(parts.map((part) => normalizeValue(part)).join("|"))
    .digest("hex");
}

function normalizeTitle(value) {
  return normalizeValue(value)
    .replace(/[【】［］\[\]（）()「」『』]/g, "")
    .replace(/\s+/g, "");
}
