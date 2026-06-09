import assert from 'node:assert/strict';

const BIKE_MARKET_MIN_VALID_PRICE = 50000;
const BIKE_MARKET_MAX_VALID_PRICE = 5000000;
const BIKE_MODEL_ALIASES = {
  ninjazx4rse: ['ninjazx4rse', 'ninja zx-4r se', 'ninja zx4r se', 'ニンジャzx4rse', 'ニンジャzx-4r se', 'ｎｉｎｊａ ｚｘ−４ｒ ｓｅ', 'zx400p'],
  bmws1000r: ['bmws1000r', 'bmw s1000r', 's1000r', 's 1000 r', 'bmw s 1000 r'],
  dragstar250: ['ドラッグスター250', 'ドラッグスター 250', 'dragstar250', 'drag star 250', 'xvs250'],
  skywave250: ['スカイウェイブ250', 'スカイウェイブ250ss', 'スカイウェイブ 250', 'skywave250', 'sky wave 250', 'cj46a', 'cj45a', 'cj44a'],
  adv160: ['adv160', 'adv 160', 'ホンダadv160', 'honda adv160'],
  zephyr400: ['ゼファー400', 'ゼファー 400', 'ZEPHYR400', 'ZEPHYR 400', 'zephyr400', 'zephyr 400', 'カワサキ ゼファー400', 'KAWASAKI ZEPHYR400'],
  zephyrx: ['ゼファーχ', 'ゼファーx', 'ZEPHYRχ', 'ZEPHYR X', 'zephyrx', 'zephyrχ', 'zephyr400χ', 'ZEPHYR400χ', 'ゼファー400χ'],
  yzfr1: ['yzfr1', 'yzf-r1', 'yzf r1', 'yamaha yzf-r1', 'ヤマハ yzf-r1'],
  zzr1400: ['zzr1400', 'zzr 1400', 'zx-14r', 'zx14r', 'zxr1400'],
  cb400t: ['cb400t', 'cb 400 t', 'ホークii', 'ホーク2', 'hawk ii', 'hawk2'],
  magna50: ['マグナ50', 'magna50', 'magna fifty', 'honda magna fifty', 'ac13'],
  hornet250: ['ホーネット250', 'hornet250', 'hornet 250', 'ホンダ ホーネット250', 'mc31'],
  gsx1300rhayabusa: ['gsx1300rハヤブサ', 'gsx1300隼', 'gsx1300r 隼', 'gsx1300r hayabusa', 'hayabusa', 'ハヤブサ', '隼'],
  eliminator400: ['エリミネーター400', 'エリミネーター400cc', 'eliminator400', 'eliminator 400', 'Eliminator 400'],
  cbr400r: ['cbr400r', 'CBR400R', 'cbr 400 r', 'honda cbr400r'],
  flhxs: ['flhxs', 'FLHXS', 'street glide special', 'Street Glide Special', 'ストリートグライドスペシャル']
};
const BIKE_MODEL_EXCLUDES = {
  ninjazx4rse: ['zx4rr', '4rr'],
  zephyr400: ['zephyr750', 'ゼファー750', 'zephyr1100', 'ゼファー1100', 'ゼファーχ', 'zephyrχ', 'zephyrx', 'ゼファーx', 'zephyr400χ', 'ゼファー400χ'],
  yzfr1: ['yzf-r15', 'yzf-r125', 'yzf-r25', 'yzf-r3']
};
const BIKE_MODEL_PRICE_RULES = {
  cb400t: { min: 300000, max: 4000000 },
  magna50: { min: 50000, max: 800000 }
};

function toHalfWidthText(value) {
  return String(value || '').trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９．]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
}

