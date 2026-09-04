import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

type BikeMarketSandbox = {
  WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE: unknown;
  WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE: unknown;
  getDefaultBikeModelDictionaryEntries_(): unknown;
  getGoobikeModelMasterSeedRows_(updatedAt: string): unknown;
  normalizeBikeMarketKeyPart_(value: string): string;
  normalizeGoobikeSearchPhrase_(value: string): string;
  getBikeModelDictionaryEntryForName_(value: string): { canonicalKey: string; prioritySearchWord: string } | null;
  getBikeModelSearchPhrases_(value: string): string[];
  buildGoobikeDiagnosisUrls_(bikeName: string, normalizedYear: { valid: boolean; unspecified: boolean; from: number | null; to: number | null }): string[];
  getBikeMarketModelMatchInfo_(input: string, title: string): { matched: boolean };
  splitMultipleBikeModelInput_(value: string): string[];
  normalizeYearInput_(value: string): { cachePart: string; from: number | null; to: number | null; centerYear?: number; approximate?: boolean; unspecified: boolean; valid: boolean };
  normalizeBikeMarketYearForModel_(bikeName: string, value: string): { cachePart: string; from: number | null; to: number | null; centerYear?: number; effectiveCenterYear?: number; approximate?: boolean; modelAdjusted?: boolean; adjustedToLatestComparableYear?: boolean; generationLabel?: string; unspecified: boolean; valid: boolean };
  getBikeMarketYearConditionLabel_(value: { from: number | null; to: number | null; centerYear?: number; approximate?: boolean; modelAdjusted?: boolean; adjustedToLatestComparableYear?: boolean; generationLabel?: string; unspecified: boolean; valid: boolean }): string;
  isYearMatched_(listingYear: number, normalizedYear: { from: number | null; to: number | null; unspecified: boolean; valid: boolean }): boolean;
  buildGoobikeFreeSearchUrl_(bikeName: string, normalizedYear: { from: number | null; to: number | null; unspecified: boolean; valid: boolean }): string;
  getBikeMarketSummaryWithCache_(bikeName: string, yearInput: string, now: Date): {
    modelCount?: number;
    successfulModelCount?: number;
    normalizedYearLabel?: string;
    modelResults?: Array<{ bikeName: string; status: string; normalizedYearLabel: string; priceAggregation: { average_price: number } }>;
  };
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

test("空白や接続詞で併記されたフォルツァとCB400SFを2車種へ分ける", async () => {
  const { sandbox } = await loadBikeMarketServer();
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("フォルツァ CB400SF")), ["フォルツァ", "CB400SF"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("フォルツァとCB400スーパーフォアSF")), ["フォルツァ", "CB400スーパーフォアSF"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("フォルツァかCB400SFどちらか希望")), ["フォルツァ", "CB400SF"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("フォルツァ / CB400SF")), ["フォルツァ", "CB400SF"]);
});

test("隼とXJR1300を2車種へ分け、GooBike正式表記にも照合する", async () => {
  const { sandbox, source } = await loadBikeMarketServer();
  sandbox.WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = sandbox.getGoobikeModelMasterSeedRows_("2026/09/04 06:00:00");

  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("隼 XJR1300")), ["隼", "XJR1300"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("ハヤブサとXJR 1300")), ["ハヤブサ", "XJR 1300"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("ハヤブサ ペケJR1300")), ["ハヤブサ", "ペケJR1300"]);
  assert.equal(sandbox.getBikeModelDictionaryEntryForName_("隼")?.canonicalKey, "gsx1300rhayabusa");
  assert.match(source, /WEBAPP_BIKE_MARKET_CACHE_VERSION = 'v26-model-aliases'/, "古い車種判定キャッシュを再利用しない");
  assert.ok(Array.from(sandbox.getBikeModelSearchPhrases_("隼")).includes("GSX1300R Hayabusa"));
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("隼", "スズキ ハヤブサ（GSX1300R Hayabusa） 2020年式").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("XJR1300", "ヤマハ XJR1300 2018年式").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("ペケJR1300", "ヤマハ XJR1300 2018年式").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("XJR1300", "ヤマハ XJR1200").matched, false);

  const xjrUrls = Array.from(sandbox.buildGoobikeDiagnosisUrls_("XJR1300", sandbox.normalizeBikeMarketYearForModel_("XJR1300", "2020年位")));
  assert.ok(xjrUrls.includes("https://www.goobike.com/maker-yamaha/car-xjr1300/index.html"));
  assert.ok(xjrUrls.includes("https://www.goobike.com/maker-yamaha/car-xjr1300/used/index.html"));
  assert.ok(xjrUrls.some((url) => url.includes("phrase=XJR1300") && url.includes("syear1=2015") && url.includes("syear2=2018")));
});

