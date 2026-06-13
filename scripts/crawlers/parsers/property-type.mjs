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
  if (/古家付き土地|古家付土地|古屋付き土地|古屋付土地|古民家付き土地|古民家付土地/.test(text)) {
    return { propertyType: "land", propertyCategory: "old_house_with_land" };
  }
  if (/山林|森林|原野|立木/.test(text)) return { propertyType: "land", propertyCategory: "forest" };
  if (/農地|農用地|田畑|田んぼ|畑地|水田/.test(text)) return { propertyType: "land", propertyCategory: "farmland" };
  if (/土地|宅地|更地|売地|雑草地/.test(text)) return { propertyType: "land", propertyCategory: "land" };
  if (/空き家|空家/.test(text)) return { propertyType: "detached_house", propertyCategory: "vacant_house" };
  if (/戸建住宅|戸建て住宅|戸建|一戸建て|中古住宅|住宅|家屋|建物|木造家屋/.test(text)) {
    return { propertyType: "detached_house", propertyCategory: "detached_house" };
  }
  if (/別荘/.test(text)) return { propertyType: "detached_house", propertyCategory: "vacation_house" };
  return { propertyType: "other", propertyCategory: "unknown" };
}

function categoryForBaseType(baseType) {
  if (!baseType || baseType === "other") return "unknown";
  return baseType;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