function buildGoobikeCardPlainText(html) {
  return toHalfWidthText(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGoobikePriceScanText(value) {
  return toHalfWidthText(String(value || ''))
    .replace(/,/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    .replace(/(\d)\s*万円/g, '$1万円')
    .trim();
}

function parseFirstJapanesePriceToYen(value) {
  const text = normalizeGoobikePriceScanText(value);
  const manMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (manMatch) {
    return Math.round(Number(manMatch[1]) * 10000);
  }
  const yenMatch = text.match(/([0-9]{5,})\s*円/);
  if (yenMatch) {
    return Number(yenMatch[1]);
  }
  return null;
}

function extractPriceNearLabel(text, labels, maxDistance, options = {}) {
  const source = normalizeGoobikePriceScanText(String(text || ''));
  for (const label of labels) {
    let searchFrom = 0;
    while (searchFrom < source.length) {
      const pos = source.indexOf(label, searchFrom);
      if (pos < 0) break;
      if (options.excludeWarrantyContext) {
        const before = source.slice(Math.max(0, pos - 80), pos);
        if (/保証|グーバイク|プラン/.test(before)) {
          searchFrom = pos + label.length;
          continue;
        }
      }
      const price = parseFirstJapanesePriceToYen(source.slice(pos, pos + maxDistance));
      if (price) return price;
      searchFrom = pos + label.length;
    }
  }
  return null;
}

function isBikeMarketPriceInValidRange(price) {
  const number = Number(price || 0);
  return Number.isFinite(number) && number >= BIKE_MARKET_MIN_VALID_PRICE && number <= BIKE_MARKET_MAX_VALID_PRICE;
}

function isBikeMarketPriceInValidRangeForModel(price, bikeName) {
  const entry = getDictionaryEntry(bikeName);
  const rule = entry && BIKE_MODEL_PRICE_RULES[entry.canonicalKey];
  const min = rule?.min || BIKE_MARKET_MIN_VALID_PRICE;
  const max = rule?.max || BIKE_MARKET_MAX_VALID_PRICE;
  const number = Number(price || 0);
  return Number.isFinite(number) && number >= min && number <= max;
}

function extractGoobikeListingPrices(block) {
  const rawHtml = String(block || '');
  const plainText = buildGoobikeCardPlainText(rawHtml);
  const prices = {
    basePriceYen: null,
    totalPriceYen: null,
    vehiclePriceYen: null,
    warrantyTotalPriceYen: null,
    selectedPriceYen: null,
    selectedPriceReason: '',
    priceMissingReason: ''
  };
  const warrantyLabels = ['グーバイク保証付き支払総額', 'グーバイク保証付きプラン支払総額', 'グーバイク保証付きプラン', 'グーバイク保証', '保証付きプラン', 'バイク保証付きプラン', '保証付き支払総額', '保証付きプラン支払総額', '保証付プラン支払総額'];
  const totalLabels = ['支払総額(税込)', '支払総額（税込）', '支払い総額', '支払総額', '総額', '乗り出し価格', '乗出し価格', '乗出価格'];
  const vehicleLabels = ['車両価格(税込)', '車両価格（税込）', '車両本体価格', '車輌価格', '車両価格', '本体価格'];
  prices.warrantyTotalPriceYen = extractPriceNearLabel(rawHtml, warrantyLabels, 8000) || extractPriceNearLabel(plainText, warrantyLabels, 8000);
  prices.totalPriceYen = extractPriceNearLabel(rawHtml, totalLabels, 8000, { excludeWarrantyContext: true })
    || extractPriceNearLabel(plainText, totalLabels, 8000, { excludeWarrantyContext: true });
  prices.basePriceYen = extractPriceNearLabel(rawHtml, vehicleLabels, 8000)
    || extractPriceNearLabel(plainText, vehicleLabels, 8000);
  prices.vehiclePriceYen = prices.basePriceYen;
  const totalValid = isBikeMarketPriceInValidRange(prices.totalPriceYen);
  const baseValid = isBikeMarketPriceInValidRange(prices.basePriceYen);
  prices.selectedPriceYen = totalValid ? prices.totalPriceYen : (baseValid ? prices.basePriceYen : null);
  prices.selectedPriceReason = totalValid ? '支払総額' : (baseValid ? '車両価格' : '');
  prices.priceMissingReason = prices.selectedPriceYen ? '' : 'PRICE_OUT_OF_RANGE';
  return prices;
}

function normalizeSpecialBikeModelKey(value) {
  return getDictionaryEntry(value)?.canonicalKey || '';
}

function normalizeBikeName(value) {
  return String(value || '')
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ニンジャ/g, 'ninja')
    .replace(/カワサキ/g, 'kawasaki')
    .replace(/[χΧ]/g, 'x')
    .replace(/[−ー－‐‑‒–—―ｰ-]/g, '-')
    .replace(/^(honda|yamaha|suzuki|kawasaki|bmw|ducati|triumph|harley|harleydavidson|ktm|aprilia|vespa|indian|mvagusta|husqvarna|ホンダ|ヤマハ|スズキ|カワサキ)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[・･\-_/]/g, '')
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龥]/g, '');
}

