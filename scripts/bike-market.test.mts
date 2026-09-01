import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

type BikeMarketSandbox = {
  WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE: unknown;
  getDefaultBikeModelDictionaryEntries_(): unknown;
  normalizeBikeMarketKeyPart_(value: string): string;
  getBikeMarketModelMatchInfo_(input: string, title: string): { matched: boolean };
  splitMultipleBikeModelInput_(value: string): string[];
  summarizeBikeListings_(
    bikeName: string,
    yearInput: string,
    listings: Array<{ totalPriceYen: number; source: string; title: string; url: string }>,
    fetchedAt: string,
    counts: { extractedCount: number; yearMatchedCount: number }
  ): {
    priceAggregation: {
      min_price: number;
      max_price: number;
      normal_min_price: number;
      normal_max_price: number;
      average_price: number;
      simple_average_price: number;
      high_price_outlier_count: number;
      high_price_outlier_prices: number[];
      high_price_outlier_items: Array<{ price: number; title: string }>;
    };
  };
  getBikeMarketAggregation_(summary: unknown): {
    average_price: number;
    high_price_outlier_prices: number[];
  };
  runBikeMarketExternalDiagnosisForInput_(
    bikeName: string,
    yearInput: string,
    normalizedYear: { cachePart: string },
    now: Date,
    modelResolution: unknown
  ): { summary?: { status?: string }; usedGoobikeOfficialModelName?: string };
};

async function read(relativePath: string) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function loadBikeMarketServer() {
  const source = await read("gas-src/CustomerService.js");
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    trimFullWidth: (value: unknown) => String(value ?? "").replace(/^[\s　]+|[\s　]+$/g, ""),
    Utilities: {
      formatDate: () => "2026/09/02 12:00:00",
      sleep() {},
    },
  });
  vm.runInContext(source, context, { filename: "CustomerService.js" });
  const sandbox = context as unknown as BikeMarketSandbox;
  sandbox.WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = sandbox.getDefaultBikeModelDictionaryEntries_();
  return { context, sandbox, source };
}

test("相場取得中は上下両方のボタンと進捗表示を更新する", async () => {
  const html = await read("gas-src/Index.html");
  assert.match(html, /\['topMarketSearchButton', 'marketSearchButton'\]/);
  assert.match(html, /button\.textContent = isBusy \? '相場取得中…' : '相場取得'/);
  assert.match(html, /id="marketSearchProgress"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /GooBikeから相場を取得しています。完了までそのままお待ちください。/);
});

test("審査管理画面のメインスクリプトに構文エラーがない", async () => {
  const html = await read("gas-src/Index.html");
  const script = html.match(/<script>\s*\/\/ 申込書の機械印字[\s\S]*?<\/script>/)?.[0]
    .replace(/^<script>/, "")
    .replace(/<\/script>$/, "")
    .replace(/const MARKET_ADMIN_PASSCODE = <\?!=[\s\S]*?\?>;/, "const MARKET_ADMIN_PASSCODE = '';")
    .replace(/const INITIAL_LOAN_REVIEW_PARAMS = <\?!=[\s\S]*?\?>;/, "const INITIAL_LOAN_REVIEW_PARAMS = {};");
  assert.ok(script, "main script must exist");
  assert.doesNotThrow(() => new vm.Script(script, { filename: "Index.html" }));
});

test("相場結果の主要欄に最低・平均・最高の3価格を表示する", async () => {
  const html = await read("gas-src/Index.html");
  const summary = html.match(/function marketSuccessSummaryHtml[\s\S]*?function marketCandidateButtonsHtml/)?.[0] ?? "";
  assert.match(summary, /最低総額[\s\S]*agg\.min_price/);
  assert.match(summary, /平均総額（高額車両除外）[\s\S]*agg\.average_price/);
  assert.match(summary, /最高総額[\s\S]*agg\.max_price/);
});

test("突拍子もなく高い車両は金額を残し、通常平均からだけ除外する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const prices = [300000, 320000, 340000, 360000, 2000000];
  const result = sandbox.summarizeBikeListings_(
    "テストバイク400",
    "2024",
    prices.map((price, index) => ({
      totalPriceYen: price,
      source: "GooBike",
      title: index === 4 ? "フルカスタム車" : `通常車${index + 1}`,
      url: `https://example.invalid/bike/${index + 1}`,
    })),
    "2026/09/02 12:00:00",
    { extractedCount: prices.length, yearMatchedCount: prices.length }
  );
  const agg = result.priceAggregation;
  assert.equal(agg.min_price, 300000);
  assert.equal(agg.max_price, 2000000, "高額車両の価格自体は最高額として残す");
  assert.equal(agg.simple_average_price, 664000, "全件の単純平均も内部情報として残す");
  assert.equal(agg.average_price, 330000, "通常表示の平均から高額車両だけを除外する");
  assert.equal(agg.normal_min_price, 300000);
  assert.equal(agg.normal_max_price, 360000);
  assert.equal(agg.high_price_outlier_count, 1);
  assert.deepEqual(Array.from(agg.high_price_outlier_prices), [2000000]);
  assert.equal(agg.high_price_outlier_items[0]?.title, "フルカスタム車");
});

