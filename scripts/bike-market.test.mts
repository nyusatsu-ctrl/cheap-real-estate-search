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
  assert.match(summary, /平均総額[\s\S]*agg\.simple_average_price/);
  assert.match(summary, /最高総額[\s\S]*agg\.max_price/);
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
