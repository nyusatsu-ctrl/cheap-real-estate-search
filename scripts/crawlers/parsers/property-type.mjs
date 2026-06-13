import { cleanupText } from "../core/fetch.mjs";

export function inferPropertyType(text, landAreaM2 = null, buildingAreaM2 = null) {
  return inferPropertyClassification({ text, landAreaM2, buildingAreaM2 }).propertyType;
}

export function inferPropertyCategory(text, baseType) {
  const classified = classifyText(text);
  if (classified.propertyCategory !== "unknown") return classified.propertyCategory;
  return categoryForBaseType(baseType);
}

export function inferPropertyClassification({ title = "", text = "", landAreaM2 = null, buildingAreaM2 = null } = {}) {
  const titleClass = classifyText(title);
  if (titleClass.propertyCategory !== "unknown") return titleClass;

  const textClass = classifyText(text);
  if (textClass.propertyCategory !== "unknown") return textClass;

  if (buildingAreaM2) return { propertyType: "detached_house", propertyCategory: "detached_house" };
  if (landAreaM2) return { propertyType: "land", propertyCategory: "land" };
  return { propertyType: "other", propertyCategory: "unknown" };
}

function classifyText(value) {
  const text = normalizeText(value);
  if (!text) return { propertyType: "other", propertyCategory: "unknown" };

  if (/倉庫|作業場|蔵/.test(text)) return { propertyType: "warehouse", propertyCategory: "warehouse" };
  if (/店舗|事務所|店\s/.test(text)) return { propertyType: "store", propertyCategory: "shop" };
  if (/山林|森林|原野|立木/.test(text)) return { propertyType: "land", propertyCategory: "forest" };
  if (isOldHouseWithLand(text)) return { propertyType: "land", propertyCategory: "old_house_with_land" };
  if (/別荘地|リゾート地|分譲地/.test(text) && /一区画|区画|土地|宅地|更地|売地|敷地|山林|原野|分譲地|別荘地/.test(text)) {
    return { propertyType: "land", propertyCategory: "vacation_house" };
  }
  if (isFarmland(text)) return { propertyType: "land", propertyCategory: "farmland" };
  if (/土地|宅地|更地|売地|雑草地/.test(text)) return { propertyType: "land", propertyCategory: "land" };
  if (/空き家|空家/.test(text)) return { propertyType: "detached_house", propertyCategory: "vacant_house" };
  if (/戸建住宅|戸建て住宅|戸建|一戸建て|中古住宅|住宅|家屋|建物|木造家屋/.test(text)) {
    return { propertyType: "detached_house", propertyCategory: "detached_house" };
  }
  if (/別荘/.test(text)) return { propertyType: "detached_house", propertyCategory: "vacation_house" };
  return { propertyType: "other", propertyCategory: "unknown" };
}

function isOldHouseWithLand(text) {
  if (/建物なし|家屋なし|古家なし|更地/.test(text)) return false;
  return /古家付き土地|古家付土地|古屋付き土地|古屋付土地|古民家付き土地|古民家付土地|家屋付き土地|建物付き土地|土地[0-9０-９〇○一二三四五六七八九十百千万]+筆と家屋|土地[0-9０-９〇○一二三四五六七八九十百千万]+筆と建物|土地複数筆と家屋|土地複数筆と建物|土地と家屋|土地と建物|宅地と家屋|宅地と建物|土地及び家屋|土地及び建物|土地および家屋|土地および建物|土地建物|土地・家屋|土地・建物|土地、家屋|土地,家屋|土地,\s*家屋|土地、建物|土地,\s*建物|土地\/家屋|土地\/建物|土地複数筆、家屋|土地複数筆、建物|合計[0-9０-９〇○一二三四五六七八九十百千万]+筆の土地、家屋|合計[0-9０-９〇○一二三四五六七八九十百千万]+筆の土地、建物|[0-9０-９〇○一二三四五六七八九十百千万]+筆の土地、家屋|[0-9０-９〇○一二三四五六七八九十百千万]+筆の土地、建物|家屋あり|建物あり/.test(text);
}

function isFarmland(text) {
  return /農地|農用地|農業用地|田畑|田んぼ|畑地|水田|耕作|お米の栽培|米の栽培|水稲|稲作|畑付き|畑付|畑あり|畑を|畑、|畑・|畑と/.test(text);
}

function categoryForBaseType(baseType) {
  if (!baseType || baseType === "other") return "unknown";
  return baseType;
}

function normalizeText(value) {
  return cleanupText(value);
}
