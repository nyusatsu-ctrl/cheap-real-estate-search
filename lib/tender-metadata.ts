import type { Metadata } from "next";

const tenderDescription = "物品・役務・オープンカウンター・全省庁統一資格対象の官公庁案件を検索できる案件収集アプリです。";

export function tenderMetadata(title: string, description = tenderDescription): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "官公庁案件サーチ",
      type: "website"
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}
