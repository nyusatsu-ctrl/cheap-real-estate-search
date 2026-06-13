export function createRunResult(source) {
  return {
    sourceKey: source.id,
    sourceName: source.name,
    termsNote: source.termsNote ?? null,
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
    propertyType: candidate.property_type ?? "-",
    propertyCategory: candidate.property_category ?? "-",
    sourceName: candidate.source_name ?? "-",
    sourceUrl: candidate.source_url ?? "-"
  }));

  if (rows.length === 0) {
    console.log("  候補はありません。");
    return;
  }

  console.table(rows);
}

export function printVerboseCandidateTable(result) {
  const rows = result.candidates.map((candidate) => toDiagnosticCandidate(candidate, result, { table: true }));

  if (rows.length === 0) {
    console.log("  詳細候補はありません。");
    return;
  }

  console.table(rows);
}

export function printSourceResult(result, options = {}) {
  console.log(`Source: ${result.sourceName} (${result.sourceKey})`);
  if (result.robots) {
    console.log(`Robots: ${result.robots.status} - ${result.robots.note}`);
  }
  for (const warning of result.warnings) console.log(`WARN ${warning}`);
  for (const error of result.errors) {
    console.log(`ERROR ${error.errorType}: ${error.message}${error.url ? ` (${error.url})` : ""}`);
  }
  console.log(`Found: ${result.found} / Candidates: ${result.candidates.length} / Skipped: ${result.skipped} / Failed: ${result.failed}`);
  if (options.verbose) {
    printVerboseCandidateTable(result);
  } else {
    printCandidateTable(result.candidates);
  }
}

export function toDiagnosticCandidate(candidate, result, options = {}) {
  const value = {
    title: candidate.title ?? null,
    rawPriceText: candidate.raw_price_text ?? null,
    price: candidate.price_yen ?? null,
    prefecture: candidate.prefecture ?? null,
    city: candidate.city ?? null,
    addressPartial: candidate.address_display ?? null,
    propertyType: candidate.property_type ?? null,
    propertyCategory: candidate.property_category ?? null,
    landArea: candidate.land_area_m2 ?? null,
    buildingArea: candidate.building_area_m2 ?? null,
    sourceName: candidate.source_name ?? result.sourceName ?? null,
    sourceUrl: candidate.source_url ?? null,
    duplicateKey: candidate.duplicate_key ?? null,
    contentHash: candidate.content_hash ?? null,
    crawlWarning: result.warnings ?? [],
    parseWarning: candidate.parse_warnings ?? [],
    robotsStatus: result.robots?.status ?? null,
    termsNote: result.termsNote ?? null
  };

  if (!options.table) return value;

  return {
    ...value,
    crawlWarning: value.crawlWarning.length ? value.crawlWarning.join(" / ") : "-",
    parseWarning: value.parseWarning.length ? value.parseWarning.join(" / ") : "-"
  };
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
