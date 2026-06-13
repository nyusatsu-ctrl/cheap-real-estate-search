export function createRunResult(source) {
  return {
    sourceKey: source.id,
    sourceName: source.name,
    found: 0,
    candidates: [],
    warnings: [],
    errors: [],
    skipped: 0,
    failed: 0,
    inserted: 0,
    updated: 0,
    robots: null
  };
}

export function formatCrawlerError(error, context = {}) {
  return {
    sourceKey: context.sourceKey ?? null,
    url: context.url ?? error.url ?? null,
    errorType: error.name ?? "Error",
    statusCode: error.statusCode ?? null,
    message: error.message ?? String(error)
  };
}

export function printCandidateTable(candidates) {
  const rows = candidates.map((candidate) => ({
    title: truncate(candidate.title, 36),
    price: candidate.price_yen === null || candidate.price_yen === undefined ? "-" : `${candidate.price_yen.toLocaleString("ja-JP")}円`,
    prefecture: candidate.prefecture ?? "-",
    city: candidate.city ?? "-",
    propertyType: candidate.property_category ?? candidate.property_type ?? "-",
    sourceName: candidate.source_name ?? "-",
    sourceUrl: truncate(candidate.source_url, 56)
  }));

  if (rows.length === 0) {
    console.log("  候補はありません。");
    return;
  }

  console.table(rows);
}

export function printSourceResult(result) {
  console.log(`Source: ${result.sourceName} (${result.sourceKey})`);
  if (result.robots) {
    console.log(`Robots: ${result.robots.status} - ${result.robots.note}`);
  }
  for (const warning of result.warnings) console.log(`WARN ${warning}`);
  for (const error of result.errors) {
    console.log(`ERROR ${error.errorType}: ${error.message}${error.url ? ` (${error.url})` : ""}`);
  }
  console.log(`Found: ${result.found} / Candidates: ${result.candidates.length} / Skipped: ${result.skipped} / Failed: ${result.failed}`);
  printCandidateTable(result.candidates);
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