function isModelMatch(input, title) {
  const inputNorm = normalizeBikeName(input);
  const titleNorm = normalizeBikeName(title);
  const entry = getDictionaryEntry(input);
  if (entry) {
    for (const exclude of entry.excludes) {
      const excludeNorm = normalizeBikeName(exclude);
      if (excludeNorm && titleNorm.includes(excludeNorm)) return false;
    }
    return entry.aliases.some((alias) => {
      const aliasNorm = normalizeBikeName(alias);
      return aliasNorm && titleNorm.includes(aliasNorm);
    });
  }
  return inputNorm === titleNorm || inputNorm.includes(titleNorm) || titleNorm.includes(inputNorm);
}

function isYearMatch(years, inputYear) {
  if (normalizeYearInput(inputYear).unspecified) return true;
  return years.some((year) => Number(year) === Number(inputYear));
}

function getDictionaryEntry(value) {
  const key = normalizeBikeName(value);
  let best = null;
  let bestScore = 0;
  for (const [canonicalKey, aliases] of Object.entries(BIKE_MODEL_ALIASES)) {
    const keys = [canonicalKey, ...aliases].map(normalizeBikeName);
    for (const aliasKey of keys) {
      let score = 0;
      if (key === aliasKey) score = 1000 + aliasKey.length;
      else if (key.includes(aliasKey)) score = 700 + aliasKey.length;
      else if (aliasKey.includes(key) && key.length >= 5) score = 500 + key.length - (aliasKey.length - key.length);
      if (score > bestScore) {
        bestScore = score;
        best = { canonicalKey, aliases, excludes: BIKE_MODEL_EXCLUDES[canonicalKey] || [] };
      }
    }
  }
  return best;
}

function splitMultipleBikeModelInput(value) {
  const raw = String(value || '').trim().replace(/など$/g, '').replace(/等$/g, '').trim();
  if (!raw) return [];
  const explicitSeparator = /(?:または|\bor\b|\/|、|,|・)/i.test(raw);
  if (!explicitSeparator && getDictionaryEntry(raw)) return [raw];
  const normalized = raw
    .replace(/(?:または|\bor\b)/ig, '|')
    .replace(/[\/、,・]/g, '|')
    .replace(/\s+/g, (match) => explicitSeparator ? match : '|');
  const parts = normalized.split('|').map((part) => part.trim().replace(/など$/g, '').replace(/等$/g, '')).filter(Boolean);
  if (!explicitSeparator && parts.length <= 3) {
    const joined = parts.join(' ');
    if (getDictionaryEntry(joined) || /^[^\d]+[\s　]+\d+(?:cc)?(?:[\s　]+プロ)?$/i.test(joined)) return [raw];
  }
  return [...new Map(parts.map((part) => [normalizeBikeName(part), part])).values()];
}

