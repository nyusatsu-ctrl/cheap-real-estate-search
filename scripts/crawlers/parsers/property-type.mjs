export function inferPropertyType(text, landAreaM2 = null, buildingAreaM2 = null) {
  if (/倉庫|作業場|蔵/.test(text)) return "warehouse";
  if (/店舗|事務所|店\s/.test(text)) return "store";
  if (/古家|古屋|古民家/.test(text)) return "old_house_land";
  if (/戸建|中古住宅|住宅|家屋|建物|空き家|空家/.test(text) || buildingAreaM2) return "detached_house";
  if (/土地|宅地|更地|山林|森林|農地|田|畑/.test(text) || landAreaM2) return "land";
  return "other";
}

export function inferPropertyCategory(text, baseType) {
  if (/山林|森林|立木|原野/.test(text)) return "forest";
  if (/農地|田|畑/.test(text)) return "farmland";
  if (/別荘/.test(text)) return "vacation_house";
  if (/古家|古屋|古民家/.test(text)) return "old_house_land";
  if (/空き家|空家/.test(text)) return "vacant_house";
  return baseType;
}