test("通常の価格差は外れ値扱いせず全件で平均する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const prices = [300000, 320000, 340000, 360000, 390000];
  const result = sandbox.summarizeBikeListings_(
    "テストバイク400",
    "2024",
    prices.map((price, index) => ({
      totalPriceYen: price,
      source: "GooBike",
      title: `通常車${index + 1}`,
      url: `https://example.invalid/normal/${index + 1}`,
    })),
    "2026/09/02 12:00:00",
    { extractedCount: prices.length, yearMatchedCount: prices.length }
  );
  assert.equal(result.priceAggregation.high_price_outlier_count, 0);
  assert.equal(result.priceAggregation.average_price, 342000);
  assert.equal(result.priceAggregation.simple_average_price, 342000);
});

test("高額外れ値の金額を参考情報として画面へ表示する", async () => {
  const html = await read("gas-src/Index.html");
  const renderer = html.match(/function marketHighPriceOutliersHtml[\s\S]*?function marketCandidateButtonsHtml/)?.[0] ?? "";
  assert.match(renderer, /参考：高額車両（平均から除外）/);
  assert.match(renderer, /high_price_outlier_prices/);
  assert.match(renderer, /通常の平均総額には含めていません/);
  assert.match(html, /通常価格帯[\s\S]*agg\.normal_min_price[\s\S]*agg\.normal_max_price/);
});

test("保存済みの旧相場データも掲載明細から新しい平均へ再計算する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const prices = [300000, 320000, 340000, 360000, 2000000];
  const aggregation = sandbox.getBikeMarketAggregation_({
    bikeName: "テストバイク400",
    yearInput: "2024",
    fetchedAt: "2026/09/01 12:00:00",
    extractedCount: prices.length,
    yearMatchedCount: prices.length,
    priceAggregation: { simple_average_price: 664000 },
    listings: prices.map((price, index) => ({
      totalPriceYen: price,
      source: "GooBike",
      title: index === 4 ? "フルカスタム車" : `通常車${index + 1}`,
      url: `https://example.invalid/bike/${index + 1}`,
    })),
  });
  assert.equal(aggregation.average_price, 330000);
  assert.deepEqual(Array.from(aggregation.high_price_outlier_prices), [2000000]);
});

test("メーカー名やグレードを含む1車種は複数候補として誤分割しない", async () => {
  const { sandbox } = await loadBikeMarketServer();
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("ホンダ レブル")), ["ホンダ レブル"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("Ninja ZX-25R SE")), ["Ninja ZX-25R SE"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("CBR250RR MC22")), ["CBR250RR MC22"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("NMAX125 PCX125 CUB110")), ["NMAX125", "PCX125", "CUB110"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("マグナ50 または エイプ50")), ["マグナ50", "エイプ50"]);
});

test("CB400SFとGooBikeのSUPER FOUR表記を同一車種として扱う", async () => {
  const { sandbox } = await loadBikeMarketServer();
  assert.equal(sandbox.normalizeBikeMarketKeyPart_("CB400 SUPER FOUR"), "cb400sf");
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("CB400SF", "ホンダ CB400 SUPER FOUR VTEC").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("CB400SF", "ホンダ CBR400R").matched, false);
});

test("車種マスタが未更新でも入力車種名そのもので外部検索を続行する", async () => {
  const { context, sandbox } = await loadBikeMarketServer();
  vm.runInContext(`
    var __searchedBikeName = '';
    runBikeMarketExternalDiagnosis_ = function(bikeName) {
      __searchedBikeName = bikeName;
      return { summary: { status: 'success', diagnostics: {} }, parsedListings: [], matchedListings: [] };
    };
    buildBikeModelDictionaryDiagnostics_ = function() { return {}; };
  `, context);
  const result = sandbox.runBikeMarketExternalDiagnosisForInput_(
    "ホンダ レブル",
    "",
    { cachePart: "all" },
    new Date("2026-09-02T03:00:00Z"),
    { status: "master_unavailable", candidates: [] }
  );
  assert.equal(result.summary?.status, "success");
  assert.equal(vm.runInContext("__searchedBikeName", context), "ホンダ レブル");
  assert.equal(result.usedGoobikeOfficialModelName, "");
});

test("GooBike取得リクエストにブラウザー相当のヘッダーを付ける", async () => {
  const { source } = await loadBikeMarketServer();
  const fetcher = source.match(/function fetchGoobikeUrlForDiagnosis_[\s\S]*?function isUsableGoobikeListingPage_/)?.[0] ?? "";
  assert.match(fetcher, /'User-Agent'/);
  assert.match(fetcher, /'Accept-Language': 'ja-JP/);
  assert.match(fetcher, /'Accept-Encoding': 'identity'/);
});
