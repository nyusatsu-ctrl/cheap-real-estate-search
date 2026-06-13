export async function crawl(source) {
  return {
    found: 0,
    candidates: [],
    warnings: [
      `${source.name} は検索アプリ型のため、Phase 1-Aではadapter雛形のみです。robots、検索条件、詳細URL構造の確認後に候補抽出を有効化します。`
    ]
  };
}