function normalizeYearInput(value) {
  const text = String(value || '').trim().replace(/\s+/g, '');
  const unspecified = ['', '特になし', 'なし', '未指定', '不明', '年式なし', '年式未指定', 'なるべく新しめ', '新しめ', '高年式', '最近の年式'].includes(text);
  return { unspecified };
}

function getBikeMarketPriceRangeWarning(sortedPrices, referencePrice) {
  const minPrice = sortedPrices[0];
  const maxPrice = sortedPrices.at(-1);
  if (!minPrice || !maxPrice) return '';
  if (maxPrice / minPrice >= 3) return '価格幅が大きいため要確認';
  if (referencePrice && referencePrice >= minPrice * 2) return '価格幅が大きいため要確認';
  if (sortedPrices.length >= 10 && referencePrice && minPrice <= referencePrice * 0.5) return '極端な安値があるため要確認';
  return '';
}

const fragment = `
<div>
  <span>車両価格</span>
  <strong>95. 8 万円</strong>
  <span>支払総額</span>
  <strong>104. 36 万円</strong>
  <span>グーバイク保証付き支払総額</span>
  <strong>108. 18 万円</strong>
</div>`;

const prices = extractGoobikeListingPrices(fragment);
assert.equal(parseFirstJapanesePriceToYen('95.8万円'), 958000);
assert.equal(parseFirstJapanesePriceToYen('95. 8 万円'), 958000);
assert.equal(parseFirstJapanesePriceToYen('104.36万円'), 1043600);
assert.equal(parseFirstJapanesePriceToYen('104. 36 万円'), 1043600);
assert.equal(parseFirstJapanesePriceToYen('108.18万円'), 1081800);
assert.equal(parseFirstJapanesePriceToYen('108. 18 万円'), 1081800);
assert.equal(parseFirstJapanesePriceToYen('109万円'), 1090000);
assert.equal(parseFirstJapanesePriceToYen('120万円'), 1200000);
assert.equal(parseFirstJapanesePriceToYen('1,150,000円'), 1150000);
assert.equal(prices.vehiclePriceYen, 958000);
assert.equal(prices.totalPriceYen, 1043600);
assert.equal(prices.warrantyTotalPriceYen, 1081800);
assert.equal(prices.selectedPriceYen, 1043600);
assert.equal(prices.selectedPriceReason, '支払総額');
assert.equal(prices.priceMissingReason, '');

const firstBike = extractGoobikeListingPrices(`
<div>
  <a href="/spread/8500000B30250605001/">Ninja ZX−4R SE エンジンスライダー</a>
  <span>車両価格</span><strong>113.8万円</strong>
  <span>支払総額</span><strong>124.1万円</strong>
  <span>グーバイク保証付き支払総額</span><strong>127.92万円</strong>
</div>`);
assert.equal(firstBike.vehiclePriceYen, 1138000);
assert.equal(firstBike.totalPriceYen, 1241000);
assert.equal(firstBike.warrantyTotalPriceYen, 1279200);
assert.equal(firstBike.selectedPriceYen, 1241000);
assert.equal(firstBike.selectedPriceReason, '支払総額');

