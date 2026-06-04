export function formatPrice(price: number) {
  if (price === 0) return "0円";
  if (price >= 10000) return `${Math.round(price / 10000).toLocaleString("ja-JP")}万円`;
  return `${price.toLocaleString("ja-JP")}円`;
}

export function formatArea(area: number | null) {
  if (!area) return "-";
  return `${area.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}㎡`;
}

export function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date));
}