test("現在の申込一覧にある特定可能な車種表記を検索辞書へ解決する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const currentSpecificInputs: Array<[string, string]> = [
    ["pcx１２５", "pcx125"],
    ["ヤマハ ドラッグスタークラシック400 10thアニバーサリーエディション", "dragstarclassic400"],
    ["CBX550F", "cbx550f"],
    ["gsx250eザリ", "gsx250e"],
    ["ZRX400", "zrx400"],
    ["Kawasaki ZX 10R", "ninjazx10r"],
    ["ホンダ NS-1", "ns1"],
    ["カワサキ DトラッカーX", "dtrackerx"],
    ["ジェイド", "jade250"],
    ["ハーレーダビッドソン XL883", "xl883"],
    ["gt380", "gt380"],
    ["ジャイロx50cc", "gyro_x"],
    ["mt-10", "mt10"],
    ["GB350", "gb350"],
    ["クロスカブ110ライト", "crosscub110"],
    ["ＧＳＸ－Ｒ１２５", "gsxr125"],
    ["s1000rr", "bmws1000rr"],
    ["CBR２５０RR MC２２", "cbr250rrmc22"],
    ["Ｎmax 155cc", "nmax155"],
    ["Ninja Zx-25r SE", "ninjazx25rse"],
    ["ドラッグスター400", "dragstar400"],
    ["cbx400f", "cbx400f"],
    ["VTR1000F", "vtr1000f"],
    ["cb400n", "cb400n"],
    ["ヤマハ ビーノ", "vino"],
    ["バリオス1〜2", "balius"],
    ["ＺＲＸ４００－II", "zrx400"],
  ];

  for (const [input, canonicalKey] of currentSpecificInputs) {
    const entry = sandbox.getBikeModelDictionaryEntryForName_(input);
    assert.equal(entry?.canonicalKey, canonicalKey, `${input} must resolve to ${canonicalKey}`);
    assert.ok(entry?.prioritySearchWord, `${input} must have a GooBike search phrase`);
  }

  assert.equal(sandbox.getBikeModelDictionaryEntryForName_("125cc"), null, "排気量だけで特定車種を決めない");
  assert.equal(sandbox.getBikeModelDictionaryEntryForName_("ハーレー"), null, "メーカー名だけで特定車種を決めない");
  assert.equal(sandbox.getBikeModelDictionaryEntryForName_("ホンダ レブル"), null, "排気量不明のレブルを1車種へ固定しない");
});

test("空白・句読点・ピリオドで併記された最大3車種を個別に分ける", async () => {
  const { sandbox } = await loadBikeMarketServer();
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("インパルス400 xjr400 ジェイド250")), ["インパルス400", "xjr400", "ジェイド250"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("GSX250E GSX250T GSX250L")), ["GSX250E", "GSX250T", "GSX250L"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("w650、w400.tr250")), ["w650", "w400", "tr250"]);
  assert.deepEqual(Array.from(sandbox.splitMultipleBikeModelInput_("CB400sf、ZX25R")), ["CB400sf", "ZX25R"]);
});

test("フォルツァの日本語検索語を消さず、ひらがな・カタカナ・英字を相互照合する", async () => {
  const { sandbox, source } = await loadBikeMarketServer();
  sandbox.WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = sandbox.getGoobikeModelMasterSeedRows_("2026/09/02 12:00:00");

  assert.equal(sandbox.normalizeGoobikeSearchPhrase_("フォルツァ"), "フォルツァ");
  assert.equal(sandbox.normalizeGoobikeSearchPhrase_("スーパーカブ110プロ"), "スーパーカブ110プロ");
  assert.equal(sandbox.normalizeBikeMarketKeyPart_("ふぉるつぁ"), sandbox.normalizeBikeMarketKeyPart_("フォルツァ"));
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("ふぉるつぁ", "HONDA FORZA 2025").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("FORZA", "ホンダ フォルツァ 2025年モデル").matched, true);
  assert.equal(sandbox.getBikeMarketModelMatchInfo_("しーびー400すーぱーふぉあ", "HONDA CB400 SUPER FOUR VTEC").matched, true);

  const phrases = Array.from(sandbox.getBikeModelSearchPhrases_("フォルツァ"));
  assert.ok(phrases.includes("フォルツァ"));
  assert.ok(phrases.some((phrase) => /^forza$/i.test(phrase)));

  const urls = Array.from(sandbox.buildGoobikeDiagnosisUrls_("ふぉるつぁ", sandbox.normalizeYearInput_("2002年式以降")));
  assert.match(urls[0], /\/cgi-bin\/fsearch\/search\.cgi/);
  assert.ok(urls.includes("https://www.goobike.com/maker-honda/car-forza/index.html"));
  assert.ok(urls.some((url) => url.includes("%E3%83%95%E3%82%A9%E3%83%AB%E3%83%84%E3%82%A1")));
  assert.match(source, /mergeGoobikeModelMasterRows_\(seedRows\.concat\(rows\)\)/);
});