const outOfRange = extractGoobikeListingPrices('<div><span>支払総額</span><strong>10,000円</strong></div>');
assert.equal(outOfRange.totalPriceYen, 10000);
assert.equal(outOfRange.selectedPriceYen, null);
assert.equal(outOfRange.priceMissingReason, 'PRICE_OUT_OF_RANGE');
assert.equal(isBikeMarketPriceInValidRangeForModel(10000, 'CB400T'), false);
assert.equal(isBikeMarketPriceInValidRangeForModel(280000, 'CB400T'), false);
assert.equal(isBikeMarketPriceInValidRangeForModel(376100, 'CB400T'), true);
assert.equal(normalizeBikeName('カワサキ Ｎｉｎｊａ ＺＸ−４Ｒ ＳＥ'), 'ninjazx4rse');
assert.equal(normalizeBikeName('カワサキ ニンジャＺＸ−４Ｒ ＳＥ'), 'ninjazx4rse');
assert.equal(normalizeBikeName('Ninja ZX−4R SE'), 'ninjazx4rse');
assert.equal(normalizeBikeName('Ninja ZX-4R SE'), 'ninjazx4rse');
assert.equal(normalizeSpecialBikeModelKey('Ninja ZX-4R SE'), 'ninjazx4rse');
assert.equal(normalizeSpecialBikeModelKey('NinjaZX4RSE'), 'ninjazx4rse');
assert.equal(normalizeSpecialBikeModelKey('Ｎｉｎｊａ ＺＸ−４Ｒ ＳＥ'), 'ninjazx4rse');
assert.notEqual(normalizeBikeName('Ninja ZX-4RR'), normalizeBikeName('Ninja ZX-4R SE'));
assert.equal(isModelMatch('NinjaZX-4R SE', 'カワサキ Ｎｉｎｊａ ＺＸ−４Ｒ ＳＥ ＺＸ４００Ｐ'), true);
assert.equal(isModelMatch('NinjaZX-4R SE', 'カワサキ ニンジャＺＸ−４Ｒ ＳＥ'), true);
assert.equal(isModelMatch('NinjaZX-4R SE', 'カワサキ ニンジャＺＸ−４ＲＲ'), false);
assert.equal(isModelMatch('スカイウェイブ250SS', 'スズキ スカイウェイブ250 タイプS CJ46A'), true);
assert.equal(isModelMatch('YAMAHA YZFR1', 'ヤマハ YZF-R1 2020年モデル'), true);
assert.equal(isModelMatch('YAMAHA YZFR1', 'ヤマハ YZF-R25 ABS'), false);
assert.equal(normalizeSpecialBikeModelKey('zxr1400'), 'zzr1400');
assert.equal(normalizeSpecialBikeModelKey('gsx1300隼'), 'gsx1300rhayabusa');
assert.equal(normalizeSpecialBikeModelKey('エリミネーター400cc'), 'eliminator400');
assert.equal(normalizeSpecialBikeModelKey('FLHXS'), 'flhxs');
assert.equal(normalizeSpecialBikeModelKey('CBR400R'), 'cbr400r');
assert.equal(isModelMatch('ホーネット250', 'ホンダ HORNET250 MC31'), true);
assert.equal(isModelMatch('マグナ50', 'MAGNA FIFTY AC13'), true);
assert.equal(normalizeSpecialBikeModelKey('ゼファー400'), 'zephyr400');
assert.equal(normalizeSpecialBikeModelKey('ZEPHYR400'), 'zephyr400');
assert.equal(normalizeSpecialBikeModelKey('ゼファーX'), 'zephyrx');
assert.equal(isModelMatch('ゼファー400', 'カワサキ ZEPHYR400'), true);
assert.equal(isModelMatch('ゼファー400', 'カワサキ ゼファー400χ'), false);
assert.deepEqual(splitMultipleBikeModelInput('Nmax125 PCX125 CUB110 など'), ['Nmax125', 'PCX125', 'CUB110']);
assert.deepEqual(splitMultipleBikeModelInput('マグナ50 または エイプ50'), ['マグナ50', 'エイプ50']);
assert.deepEqual(splitMultipleBikeModelInput('ゼファー 400'), ['ゼファー 400']);
assert.equal(isYearMatch([2026, 2025], 2025), true);
assert.equal(isYearMatch([2025], 2025), true);
assert.equal(isYearMatch([2018], '特になし'), true);
assert.equal(isYearMatch([2018], 'なるべく新しめ'), true);
assert.equal(getBikeMarketPriceRangeWarning([376100, 1180000, 4034700], 1180000), '価格幅が大きいため要確認');

console.log(JSON.stringify(prices, null, 2));