test("年式欄の以降・以前・元号表現を検索範囲へ変換する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const since2002 = sandbox.normalizeYearInput_("2002年式以降");
  assert.equal(since2002.cachePart, "2002+");
  assert.equal(since2002.from, 2002);
  assert.equal(since2002.to, null);
  assert.equal(sandbox.isYearMatched_(2001, since2002), false);
  assert.equal(sandbox.isYearMatched_(2002, since2002), true);
  assert.equal(sandbox.isYearMatched_(2026, since2002), true);

  const reiwa = sandbox.normalizeYearInput_("令和以降");
  assert.equal(reiwa.from, 2019);
  assert.equal(reiwa.to, null);
  assert.equal(sandbox.normalizeYearInput_("令和3年以降で希望").from, 2021);
  assert.equal(sandbox.normalizeYearInput_("平成30年以降").from, 2018);

  const until2010 = sandbox.normalizeYearInput_("2010年式以前");
  assert.equal(until2010.from, null);
  assert.equal(until2010.to, 2010);
  assert.equal(sandbox.isYearMatched_(2010, until2010), true);
  assert.equal(sandbox.isYearMatched_(2011, until2010), false);

  const searchUrl = sandbox.buildGoobikeFreeSearchUrl_("フォルツァ", since2002);
  assert.match(searchUrl, /syear1=2002/);
  assert.match(searchUrl, new RegExp(`syear2=${new Date().getFullYear() + 1}`));
});

test("2020年ぐらいの基本解釈は前後2年を維持する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const approximate = sandbox.normalizeYearInput_("2020年ぐらい");
  const kanjiApproximate = sandbox.normalizeYearInput_("2020年位");

  assert.equal(approximate.cachePart, "~2020");
  assert.equal(approximate.centerYear, 2020);
  assert.equal(approximate.approximate, true);
  assert.equal(approximate.from, 2018);
  assert.equal(approximate.to, 2022);
  assert.equal(kanjiApproximate.cachePart, "~2020");
  assert.equal(sandbox.isYearMatched_(2018, approximate), true, "XJR1300の最終年式を含める");
  assert.equal(sandbox.isYearMatched_(2021, approximate), true, "ハヤブサの近い年式を含める");
  assert.equal(sandbox.isYearMatched_(2017, approximate), false);
  assert.equal(sandbox.isYearMatched_(2023, approximate), false);
  assert.equal(sandbox.getBikeMarketYearConditionLabel_(approximate), "2020年式前後（2018年～2022年）");

  const exact = sandbox.normalizeYearInput_("2020年式");
  assert.equal(exact.from, 2020);
  assert.equal(exact.to, 2020);
  assert.equal(exact.approximate, undefined);
});

test("近似年式をハヤブサの同世代とXJR1300の最終登録年付近へ車種別補正する", async () => {
  const { sandbox } = await loadBikeMarketServer();
  const hayabusa = sandbox.normalizeBikeMarketYearForModel_("隼", "2020年ぐらい");
  assert.equal(hayabusa.from, 2017);
  assert.equal(hayabusa.to, 2020, "2021年の3代目を混ぜない");
  assert.equal(hayabusa.generationLabel, "2代目");
  assert.equal(sandbox.isYearMatched_(2020, hayabusa), true);
  assert.equal(sandbox.isYearMatched_(2021, hayabusa), false);
  assert.equal(sandbox.getBikeMarketYearConditionLabel_(hayabusa), "2020年式前後（同世代 2017年～2020年・2代目）");

  const xjr = sandbox.normalizeBikeMarketYearForModel_("XJR1300", "2020年ぐらい");
  assert.equal(xjr.from, 2015);
  assert.equal(xjr.to, 2018);
  assert.equal(xjr.effectiveCenterYear, 2018);
  assert.equal(xjr.adjustedToLatestComparableYear, true);
  assert.equal(xjr.generationLabel, "FI世代");
  assert.equal(sandbox.isYearMatched_(2015, xjr), true);
  assert.equal(sandbox.isYearMatched_(2018, xjr), true);
  assert.equal(sandbox.isYearMatched_(2019, xjr), false);
  assert.equal(sandbox.getBikeMarketYearConditionLabel_(xjr), "2020年頃の希望 → 最終登録年付近（2015年～2018年・FI世代）");

  const exact = sandbox.normalizeBikeMarketYearForModel_("XJR1300", "2020年式");
  assert.equal(exact.from, 2020, "完全一致指定は勝手に補正しない");
  assert.equal(exact.to, 2020);
});

test("2車種は同じ年式条件で個別取得し、価格を混ぜずに保持する", async () => {
  const { context, sandbox } = await loadBikeMarketServer();
  vm.runInContext(`
    getSingleBikeMarketSummaryWithCache_ = function(bikeName, yearInput, now) {
      var average = bikeName === 'フォルツァ' ? 410000 : 780000;
      return {
        bikeName: bikeName,
        yearInput: yearInput,
        status: 'success',
        fetchedAt: '2026/09/02 12:00:00',
        sources: ['GooBike'],
        priceAggregation: {
          extracted_count: 5,
          year_matched_count: 5,
          price_available_count: 5,
          calculation_target_count: 5,
          min_price: average - 100000,
          max_price: average + 100000,
          average_price: average,
          simple_average_price: average,
          median_price: average,
          trimmed_average_price: average,
          reference_market_price: average,
          calculation_method: 'median_3_to_6_items'
        }
      };
    };
  `, context);
  const result = sandbox.getBikeMarketSummaryWithCache_("フォルツァ CB400SF", "2002年式以降", new Date("2026-09-02T03:00:00Z"));
  assert.equal(result.modelCount, 2);
  assert.equal(result.successfulModelCount, 2);
  assert.equal(result.normalizedYearLabel, "2002年式以降");
  assert.deepEqual(Array.from(result.modelResults || [], (item) => item.bikeName), ["フォルツァ", "CB400SF"]);
  assert.deepEqual(Array.from(result.modelResults || [], (item) => item.priceAggregation.average_price), [410000, 780000]);
  assert.deepEqual(Array.from(result.modelResults || [], (item) => item.normalizedYearLabel), ["2002年式以降", "2002年式以降"]);
});

test("隼とXJR1300へ同じ近似年式条件を個別適用する", async () => {
  const { context, sandbox } = await loadBikeMarketServer();
  vm.runInContext(`
    getSingleBikeMarketSummaryWithCache_ = function(bikeName, yearInput) {
      var normalizedYear = normalizeBikeMarketYearForModel_(bikeName, yearInput);
      return {
        bikeName: bikeName,
        yearInput: yearInput,
        status: 'success',
        fetchedAt: '2026/09/04 06:00:00',
        sources: ['GooBike'],
        warnings: [],
        priceAggregation: {
          valid_price_count: 5,
          price_available_count: 5,
          calculation_target_count: 5,
          min_price: bikeName === '隼' ? 900000 : 700000,
          max_price: bikeName === '隼' ? 1500000 : 1000000,
          average_price: bikeName === '隼' ? 1200000 : 850000,
          simple_average_price: bikeName === '隼' ? 1200000 : 850000,
          median_price: bikeName === '隼' ? 1200000 : 850000,
          trimmed_average_price: bikeName === '隼' ? 1200000 : 850000,
          reference_market_price: bikeName === '隼' ? 1200000 : 850000,
          calculation_method: 'median_3_to_6_items'
        },
        normalizedYear: normalizedYear
      };
    };
  `, context);

  const result = sandbox.getBikeMarketSummaryWithCache_("隼 XJR1300", "2020年位", new Date("2026-09-03T21:00:00Z"));
  assert.equal(result.modelCount, 2);
  assert.deepEqual(Array.from(result.modelResults || [], (item) => item.bikeName), ["隼", "XJR1300"]);
  assert.deepEqual(
    Array.from(result.modelResults || [], (item) => item.normalizedYearLabel),
    ["2020年式前後（同世代 2017年～2020年・2代目）", "2020年頃の希望 → 最終登録年付近（2015年～2018年・FI世代）"]
  );
});

test("審査管理画面は2車種の相場を別カードで表示する", async () => {
  const html = await read("gas-src/Index.html");
  assert.match(html, /function marketMultiModelResultsHtml/);
  assert.match(html, /車種を別々に取得しています/);
  assert.match(html, /market-model-result-head/);
  assert.match(html, /2002年式以降 \/ 令和以降/);
  assert.match(html, /車種ごとのモデル世代で絞り、生産終了後の希望は最終登録年付近へ補正/);
});

test("複数車種でも取得処理が長時間化しないようURL数と明細取得数を制限する", async () => {
  const { source } = await loadBikeMarketServer();
  assert.match(source, /i < WEBAPP_BIKE_MARKET_MAX_FETCH_URLS_PER_MODEL/);
  assert.match(source, /WEBAPP_BIKE_MARKET_TARGET_LISTINGS_PER_MODEL/);
  assert.match(source, /var maxDetailFetches = WEBAPP_BIKE_MARKET_MAX_DETAIL_FETCHES_PER_PAGE/);
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
