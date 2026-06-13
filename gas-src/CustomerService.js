// ============================================================
// 顧客対応管理用サービス
// A〜ARの申込データ、AS〜AZの数式列は壊さず、BA以降の管理列だけ更新します
// ============================================================

var WEBAPP_MANAGEMENT_COLUMNS = [
  '申込種別',
  '対応状況',
  '担当者',
  'プレミアファイナンス審査結果',
  'アスト審査結果',
  '対応メモ',
  '最終更新日時',
  '最終更新者'
];

var WEBAPP_LEGACY_MANAGEMENT_COLUMNS = {
  '対応状況': '対応ステータス',
  'プレミアファイナンス審査結果': '1社目の審査結果',
  'アスト審査結果': '2社目の審査結果'
};
var WEBAPP_CALL_HISTORY_SHEET_NAME = '架電履歴';
var WEBAPP_CALL_HISTORY_COLUMNS = [
  '記録日時',
  '顧客キー',
  '申込行',
  'お名前',
  '架電日時',
  '架電回数',
  '結果',
  '対応した従業員名',
  '話した内容のメモ',
  '記録者'
];

var WEBAPP_APPLICATION_TYPE_OPTIONS = ['仮審査申込', 'お問い合わせ'];
var WEBAPP_ASSIGNEE_OPTIONS = ['高山', '中武', '嶋本', '直接入力'];
var WEBAPP_STATUS_OPTIONS = [
  '新規受付',
  '架電中（不在・再架電待ち）',
  '電話がつながりプレミア審査前',
  '相談のみで終了',
  '対応不可',
  'プレミア審査中',
  'プレミア否決',
  'プレミア可決',
  'プレミア送金手続き完了',
  'アスト審査中',
  'アスト否決',
  'アスト可決',
  'オークション選定中',
  'アスト契約待ち',
  '納車準備中',
  '納車完了'
];
var WEBAPP_REVIEW_OPTIONS = ['未依頼', '審査中', '審査中（要保証人）', '可決', '否決'];
var WEBAPP_CALL_RESULT_OPTIONS = ['出た', '不在', '留守電', '折返し待ち', 'その他'];
var WEBAPP_LOAN_INPUT_COLUMNS = [
  '審査申込金額',
  '支払い回数',
  'お客様提示金利(%)',
  '実際の金利(%)'
];
var WEBAPP_CUSTOMER_RATE_OPTIONS = ['13.9', '9.8', '7.9', '5.9', '3.9'];
var WEBAPP_LOAN_FORMULA_COLUMNS = [
  '1回目支払額',
  '2回目〜毎月',
  '総支払額',
  '実コスト総額',
  'キックバック差額'
];

function getMarketAdminPasscodeFromAuth_(auth) {
  if (typeof auth === 'string') {
    return auth;
  }
  return String(auth && (auth.marketAdminPasscode || auth.passcode) || '');
}

function assertMarketAdminPasscode_(auth) {
  if (typeof isMarketAdminPasscodeValid_ !== 'function') {
    throw new Error('相場管理の認証設定を読み込めません。');
  }
  if (!isMarketAdminPasscodeValid_(getMarketAdminPasscodeFromAuth_(auth))) {
    throw new Error('相場管理の認証が必要です。');
  }
}

var WEBAPP_BIKE_MARKET_COLUMNS = [
  '相場_最低総額',
  '相場_最高総額',
  '相場_平均総額',
  '相場_単純平均総額',
  '相場_中央値総額',
  '相場_外れ値除外平均総額',
  '相場_参考相場総額',
  '相場_掲載台数',
  '相場_価格取得可能台数',
  '相場_抽出候補件数',
  '相場_年式一致件数',
  '相場_集計対象件数',
  '相場_本体価格代用件数',
  '相場_外れ値除外件数',
  '相場_外れ値除外価格',
  '相場_計算方法',
  '相場_ステータス',
  '相場_エラーコード',
  '相場_取得元',
  '相場_取得日時',
  '相場_エラー',
  '相場_検索車種',
  '相場_検索年式',
  '相場_生データ',
  '相場_最終依頼日時'
];
var WEBAPP_BIKE_MARKET_FIELD_COLUMNS = {
  market_min_price: '相場_最低総額',
  market_max_price: '相場_最高総額',
  market_average_price: '相場_平均総額',
  market_simple_average_price: '相場_単純平均総額',
  market_median_price: '相場_中央値総額',
  market_trimmed_average_price: '相場_外れ値除外平均総額',
  market_reference_price: '相場_参考相場総額',
  market_listing_count: '相場_掲載台数',
  market_price_available_count: '相場_価格取得可能台数',
  market_extracted_count: '相場_抽出候補件数',
  market_year_matched_count: '相場_年式一致件数',
  market_calculation_target_count: '相場_集計対象件数',
  market_used_base_price_fallback_count: '相場_本体価格代用件数',
  market_outlier_excluded_count: '相場_外れ値除外件数',
  market_outlier_excluded_prices: '相場_外れ値除外価格',
  market_calculation_method: '相場_計算方法',
  market_status: '相場_ステータス',
  market_error_code: '相場_エラーコード',
  market_source: '相場_取得元',
  market_fetched_at: '相場_取得日時',
  market_error: '相場_エラー',
  market_search_bike_name: '相場_検索車種',
  market_search_year: '相場_検索年式',
  market_raw_json: '相場_生データ',
  market_requested_at: '相場_最終依頼日時'
};
var WEBAPP_BIKE_MARKET_SHEET_NAME = 'バイク相場CSV';
var WEBAPP_BIKE_MARKET_CACHE_SHEET_NAME = 'バイク相場キャッシュ';
var WEBAPP_BIKE_MARKET_CSV_COLUMNS = [
  'source',
  'bike_name',
  'year',
  'total_price_yen',
  'base_price_yen',
  'mileage_km',
  'shop_name',
  'prefecture',
  'url'
];
var WEBAPP_BIKE_MARKET_CACHE_COLUMNS = [
  'normalized_key',
  'bike_name',
  'year_input',
  'summary_json',
  'fetched_at',
  'expires_at'
];
var WEBAPP_BIKE_MARKET_LOG_SHEET_NAME = '相場取得ログ';
var WEBAPP_BIKE_MARKET_LOG_COLUMNS = [
  'timestamp',
  'customer_id',
  'customer_name',
  'bike_name',
  'year',
  'normalized_bike_name',
  'normalized_year',
  'source',
  'status',
  'error_code',
  'error_message',
  'search_url',
  'http_status',
  'content_length',
  'parsed_count',
  'matched_count',
  'price_count',
  'min_price',
  'max_price',
  'avg_price',
  'stack'
];
var WEBAPP_BIKE_MARKET_AUTO_LOG_SHEET_NAME = '相場自動取得ログ';
var WEBAPP_BIKE_MARKET_AUTO_LOG_COLUMNS = [
  'timestamp',
  'customer_id',
  'customer_name',
  'bike_name',
  'year',
  'trigger_type',
  'status',
  'market_status',
  'reference_price',
  'price_available_count',
  'error_code',
  'error_message'
];
var WEBAPP_AUTO_FETCH_MARKET_PROPERTY_KEY = 'AUTO_FETCH_MARKET_ON_NEW_APPLICATION';
var WEBAPP_AUTO_FETCH_MARKET_TIMEOUT_MS = 30000;
var WEBAPP_PENDING_MARKET_LOOKUP_MAX_PER_RUN = 3;
var WEBAPP_PENDING_MARKET_LOOKUP_SAFE_RUNTIME_MS = 280000;
var WEBAPP_BIKE_MARKET_CACHE_VERSION = 'v20-goobike-model-master';
var WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL = 'https://goobike.com';
var WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL = 'https://www.goobike.com';
var WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE = 'GooBike';
var WEBAPP_BIKE_MARKET_MIN_HTML_LENGTH = 5000;
var BIKE_MARKET_MIN_VALID_PRICE = 50000;
var BIKE_MARKET_MAX_VALID_PRICE = 5000000;
var WEBAPP_BIKE_MODEL_DICTIONARY_SHEET_NAME = '車種名辞書';
var WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS = [
  '代表車種名',
  '同義語',
  '除外語',
  '優先検索ワード',
  '更新日時'
];
var WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = null;
var WEBAPP_GOOBIKE_MODEL_MASTER_SHEET_NAME = 'GooBike車種マスタ';
var WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS = [
  'maker',
  'official_model_name',
  'normalized_model_name',
  'listing_count',
  'source_url',
  'updated_at'
];
var WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = null;
var WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MIN_SCORE = 80;
var WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MAX = 3;
var GOOBIKE_MODEL_MASTER_MAKER_PAGES = [
  { maker: 'ホンダ', slug: 'honda', url: 'https://www.goobike.com/maker-honda/list/index.html' },
  { maker: 'ヤマハ', slug: 'yamaha', url: 'https://www.goobike.com/maker-yamaha/list/index.html' },
  { maker: 'スズキ', slug: 'suzuki', url: 'https://www.goobike.com/maker-suzuki/list/index.html' },
  { maker: 'カワサキ', slug: 'kawasaki', url: 'https://www.goobike.com/maker-kawasaki/list/index.html' },
  { maker: 'BMW', slug: 'bmw', url: 'https://www.goobike.com/maker-bmw/list/index.html' },
  { maker: 'HARLEY-DAVIDSON', slug: 'harley_davidson', url: 'https://www.goobike.com/maker-harley_davidson/list/index.html' },
  { maker: 'DUCATI', slug: 'ducati', url: 'https://www.goobike.com/maker-ducati/list/index.html' },
  { maker: 'KTM', slug: 'ktm', url: 'https://www.goobike.com/maker-ktm/list/index.html' },
  { maker: 'TRIUMPH', slug: 'triumph', url: 'https://www.goobike.com/maker-triumph/list/index.html' }
];
var GOOBIKE_MODEL_MASTER_SEEDS = [
  { maker: 'ホンダ', officialModelName: 'ＡＤＶ１６０', sourceUrl: 'https://www.goobike.com/maker-honda/car-adv160/index.html' },
  { maker: 'ホンダ', officialModelName: 'ＭＡＧＮＡ　ＦＩＦＴＹ', sourceUrl: 'https://www.goobike.com/maker-honda/car-magna_fifty/index.html' },
  { maker: 'ホンダ', officialModelName: 'ＣＢＲ４００Ｒ', sourceUrl: 'https://www.goobike.com/maker-honda/car-cbr400r/index.html' },
  { maker: 'ホンダ', officialModelName: 'スーパーカブ１１０プロ', sourceUrl: 'https://www.goobike.com/maker-honda/car-super_cub_110_pro/index.html' },
  { maker: 'ホンダ', officialModelName: 'ＨＯＲＮＥＴ２５０', sourceUrl: 'https://www.goobike.com/maker-honda/car-hornet250/index.html' },
  { maker: 'スズキ', officialModelName: 'スカイウェイブ２５０　ＳＳ', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-sky_wave_250_ss/index.html' },
  { maker: 'スズキ', officialModelName: 'スカイウェイブ２５０', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-sky_wave_250/index.html' },
  { maker: 'スズキ', officialModelName: 'ハヤブサ（ＧＳＸ１３００Ｒ　Ｈａｙａｂｕｓａ）', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-gsx1300r_hayabusa/index.html' },
  { maker: 'スズキ', officialModelName: 'ＧＳＲ２５０', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-gsr250/index.html' },
  { maker: 'スズキ', officialModelName: 'Ｂａｎｄｉｔ２５０', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-bandit250/index.html' },
  { maker: 'スズキ', officialModelName: 'Ｂａｎｄｉｔ２５０Ｖ', sourceUrl: 'https://www.goobike.com/maker-suzuki/car-bandit250v/index.html' },
  { maker: 'カワサキ', officialModelName: 'ＺＥＰＨＹＲ４００', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-zephyr400/index.html' },
  { maker: 'カワサキ', officialModelName: 'ＺＥＰＨＹＲ７５０', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-zephyr750/index.html' },
  { maker: 'カワサキ', officialModelName: 'ＺＥＰＨＹＲ１１００', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-zephyr1100/index.html' },
  { maker: 'カワサキ', officialModelName: 'ＺＥＰＨＹＲχ', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-zephyrx/index.html' },
  { maker: 'カワサキ', officialModelName: 'Ｎｉｎｊａ　４００', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-ninja400/index.html' },
  { maker: 'カワサキ', officialModelName: 'Ｎｉｎｊａ　４００Ｒ', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-ninja400r/index.html' },
  { maker: 'カワサキ', officialModelName: 'Ｎｉｎｊａ　ＺＸ－４Ｒ　ＳＥ', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-ninja_zx-4r_se/index.html' },
  { maker: 'カワサキ', officialModelName: 'エリミネーター２５０Ｖ', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-eliminator250v/index.html' },
  { maker: 'カワサキ', officialModelName: 'エリミネーター２５０', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-eliminator250/index.html' },
  { maker: 'カワサキ', officialModelName: 'エリミネーター４００', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-eliminator400/index.html' },
  { maker: 'カワサキ', officialModelName: 'ＺＺＲ１４００', sourceUrl: 'https://www.goobike.com/maker-kawasaki/car-zzr1400/index.html' },
  { maker: 'ヤマハ', officialModelName: 'ドラッグスター２５０', sourceUrl: 'https://www.goobike.com/maker-yamaha/car-dragstar250/index.html' },
  { maker: 'ヤマハ', officialModelName: 'シグナスＸ', sourceUrl: 'https://www.goobike.com/maker-yamaha/car-cygnus_x/index.html' },
  { maker: 'ヤマハ', officialModelName: 'ＹＺＦ－Ｒ１', sourceUrl: 'https://www.goobike.com/maker-yamaha/car-yzf-r1/index.html' },
  { maker: 'BMW', officialModelName: 'Ｓ１０００Ｒ', sourceUrl: 'https://www.goobike.com/maker-bmw/car-s1000r/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＬＨＸＳ　ストリートグライドスペシャル', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-flhxs_streetglidespecial/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＬＨＴＣＵ　エレクトラグライドウルトラクラシック', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-flhtcu_electra_glide_ultra_classic/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＬＨＴＫ　ウルトラリミテッド', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-flhtk_ultra_limited/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＬＨＴ　エレクトラグライド', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-flht_electra_glide/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＬＴＲＸＳ　ロードグライドスペシャル', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-fltrxs_road_glide_special/index.html' },
  { maker: 'HARLEY-DAVIDSON', officialModelName: 'ＦＸＬＲＳ　ローライダーＳ', sourceUrl: 'https://www.goobike.com/maker-harley_davidson/car-fxlrs_low_rider_s/index.html' }
];
var BIKE_MODEL_ALIASES = {
  ninjazx4rse: ['ninjazx4rse', 'ninja zx-4r se', 'ninja zx4r se', 'ニンジャzx4rse', 'ニンジャzx-4r se', 'ｎｉｎｊａ ｚｘ−４ｒ ｓｅ', 'zx400p'],
  bmws1000r: ['bmws1000r', 'bmw s1000r', 's1000r', 's 1000 r', 'bmw s 1000 r'],
  dragstar250: ['ドラッグスター250', 'ドラッグスター 250', 'ドラッグスター250cc', 'dragstar250', 'drag star 250', 'DragStar250', 'DRAGSTAR250', 'xvs250', 'XVS250'],
  skywave250: ['スカイウェイブ250', 'スカイウェイブ 250', 'スカイウェイブ250ss', 'スカイウェイブ250 SS', 'skywave250', 'sky wave 250', 'SKYWAVE250', 'Skywave 250', 'cj46a', 'cj45a', 'cj44a', 'CJ46A', 'CJ45A', 'CJ44A'],
  cygnus: ['シグナス', 'シグナスx', 'cygnus', 'cygnus x'],
  adv160: ['adv160', 'adv 160', 'ADV160', 'ADV 160', 'ホンダadv160', 'ホンダ ADV160', 'honda adv160', 'HONDA ADV160', 'ADV１６０', 'ＡＤＶ１６０'],
  zephyr400: ['ゼファー400', 'ゼファー 400', 'ZEPHYR400', 'ZEPHYR 400', 'zephyr400', 'zephyr 400', 'カワサキ ゼファー400', 'KAWASAKI ZEPHYR400'],
  zephyr1100: ['ゼファー1100', 'ゼファー 1100', 'ZEPHYR1100', 'ZEPHYR 1100', 'zephyr1100', 'zephyr 1100', 'カワサキ ゼファー1100', 'KAWASAKI ZEPHYR1100'],
  zephyrx: ['ゼファーχ', 'ゼファーx', 'ZEPHYRχ', 'ZEPHYR X', 'zephyrx', 'zephyrχ', 'zephyr400χ', 'ZEPHYR400χ', 'ゼファー400χ'],
  ninja400: ['ninja400', 'ninja 400', 'Ninja400', 'Ninja 400', 'ニンジャ400', 'ニンジャ 400', 'カワサキ Ninja400'],
  eliminator250v: ['エリミネーター250v', 'エリミネーター250 V', 'eliminator250v', 'eliminator 250v', 'ELIMINATOR 250V'],
  eliminator400: ['エリミネーター400', 'エリミネーター400cc', 'eliminator400', 'eliminator 400', 'Eliminator 400'],
  gsr250: ['gsr250', 'gsr 250'],
  bandit250: ['bandit250', 'Bandit250', 'bandit 250', 'Bandit 250', 'バンディット250', 'バンディット 250', 'bandit250v', 'Bandit250V', 'バンディット250V'],
  yzfr1: ['yzfr1', 'yzf-r1', 'yzf r1', 'yamaha yzf-r1', 'ヤマハ yzf-r1'],
  zzr1400: ['zzr1400', 'zzr 1400', 'zx-14r', 'zx14r', 'zxr1400'],
  magna50: ['マグナ50', 'マグナ 50', 'magna50', 'MAGNA50', 'magna fifty', 'MAGNA FIFTY', 'マグナフィフティ', 'ホンダ マグナ50', 'HONDA MAGNA50', 'honda magna fifty', 'ac13'],
  supercub110pro: ['スーパーカブ110プロ', 'スーパーカブ 110 プロ', 'cub110pro', 'CUB110PRO', 'cub 110 pro', 'CUB 110 PRO', 'super cub 110 pro', 'SUPER CUB 110 PRO', 'supercub110pro', 'スーパーカブ110', 'C110', 'ja10', 'ja42', 'ja61'],
  hornet250: ['ホーネット250', 'ホーネット 250', 'hornet250', 'HORNET250', 'hornet 250', 'HORNET 250', 'ホンダ ホーネット250', 'HONDA HORNET250', 'mc31', 'MC31'],
  cb400t: ['cb400t', 'cb 400 t', 'ホークii', 'ホーク2', 'hawk ii', 'hawk2'],
  cb400r: ['cb400r', 'CB400R', 'cb 400 r', 'honda cb400r'],
  cbr400r: ['cbr400r', 'CBR400R', 'cbr 400 r', 'honda cbr400r'],
  gsx1300rhayabusa: ['gsx1300rハヤブサ', 'gsx1300隼', 'gsx1300r 隼', 'gsx1300r hayabusa', 'GSX1300R Hayabusa', 'hayabusa', 'Hayabusa', 'ハヤブサ', '隼'],
  flhxs: ['flhxs', 'FLHXS', 'street glide special', 'Street Glide Special', 'ストリートグライドスペシャル'],
  ultra_electra_glide: ['ウルトラエレクトラグライド', 'エレクトラグライドウルトラ', 'エレクトラグライドウルトラクラシック', 'FLHTCU', 'FLHTK', 'FLHT', 'Ultra Classic', 'Electra Glide Ultra Classic'],
  street_glide_special: ['FLHXS', 'ストリートグライドスペシャル', 'Street Glide Special'],
  road_glide_special: ['FLTRXS', 'ロードグライドスペシャル', 'Road Glide Special'],
  low_rider_s: ['FXLRS', 'ローライダーS', 'Low Rider S']
};
var BIKE_MODEL_EXCLUDES = {
  ninjazx4rse: ['zx4rr', '4rr'],
  dragstar250: ['ドラッグスター400', 'ドラッグスター1100', 'dragstar400', 'dragstar1100'],
  skywave250: ['スカイウェイブ400', 'スカイウェイブ650', 'skywave400', 'skywave650'],
  adv160: ['ADV150', 'ADV 150', 'X-ADV', 'XADV'],
  zephyr400: ['zephyr750', 'ゼファー750', 'zephyr1100', 'ゼファー1100', 'ゼファーχ', 'zephyrχ', 'zephyrx', 'ゼファーx', 'zephyr400χ', 'ゼファー400χ'],
  zephyrx: ['zephyr750', 'ゼファー750', 'zephyr1100', 'ゼファー1100'],
  magna50: ['Vツインマグナ', 'マグナ250', 'MAGNA250'],
  supercub110pro: ['クロスカブ', 'ハンターカブ', 'CT125', 'C125'],
  hornet250: ['ホーネット600', 'ホーネット900', 'HORNET600', 'HORNET900'],
  yzfr1: ['yzf-r15', 'yzf-r125', 'yzf-r25', 'yzf-r3'],
  gsr250: ['gsr400', 'gsr600', 'gsr750'],
  cb400r: ['cbr400r'],
  cbr400r: ['cbr400rr', 'cbr 400 rr']
};
var BIKE_MODEL_PRICE_RULES = {
  ninjazx4rse: { min: 800000, max: 2500000 },
  bmws1000r: { min: 800000, max: 3000000 },
  cb400t: { min: 300000, max: 4000000 },
  magna50: { min: 50000, max: 800000 }
};
var WEBAPP_BIKE_MARKET_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FETCH_FORBIDDEN: 'FETCH_FORBIDDEN',
  FETCH_NOT_FOUND: 'FETCH_NOT_FOUND',
  FETCH_TIMEOUT: 'FETCH_TIMEOUT',
  FETCH_EMPTY: 'FETCH_EMPTY',
  FETCH_BLOCKED: 'FETCH_BLOCKED',
  PARSE_NO_LISTINGS: 'PARSE_NO_LISTINGS',
  PARSE_NO_PRICE: 'PARSE_NO_PRICE',
  NO_YEAR_MATCH: 'NO_YEAR_MATCH',
  NO_MODEL_MATCH: 'NO_MODEL_MATCH',
  CACHE_STALE_FAILURE: 'CACHE_STALE_FAILURE',
  FIELD_MAPPING_ERROR: 'FIELD_MAPPING_ERROR',
  COUNT_CONSISTENCY_ERROR: 'COUNT_CONSISTENCY_ERROR',
  PRICE_CONSISTENCY_ERROR: 'PRICE_CONSISTENCY_ERROR',
  PRICE_AMBIGUOUS: 'PRICE_AMBIGUOUS',
  PRICE_RELATION_ERROR: 'PRICE_RELATION_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};
var WEBAPP_BIKE_MARKET_FILTER_OPTIONS = [
  '相場取得済み',
  '相場取得中',
  '相場未取得',
  '車種名確認',
  '該当なし',
  '取得エラー',
  '要再取得'
];
var WEBAPP_BIKE_MARKET_ERROR_NO_DATA = '相場データ未登録';
var WEBAPP_BIKE_MARKET_ERROR_NO_MATCH = '該当データなし';
var WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM = '車種名確認';
var WEBAPP_BIKE_MARKET_ERROR_SYSTEM = '相場取得エラー';
var WEBAPP_HIDDEN_APPLICATION_FIELDS = [];
var WEBAPP_IMPORTANT_APPLICATION_FIELDS = [
  '希望車種(希望車種)',
  '年式(希望車種)',
  'グレード(希望車種)',
  '色(希望車種)'
];
var WEBAPP_PHONE_FIELDS = [
  '電話番号',
  '勤務先電話番号',
  '電話番号(独り暮らしの場合)'
];
var WEBAPP_HOUSING_VALUES = [
  '身内所有',
  '自己所有',
  '賃貸マンション',
  '賃貸アパート',
  '社宅',
  '一戸建借家',
  '公営住宅',
  '家族所有',
  '親族所有'
];
var WEBAPP_DISPLAY_START_TIME = new Date(2026, 4, 1, 0, 0, 0).getTime();

function getDashboardData() {
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var managementMap = getManagementColumnMap_(headerMap);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var callHistoryMap = getCallHistoryMap_();

  if (lastRow <= 1) {
    return {
      customers: [],
      applicationTypeOptions: WEBAPP_APPLICATION_TYPE_OPTIONS,
      assigneeOptions: WEBAPP_ASSIGNEE_OPTIONS,
      statusOptions: WEBAPP_STATUS_OPTIONS,
      reviewOptions: WEBAPP_REVIEW_OPTIONS,
      customerRateOptions: WEBAPP_CUSTOMER_RATE_OPTIONS,
      callResultOptions: WEBAPP_CALL_RESULT_OPTIONS,
      marketFilterOptions: WEBAPP_BIKE_MARKET_FILTER_OPTIONS,
      needsSetup: hasMissingManagementColumns_(managementMap)
    };
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var customers = [];
  var displayedKeys = {};
  var hasBikeMarketCsv = hasBikeMarketCsvRows_();

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isEmptyDisplayRow_(row)) {
      continue;
    }

    var rowNumber = i + 2;
    var customer = buildCustomerSummary_(row, rowNumber, headerMap, managementMap, callHistoryMap, hasBikeMarketCsv);
    if (parseReceivedAtTime_(customer.receivedAt) < WEBAPP_DISPLAY_START_TIME) {
      continue;
    }
    var displayDuplicateKey = buildDisplayDuplicateKey_(customer);
    if (displayDuplicateKey !== '' && displayedKeys[displayDuplicateKey]) {
      continue;
    }
    displayedKeys[displayDuplicateKey] = true;
    customers.push(customer);
  }

  customers.sort(function(a, b) {
    var timeDiff = parseReceivedAtTime_(b.receivedAt) - parseReceivedAtTime_(a.receivedAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return b.rowNumber - a.rowNumber;
  });

  return {
    customers: customers,
    applicationTypeOptions: WEBAPP_APPLICATION_TYPE_OPTIONS,
    assigneeOptions: WEBAPP_ASSIGNEE_OPTIONS,
    statusOptions: WEBAPP_STATUS_OPTIONS,
    reviewOptions: WEBAPP_REVIEW_OPTIONS,
    customerRateOptions: WEBAPP_CUSTOMER_RATE_OPTIONS,
    callResultOptions: WEBAPP_CALL_RESULT_OPTIONS,
    marketFilterOptions: WEBAPP_BIKE_MARKET_FILTER_OPTIONS,
    needsSetup: hasMissingManagementColumns_(managementMap)
  };
}

function buildDisplayDuplicateKey_(customer) {
  var keyParts = [
    customer.applicationType || '仮審査申込',
    customer.receivedAt,
    customer.name,
    customer.phone,
    customer.email
  ];
  var normalized = keyParts.map(function(value) {
    return normalizeDuplicateValue(value);
  });
  var key = normalized.join('|');
  return key.replace(/\|/g, '') === '' ? '' : key;
}

function parseReceivedAtTime_(receivedAt) {
  var text = trimFullWidth(String(receivedAt || ''));
  var match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    return 0;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0
  ).getTime();
}

function setupManagementColumns() {
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  var addedColumns = [];

  for (var i = 0; i < WEBAPP_MANAGEMENT_COLUMNS.length; i++) {
    var columnName = WEBAPP_MANAGEMENT_COLUMNS[i];
    if (!headerMap[columnName]) {
      var nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(columnName);
      sheet.getRange(1, nextColumn).setFontWeight('bold');
      addedColumns.push(columnName);
      headerMap[columnName] = nextColumn;
    }
  }

  var historyResult = setupCallHistorySheet_();

  return {
    addedColumns: addedColumns,
    callHistorySheetCreated: historyResult.created,
    message: addedColumns.length === 0 && !historyResult.created
      ? '管理列はすでに作成済みです。'
      : addedColumns.length + '個の管理列を追加し、架電履歴シートを確認しました。'
  };
}

function updateCustomerManagement(payload) {
  if (!payload || !payload.rowKey) {
    throw new Error('更新対象が指定されていません。画面を再読み込みしてください。');
  }

  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  var managementMap = getManagementColumnMap_(headerMap);
  ensureLoanInputColumns_(sheet, headerMap);

  if (hasMissingManagementColumns_(managementMap)) {
    throw new Error('管理列が未作成です。先に「管理列を作成」を実行してください。');
  }

  var rowNumber = findCurrentRowNumber_(sheet, payload);
  if (!rowNumber) {
    throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
  }

  updateBlankApplicationFields_(sheet, rowNumber, headerMap, payload.applicationFields || {});

  var updates = {};
  updates['審査申込金額'] = normalizeNumberInput_(payload.applicationAmount);
  updates['支払い回数'] = normalizeNumberInput_(payload.paymentCount);
  updates['お客様提示金利(%)'] = normalizeCustomerRate_(payload.customerRate);
  updates['実際の金利(%)'] = normalizeNumberInput_(payload.actualRate);
  updates['申込種別'] = normalizeOption_(payload.applicationType, WEBAPP_APPLICATION_TYPE_OPTIONS, '仮審査申込');
  updates['対応状況'] = normalizeOption_(payload.status, WEBAPP_STATUS_OPTIONS, '新規受付');
  updates['担当者'] = trimFullWidth(String(payload.assignee || ''));
  updates['プレミアファイナンス審査結果'] = normalizeOption_(payload.review1, WEBAPP_REVIEW_OPTIONS, '未依頼');
  updates['アスト審査結果'] = normalizeOption_(payload.review2, WEBAPP_REVIEW_OPTIONS, '未依頼');
  updates['対応メモ'] = trimFullWidth(String(payload.memo || ''));
  updates['最終更新日時'] = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  updates['最終更新者'] = Session.getActiveUser().getEmail() || 'unknown';

  Object.keys(updates).forEach(function(columnName) {
    var columnNumber = managementMap[columnName] || headerMap[columnName];
    if (columnNumber) {
      sheet.getRange(rowNumber, columnNumber).setValue(updates[columnName]);
    }
  });

  setLoanCalculationFormulas_(sheet, rowNumber, headerMap);

  return {
    rowNumber: rowNumber,
    message: '更新しました。'
  };
}

function deleteCustomerApplication(payload) {
  if (!payload || !payload.rowKey) {
    throw new Error('削除対象が指定されていません。画面を再読み込みしてください。');
  }

  var sheet = getMainSheet_();
  var rowNumber = findCurrentRowNumber_(sheet, payload);
  if (!rowNumber) {
    throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
  }

  deleteCallHistoryByRowKey_(payload.rowKey);
  sheet.deleteRow(rowNumber);

  return {
    message: '顧客行を削除しました。'
  };
}

function backfillInquiryContentForCustomer(payload) {
  if (!payload || !payload.rowKey) {
    throw new Error('更新対象が指定されていません。画面を再読み込みしてください。');
  }

  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  var rowNumber = findCurrentRowNumber_(sheet, payload);
  if (!rowNumber) {
    throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
  }

  var lastColumn = sheet.getLastColumn();
  var row = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  var name = getCellByHeader_(row, headerMap, 'お名前');
  var phone = normalizeDisplayValue_('電話番号', getCellByHeader_(row, headerMap, '電話番号'));
  var email = getCellByHeader_(row, headerMap, 'メールアドレス');
  var inquiryContent = findInquiryContentForRow_(name, phone, email);

  if (inquiryContent === '') {
    throw new Error('Gmailからお問い合わせ内容を見つけられませんでした。メールアドレス・電話番号・氏名を確認してください。');
  }

  var inquiryContentColumn = ensureColumnByHeader_(sheet, 'お問い合わせ内容');
  var applicationTypeColumn = ensureColumnByHeader_(sheet, '申込種別');
  sheet.getRange(rowNumber, inquiryContentColumn).setValue(inquiryContent);
  sheet.getRange(rowNumber, applicationTypeColumn).setValue('お問い合わせ');

  return {
    rowNumber: rowNumber,
    message: 'お問い合わせ内容をGmailから取得して反映しました。'
  };
}

function addCallHistory(payload) {
  if (!payload || !payload.rowKey) {
    throw new Error('架電対象が指定されていません。画面を再読み込みしてください。');
  }

  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  var rowNumber = findCurrentRowNumber_(sheet, payload);
  if (!rowNumber) {
    throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var callSheet = getOrCreateCallHistorySheet_();
  var callMap = getCallHistoryMap_();
  var existingCalls = callMap[payload.rowKey] || [];
  var now = new Date();
  var callAt = trimFullWidth(String(payload.callAt || ''));
  var result = normalizeOption_(payload.callResult, WEBAPP_CALL_RESULT_OPTIONS, 'その他');
  var staffName = trimFullWidth(String(payload.staffName || ''));
  var memo = trimFullWidth(String(payload.callMemo || ''));
  var recorder = Session.getActiveUser().getEmail() || 'unknown';

  callSheet.appendRow([
    Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    payload.rowKey,
    rowNumber,
    getCellByHeader_(row, headerMap, 'お名前'),
    callAt || Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    existingCalls.length + 1,
    result,
    staffName,
    memo,
    recorder
  ]);

  updateLatestCallSummary_(sheet, rowNumber, payload, headerMap, result, staffName, callAt, memo, recorder);

  return {
    message: '架電履歴を追加しました。'
  };
}

function fixPhoneNumbersFromWeb() {
  return fixExistingPhoneNumbers();
}

function searchBikeMarketForCustomer(payload) {
  return runBikeMarketSearchForCustomer_(payload, {
    triggerType: 'manual_button',
    markProcessing: false
  });
}

function runBikeMarketSearchForCustomer_(payload, options) {
  options = options || {};
  var triggerType = options.triggerType || 'manual_button';
  if (!payload || !payload.rowKey) {
    throw new Error('相場取得対象が指定されていません。画面を再読み込みしてください。');
  }

  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var rowNumber = findCurrentRowNumber_(sheet, payload);
  if (!rowNumber) {
    throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var bikeName = trimFullWidth(String(payload.bikeName || getCellByHeader_(row, headerMap, '希望車種(希望車種)') || ''));
  var yearInput = trimFullWidth(String(payload.year || getCellByHeader_(row, headerMap, '年式(希望車種)') || ''));
  if (bikeName === '') {
    throw new Error('希望車種が未入力です。希望車種を入力して保存してから相場取得してください。');
  }

  var now = new Date();
  var requestedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  if (options.markProcessing) {
    setBikeMarketProcessingStatus_(sheet, headerMap, rowNumber, requestedAt);
    SpreadsheetApp.flush();
  }
  var summary = getBikeMarketSummaryWithCache_(bikeName, yearInput, now);
  var normalizedResult = normalizeBikeMarketResult_(summary);
  var aggregation = normalizedResult.priceAggregation;
  var aggregationValidation = validateBikeMarketAggregation_(aggregation);
  if (!aggregationValidation.valid && normalizedResult.market_status === 'success') {
    summary.status = 'error';
    summary.errorCode = aggregationValidation.errorCode;
    summary.errorMessage = aggregationValidation.message;
    normalizedResult.market_status = 'error';
    normalizedResult.market_error_code = aggregationValidation.errorCode;
    normalizedResult.market_error_message = aggregationValidation.message;
  } else if (isBikeMarketNormalizedSuccess_(normalizedResult)) {
    summary.status = 'success';
    summary.errorCode = '';
    summary.errorMessage = '';
    normalizedResult.market_status = 'success';
    normalizedResult.market_error_code = '';
    normalizedResult.market_error_message = '';
  }
  summary.priceAggregation = aggregation;
  var storedMarketStatus = getStoredBikeMarketStatus_(normalizedResult, summary);
  summary.market_status = storedMarketStatus;
  summary.market_error_code = normalizedResult.market_error_code || '';
  summary.market_error_message = normalizedResult.market_error_message || '';
  normalizedResult.market_raw_json = JSON.stringify(summary);

  var updates = {};
  updates['希望車種(希望車種)'] = bikeName;
  updates['年式(希望車種)'] = yearInput;
  updates['相場_最低総額'] = aggregation.min_price || '';
  updates['相場_最高総額'] = aggregation.max_price || '';
  updates['相場_平均総額'] = aggregation.simple_average_price || '';
  updates['相場_単純平均総額'] = aggregation.simple_average_price || '';
  updates['相場_中央値総額'] = aggregation.median_price || '';
  updates['相場_外れ値除外平均総額'] = aggregation.trimmed_average_price || '';
  updates['相場_参考相場総額'] = aggregation.reference_market_price || '';
  updates['相場_掲載台数'] = aggregation.year_matched_count || 0;
  updates['相場_価格取得可能台数'] = aggregation.price_available_count || 0;
  updates['相場_抽出候補件数'] = aggregation.extracted_count || 0;
  updates['相場_年式一致件数'] = aggregation.year_matched_count || 0;
  updates['相場_集計対象件数'] = aggregation.calculation_target_count || 0;
  updates['相場_本体価格代用件数'] = aggregation.used_base_price_fallback_count || 0;
  updates['相場_外れ値除外件数'] = aggregation.outlier_excluded_count || 0;
  updates['相場_外れ値除外価格'] = JSON.stringify(aggregation.outlier_excluded_prices || []);
  updates['相場_計算方法'] = aggregation.calculation_method || '';
  updates['相場_ステータス'] = storedMarketStatus || '';
  updates['相場_エラーコード'] = normalizedResult.market_error_code || '';
  updates['相場_取得元'] = summary.sources && summary.sources.length ? summary.sources.join(' / ') : '';
  updates['相場_取得日時'] = normalizedResult.market_fetched_at || summary.fetchedAt;
  updates['相場_エラー'] = normalizedResult.market_error_message ? normalizeBikeMarketDisplayError_(normalizedResult.market_error_message) : '';
  updates['相場_検索車種'] = bikeName;
  updates['相場_検索年式'] = yearInput;
  updates['相場_生データ'] = normalizedResult.market_raw_json;
  updates['相場_最終依頼日時'] = requestedAt;

  Object.keys(updates).forEach(function(columnName) {
    var columnNumber = headerMap[columnName];
    if (columnNumber) {
      sheet.getRange(rowNumber, columnNumber).setValue(updates[columnName]);
    }
  });

  var mappingCheck = verifySavedBikeMarketFields_(sheet, headerMap, rowNumber, aggregation);
  if (!mappingCheck.valid && normalizedResult.market_status === 'success') {
    summary.status = 'error';
    summary.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FIELD_MAPPING_ERROR;
    summary.errorMessage = mappingCheck.message;
    normalizedResult.market_status = 'error';
    normalizedResult.market_error_code = WEBAPP_BIKE_MARKET_ERROR_CODES.FIELD_MAPPING_ERROR;
    normalizedResult.market_error_message = mappingCheck.message;
    var errorColumn = headerMap['相場_エラー'];
    if (errorColumn) {
      sheet.getRange(rowNumber, errorColumn).setValue(WEBAPP_BIKE_MARKET_ERROR_SYSTEM);
    }
    var statusColumn = headerMap['相場_ステータス'];
    if (statusColumn) {
      sheet.getRange(rowNumber, statusColumn).setValue('error');
    }
    var errorCodeColumn = headerMap['相場_エラーコード'];
    if (errorCodeColumn) {
      sheet.getRange(rowNumber, errorCodeColumn).setValue(WEBAPP_BIKE_MARKET_ERROR_CODES.FIELD_MAPPING_ERROR);
    }
  } else if (normalizedResult.market_status === 'success') {
    var saveCheck = verifySavedBikeMarketSuccess_(sheet, headerMap, rowNumber);
    if (!saveCheck.valid) {
      summary.status = 'error';
      summary.errorCode = 'FIELD_SAVE_ERROR';
      summary.errorMessage = saveCheck.message;
      normalizedResult.market_status = 'error';
      normalizedResult.market_error_code = 'FIELD_SAVE_ERROR';
      normalizedResult.market_error_message = saveCheck.message;
      if (headerMap['相場_ステータス']) sheet.getRange(rowNumber, headerMap['相場_ステータス']).setValue('error');
      if (headerMap['相場_エラーコード']) sheet.getRange(rowNumber, headerMap['相場_エラーコード']).setValue('FIELD_SAVE_ERROR');
      if (headerMap['相場_エラー']) sheet.getRange(rowNumber, headerMap['相場_エラー']).setValue(WEBAPP_BIKE_MARKET_ERROR_SYSTEM);
    }
  }
  storedMarketStatus = getStoredBikeMarketStatus_(normalizedResult, summary);
  summary.market_status = storedMarketStatus;

  appendBikeMarketFetchLog_({
    rowNumber: rowNumber,
    rowKey: payload.rowKey || '',
    customerName: getCellByHeader_(row, headerMap, 'お名前') || ''
  }, summary);
  appendBikeMarketAutoFetchLog_({
    customerId: payload.rowKey || '',
    customerName: getCellByHeader_(row, headerMap, 'お名前') || '',
    bikeName: bikeName,
    year: yearInput,
    triggerType: triggerType,
    status: 'completed',
    marketStatus: storedMarketStatus || normalizedResult.market_status || '',
    referencePrice: aggregation.reference_market_price || '',
    priceAvailableCount: aggregation.price_available_count || 0,
    errorCode: normalizedResult.market_error_code || '',
    errorMessage: normalizedResult.market_error_message || ''
  });

  var refreshedHeaderMap = getHeaderMap_(sheet);
  var savedRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var refreshedCustomer = buildCustomerSummary_(
    savedRow,
    rowNumber,
    refreshedHeaderMap,
    getManagementColumnMap_(refreshedHeaderMap),
    getCallHistoryMap_(),
    hasBikeMarketCsvRows_()
  );

  return {
    message: getBikeMarketResultMessage_(summary),
    status: storedMarketStatus || normalizedResult.market_status,
    marketStatus: storedMarketStatus || normalizedResult.market_status,
    priceAggregation: aggregation,
    errorCode: normalizedResult.market_error_code || '',
    errorMessage: normalizedResult.market_error_message || '',
    summary: summary,
    customer: refreshedCustomer
  };
}

function autoFetchBikeMarketForNewCustomer(customerId) {
  var startedAt = new Date().getTime();
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var rowNumber = findRowNumberByCustomerId_(sheet, headerMap, customerId);
  if (!rowNumber) {
    appendBikeMarketAutoFetchLog_({
      customerId: customerId || '',
      triggerType: 'new_application_import',
      status: 'skipped',
      marketStatus: '',
      errorCode: 'CUSTOMER_NOT_FOUND',
      errorMessage: '自動相場取得対象の顧客行が見つかりません。'
    });
    return { skipped: true, reason: 'customer_not_found' };
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var rowKey = buildApplicationRowKey_(row, headerMap);
  var customerName = getCellByHeader_(row, headerMap, 'お名前') || '';
  var bikeName = trimFullWidth(String(getCellByHeader_(row, headerMap, '希望車種(希望車種)') || ''));
  var yearInput = trimFullWidth(String(getCellByHeader_(row, headerMap, '年式(希望車種)') || ''));
  var eligibility = getBikeMarketAutoFetchEligibility_(row, headerMap);
  if (!eligibility.eligible) {
    appendBikeMarketAutoFetchLog_({
      customerId: rowKey,
      customerName: customerName,
      bikeName: bikeName,
      year: yearInput,
      triggerType: 'new_application_import',
      status: 'skipped',
      marketStatus: getCellByHeader_(row, headerMap, '相場_ステータス') || '',
      errorCode: eligibility.reason,
      errorMessage: eligibility.message
    });
    return { skipped: true, reason: eligibility.reason, message: eligibility.message };
  }

  try {
    var result = runBikeMarketSearchForCustomer_({
      rowNumber: rowNumber,
      rowKey: rowKey,
      bikeName: bikeName,
      year: yearInput
    }, {
      triggerType: 'new_application_import',
      markProcessing: true
    });
    var elapsedMs = new Date().getTime() - startedAt;
    if (elapsedMs > WEBAPP_AUTO_FETCH_MARKET_TIMEOUT_MS && result && result.status !== 'success') {
      setBikeMarketDeferredStatus_(sheet, getHeaderMap_(sheet), rowNumber, 'AUTO_FETCH_TIMEOUT', '相場自動取得が30秒を超えたため取得保留にしました。手動の相場取得ボタンで再取得してください。');
      appendBikeMarketAutoFetchLog_({
        customerId: rowKey,
        customerName: customerName,
        bikeName: bikeName,
        year: yearInput,
        triggerType: 'new_application_import',
        status: 'deferred',
        marketStatus: 'deferred',
        referencePrice: '',
        priceAvailableCount: 0,
        errorCode: 'AUTO_FETCH_TIMEOUT',
        errorMessage: '相場自動取得が30秒を超えました。'
      });
    }
    return result;
  } catch (error) {
    saveBikeMarketAutoFetchError(rowKey, error);
    return {
      status: 'error',
      errorCode: 'AUTO_FETCH_ERROR',
      errorMessage: error && error.message ? error.message : String(error)
    };
  }
}

function queueBikeMarketLookupForNewCustomer(customerId) {
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var rowNumber = findRowNumberByCustomerId_(sheet, headerMap, customerId);
  if (!rowNumber) {
    appendBikeMarketAutoFetchLog_({
      customerId: customerId || '',
      triggerType: 'new_application_import',
      status: 'skipped',
      marketStatus: '',
      errorCode: 'CUSTOMER_NOT_FOUND',
      errorMessage: '相場取得キュー対象の顧客行が見つかりません。'
    });
    return { queued: false, reason: 'customer_not_found' };
  }

  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var rowKey = buildApplicationRowKey_(row, headerMap);
  var customerName = getCellByHeader_(row, headerMap, 'お名前') || '';
  var bikeName = trimFullWidth(String(getCellByHeader_(row, headerMap, '希望車種(希望車種)') || ''));
  var yearInput = trimFullWidth(String(getCellByHeader_(row, headerMap, '年式(希望車種)') || ''));
  var eligibility = getBikeMarketAutoFetchEligibility_(row, headerMap);
  if (!eligibility.eligible) {
    appendBikeMarketAutoFetchLog_({
      customerId: rowKey,
      customerName: customerName,
      bikeName: bikeName,
      year: yearInput,
      triggerType: 'new_application_import',
      status: 'skipped',
      marketStatus: getCellByHeader_(row, headerMap, '相場_ステータス') || '',
      errorCode: eligibility.reason,
      errorMessage: eligibility.message
    });
    return { queued: false, reason: eligibility.reason, message: eligibility.message };
  }

  var requestedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  setBikeMarketProcessingStatus_(sheet, headerMap, rowNumber, requestedAt);
  appendBikeMarketAutoFetchLog_({
    customerId: rowKey,
    customerName: customerName,
    bikeName: bikeName,
    year: yearInput,
    triggerType: 'new_application_import',
    status: 'queued',
    marketStatus: 'processing',
    referencePrice: '',
    priceAvailableCount: 0,
    errorCode: '',
    errorMessage: ''
  });
  return { queued: true, rowNumber: rowNumber, customerId: rowKey };
}

function processPendingBikeMarketLookups(maxItems) {
  var startedAt = new Date().getTime();
  var limit = Math.max(1, Math.min(Number(maxItems || WEBAPP_PENDING_MARKET_LOOKUP_MAX_PER_RUN) || WEBAPP_PENDING_MARKET_LOOKUP_MAX_PER_RUN, WEBAPP_PENDING_MARKET_LOOKUP_MAX_PER_RUN));
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { processed: 0, skipped: 0, errors: 0, deferred: 0, message: '対象行はありません。' };
  }

  var statusColumn = headerMap['相場_ステータス'];
  if (!statusColumn) {
    return { processed: 0, skipped: 0, errors: 0, deferred: 0, message: '相場ステータス列がありません。' };
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
  var processed = 0;
  var skipped = 0;
  var errors = 0;
  var deferred = 0;

  for (var i = 0; i < rows.length; i++) {
    if (processed >= limit) {
      break;
    }
    if (new Date().getTime() - startedAt >= WEBAPP_PENDING_MARKET_LOOKUP_SAFE_RUNTIME_MS) {
      deferred++;
      break;
    }
    var row = rows[i];
    var rowNumber = i + 2;
    var status = trimFullWidth(String(getCellByHeader_(row, headerMap, '相場_ステータス') || ''));
    if (status !== 'processing') {
      continue;
    }
    var bikeName = trimFullWidth(String(getCellByHeader_(row, headerMap, '希望車種(希望車種)') || ''));
    var yearInput = trimFullWidth(String(getCellByHeader_(row, headerMap, '年式(希望車種)') || ''));
    var customerName = getCellByHeader_(row, headerMap, 'お名前') || '';
    var rowKey = buildApplicationRowKey_(row, headerMap);
    if (!bikeName || !isBikeApplicationRow_(row, headerMap)) {
      setBikeMarketDeferredStatus_(sheet, headerMap, rowNumber, 'PENDING_LOOKUP_SKIPPED', !bikeName ? '希望車種が未入力のため相場取得を保留しました。' : 'バイク申込ではないため相場取得を保留しました。');
      appendBikeMarketAutoFetchLog_({
        customerId: rowKey,
        customerName: customerName,
        bikeName: bikeName,
        year: yearInput,
        triggerType: 'pending_market_lookup',
        status: 'skipped',
        marketStatus: 'deferred',
        errorCode: 'PENDING_LOOKUP_SKIPPED',
        errorMessage: !bikeName ? '希望車種が未入力です。' : 'バイク申込ではありません。'
      });
      skipped++;
      continue;
    }

    try {
      runBikeMarketSearchForCustomer_({
        rowNumber: rowNumber,
        rowKey: rowKey,
        bikeName: bikeName,
        year: yearInput
      }, {
        triggerType: 'pending_market_lookup',
        markProcessing: false
      });
      processed++;
    } catch (error) {
      saveBikeMarketAutoFetchError(rowKey, error);
      errors++;
    }
  }

  return {
    processed: processed,
    skipped: skipped,
    errors: errors,
    deferred: deferred,
    message: '保留中の相場取得を処理しました。'
  };
}

function installPendingBikeMarketLookupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction && triggers[i].getHandlerFunction() === 'processPendingBikeMarketLookups') {
      return { installed: false, message: 'processPendingBikeMarketLookups のトリガーは既に存在します。' };
    }
  }
  ScriptApp.newTrigger('processPendingBikeMarketLookups')
    .timeBased()
    .everyMinutes(5)
    .create();
  return { installed: true, message: 'processPendingBikeMarketLookups の5分ごとトリガーを作成しました。' };
}

function saveBikeMarketAutoFetchError(customerId, error) {
  try {
    var sheet = getMainSheet_();
    var headerMap = getHeaderMap_(sheet);
    ensureBikeMarketColumns_(sheet, headerMap);
    var rowNumber = findRowNumberByCustomerId_(sheet, headerMap, customerId);
    var message = error && error.message ? error.message : String(error || '');
    if (rowNumber) {
      var now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
      if (headerMap['相場_ステータス']) sheet.getRange(rowNumber, headerMap['相場_ステータス']).setValue('error');
      if (headerMap['相場_エラーコード']) sheet.getRange(rowNumber, headerMap['相場_エラーコード']).setValue('AUTO_FETCH_ERROR');
      if (headerMap['相場_エラー']) sheet.getRange(rowNumber, headerMap['相場_エラー']).setValue(normalizeBikeMarketDisplayError_(message));
      if (headerMap['相場_最終依頼日時']) sheet.getRange(rowNumber, headerMap['相場_最終依頼日時']).setValue(now);
    }
    appendBikeMarketAutoFetchLog_({
      customerId: customerId || '',
      triggerType: 'new_application_import',
      status: 'error',
      marketStatus: 'error',
      errorCode: 'AUTO_FETCH_ERROR',
      errorMessage: message
    });
  } catch (logError) {
    console.warn('Bike market auto fetch error save failed: ' + (logError && logError.message ? logError.message : String(logError)));
  }
}

function getBikeMarketAutoFetchEligibility_(row, headerMap) {
  if (!isAutoFetchMarketOnNewApplicationEnabled_()) {
    return { eligible: false, reason: 'AUTO_FETCH_DISABLED', message: '新規申込時の自動相場取得がOFFです。' };
  }
  var bikeName = trimFullWidth(String(getCellByHeader_(row, headerMap, '希望車種(希望車種)') || ''));
  if (!bikeName) {
    return { eligible: false, reason: 'MISSING_BIKE_NAME', message: '希望車種が未入力です。' };
  }
  if (!isBikeApplicationRow_(row, headerMap)) {
    return { eligible: false, reason: 'NOT_BIKE_APPLICATION', message: 'バイク申込ではないため自動取得しません。' };
  }
  var rawStatus = trimFullWidth(String(getCellByHeader_(row, headerMap, '相場_ステータス') || ''));
  if (rawStatus === 'processing') {
    return { eligible: false, reason: 'ALREADY_PROCESSING', message: '同一顧客の相場取得が処理中です。' };
  }
  if (rawStatus && ['未取得', '相場未取得', '未設定'].indexOf(rawStatus) === -1) {
    return { eligible: false, reason: 'ALREADY_FETCHED_OR_ATTEMPTED', message: '既に相場取得結果が保存されています。' };
  }
  return { eligible: true, reason: '', message: '' };
}

function isBikeApplicationRow_(row, headerMap) {
  var requestType = trimFullWidth(String(getCellByHeader_(row, headerMap, 'ご希望') || '')).toLowerCase();
  var applicationType = trimFullWidth(String(getCellByHeader_(row, headerMap, '申込種別') || '')).toLowerCase();
  if (requestType.indexOf('バイク') !== -1 || requestType.indexOf('bike') !== -1) {
    return true;
  }
  if (applicationType.indexOf('バイク') !== -1 || applicationType.indexOf('bike') !== -1) {
    return true;
  }
  if ((requestType.indexOf('車') !== -1 || requestType.indexOf('car') !== -1) && requestType.indexOf('バイク') === -1) {
    return false;
  }
  return false;
}

function findRowNumberByCustomerId_(sheet, headerMap, customerId) {
  var id = trimFullWidth(String(customerId || ''));
  var numericId = Number(id);
  if (numericId >= 2 && numericId <= sheet.getLastRow()) {
    return numericId;
  }
  if (!id || sheet.getLastRow() <= 1) {
    return null;
  }
  var lastCol = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    if (buildApplicationRowKey_(rows[i], headerMap) === id) {
      return i + 2;
    }
  }
  return null;
}

function setBikeMarketProcessingStatus_(sheet, headerMap, rowNumber, requestedAt) {
  if (headerMap['相場_ステータス']) sheet.getRange(rowNumber, headerMap['相場_ステータス']).setValue('processing');
  if (headerMap['相場_最終依頼日時']) sheet.getRange(rowNumber, headerMap['相場_最終依頼日時']).setValue(requestedAt || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'));
  if (headerMap['相場_エラー']) sheet.getRange(rowNumber, headerMap['相場_エラー']).clearContent();
  if (headerMap['相場_エラーコード']) sheet.getRange(rowNumber, headerMap['相場_エラーコード']).clearContent();
}

function setBikeMarketDeferredStatus_(sheet, headerMap, rowNumber, errorCode, message) {
  if (headerMap['相場_ステータス']) sheet.getRange(rowNumber, headerMap['相場_ステータス']).setValue('deferred');
  if (headerMap['相場_エラーコード']) sheet.getRange(rowNumber, headerMap['相場_エラーコード']).setValue(errorCode || 'AUTO_FETCH_DEFERRED');
  if (headerMap['相場_エラー']) sheet.getRange(rowNumber, headerMap['相場_エラー']).setValue(message || '取得保留');
}

function getStoredBikeMarketStatus_(normalizedResult, summary) {
  if (normalizedResult && normalizedResult.market_status === 'success') {
    return 'success';
  }
  if (normalizedResult && normalizedResult.market_status === 'error') {
    return 'error';
  }
  var message = normalizeBikeMarketDisplayError_((normalizedResult && normalizedResult.market_error_message) || (summary && summary.errorMessage) || '');
  if (message === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM) {
    return 'model_check';
  }
  if (isBikeMarketNoDataMessage_(message) || (summary && summary.status === 'no_data')) {
    return 'no_match';
  }
  return normalizedResult && normalizedResult.market_status ? normalizedResult.market_status : '';
}

function getBikeMarketResultMessage_(summary) {
  var normalizedError = normalizeBikeMarketDisplayError_(summary && summary.errorMessage);
  if (!normalizedError) {
    return '相場情報を保存しました。';
  }
  if (normalizedError === WEBAPP_BIKE_MARKET_ERROR_NO_DATA) {
    return '相場データ未登録です。';
  }
  if (normalizedError === WEBAPP_BIKE_MARKET_ERROR_NO_MATCH) {
    return '該当なしです。';
  }
  if (normalizedError === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM) {
    return '車種名を少し変えて再検索してください。';
  }
  return '相場情報を取得できませんでした。管理者に確認してください。';
}

function importBikeMarketCsv(csvText, auth) {
  assertMarketAdminPasscode_(auth);
  var text = String(csvText || '').trim();
  if (text === '') {
    throw new Error('CSVが空です。');
  }

  var rows = Utilities.parseCsv(text);
  if (!rows || rows.length < 2) {
    throw new Error('CSVのデータ行がありません。');
  }

  var inputHeaders = rows[0].map(function(header) {
    return trimFullWidth(String(header || ''));
  });
  var missing = WEBAPP_BIKE_MARKET_CSV_COLUMNS.filter(function(columnName) {
    return inputHeaders.indexOf(columnName) === -1;
  });
  if (missing.length > 0) {
    throw new Error('CSV列が不足しています: ' + missing.join(', '));
  }

  var sheet = getOrCreateBikeMarketSheet_();
  var existingLastRow = sheet.getLastRow();
  if (existingLastRow > 1) {
    sheet.getRange(2, 1, existingLastRow - 1, WEBAPP_BIKE_MARKET_CSV_COLUMNS.length).clearContent();
  }

  var outputRows = [];
  var invalidRows = [];
  var excludedPriceCount = 0;
  var validPriceCount = 0;
  for (var i = 1; i < rows.length; i++) {
    var sourceRow = rows[i];
    if (sourceRow.join('').trim() === '') {
      continue;
    }
    var outputRow = WEBAPP_BIKE_MARKET_CSV_COLUMNS.map(function(columnName) {
      var index = inputHeaders.indexOf(columnName);
      return index >= 0 ? sourceRow[index] : '';
    });
    var rowNumber = i + 1;
    var yearValue = outputRow[2];
    var normalizedYear = normalizeYearInput_(yearValue);
    var totalPriceText = trimFullWidth(String(outputRow[3] || ''));
    var basePriceText = trimFullWidth(String(outputRow[4] || ''));
    var totalPrice = parsePriceToYen_(totalPriceText);
    var basePrice = parsePriceToYen_(basePriceText);

    if (trimFullWidth(String(outputRow[1] || '')) === '') {
      invalidRows.push(rowNumber + '行目：bike_nameが空です');
      continue;
    }
    if (yearValue && !normalizedYear.valid) {
      invalidRows.push(rowNumber + '行目：yearが不正です');
      continue;
    }
    if (totalPriceText === '' && basePriceText === '') {
      invalidRows.push(rowNumber + '行目：total_price_yen と base_price_yen が両方空です');
      continue;
    }
    if (!totalPrice && !basePrice) {
      excludedPriceCount++;
    } else {
      validPriceCount++;
    }

    outputRows.push(outputRow);
  }

  if (outputRows.length > 0) {
    sheet.getRange(2, 1, outputRows.length, WEBAPP_BIKE_MARKET_CSV_COLUMNS.length).setValues(outputRows);
  }

  clearBikeMarketCache_();

  return {
    message: '相場データ取込が完了しました。相場取得を実行できます。',
    importedCount: outputRows.length,
    validPriceCount: validPriceCount,
    excludedPriceCount: excludedPriceCount,
    invalidRows: invalidRows
  };
}

function getBikeMarketAdminData(filter, auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getOrCreateBikeMarketSheet_();
  var lastRow = sheet.getLastRow();
  var result = {
    rows: [],
    totalCount: 0,
    visibleCount: 0,
    validPriceCount: 0,
    excludedPriceCount: 0,
    columns: WEBAPP_BIKE_MARKET_CSV_COLUMNS
  };
  if (lastRow <= 1) {
    return result;
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, WEBAPP_BIKE_MARKET_CSV_COLUMNS.length).getDisplayValues();
  var bikeFilter = normalizeBikeMarketKeyPart_((filter && filter.bikeName) || '');
  var yearFilter = normalizeYearInput_((filter && filter.year) || '');
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowNumber = i + 2;
    var bikeName = row[1] || '';
    var year = row[2] || '';
    var totalPrice = parsePriceToYen_(row[3]);
    var basePrice = parsePriceToYen_(row[4]);
    result.totalCount++;
    if (totalPrice || basePrice) {
      result.validPriceCount++;
    } else {
      result.excludedPriceCount++;
    }

    if (bikeFilter && normalizeBikeMarketKeyPart_(bikeName).indexOf(bikeFilter) === -1 && bikeFilter.indexOf(normalizeBikeMarketKeyPart_(bikeName)) === -1) {
      continue;
    }
    if (yearFilter && !yearFilter.unspecified) {
      var listingYear = parseBikeMarketYearNumber_(year);
      if (!isYearMatched_(listingYear, yearFilter)) {
        continue;
      }
    }

    result.rows.push({
      rowNumber: rowNumber,
      source: row[0] || '',
      bikeName: bikeName,
      year: year,
      totalPriceYen: row[3] || '',
      basePriceYen: row[4] || '',
      mileageKm: row[5] || '',
      shopName: row[6] || '',
      prefecture: row[7] || '',
      url: row[8] || ''
    });
  }
  result.visibleCount = result.rows.length;
  return result;
}

function deleteBikeMarketAdminRows(rowNumbers, auth) {
  assertMarketAdminPasscode_(auth);
  var numbers = (rowNumbers || []).map(function(value) {
    return Number(value);
  }).filter(function(value) {
    return Number.isFinite(value) && value > 1;
  }).sort(function(a, b) {
    return b - a;
  });
  if (numbers.length === 0) {
    return { message: '削除対象が選択されていません。', deletedCount: 0 };
  }

  var sheet = getOrCreateBikeMarketSheet_();
  var lastRow = sheet.getLastRow();
  var deletedCount = 0;
  for (var i = 0; i < numbers.length; i++) {
    if (numbers[i] <= lastRow) {
      sheet.deleteRow(numbers[i]);
      deletedCount++;
    }
  }
  clearBikeMarketCache_();
  return {
    message: '相場データを削除しました。削除件数：' + deletedCount + '件',
    deletedCount: deletedCount
  };
}

function clearBikeMarketAdminData(auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getOrCreateBikeMarketSheet_();
  var lastRow = sheet.getLastRow();
  var deletedCount = Math.max(0, lastRow - 1);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, WEBAPP_BIKE_MARKET_CSV_COLUMNS.length).clearContent();
  }
  clearBikeMarketCache_();
  return {
    message: '登録済み相場データをすべて削除しました。削除件数：' + deletedCount + '件',
    deletedCount: deletedCount
  };
}

function detectAbnormalBikeMarketDataForAdmin(auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { message: '検出対象の顧客行はありません。', rows: [], count: 0 };
  }
  var lastCol = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var detected = [];
  for (var i = 0; i < rows.length; i++) {
    var aggregation = readBikeMarketAggregationFromSavedColumns_(rows[i], displayRows[i], headerMap);
    var validation = validateBikeMarketAggregation_(aggregation);
    if (!validation.valid) {
      detected.push({
        rowNumber: i + 2,
        customerName: getCellByHeader_(displayRows[i], headerMap, 'お名前') || '',
        bikeName: getCellByHeader_(displayRows[i], headerMap, '希望車種(希望車種)') || '',
        reason: validation.errorCode + ': ' + validation.message,
        priceAggregation: aggregation
      });
    }
  }
  return {
    message: '異常相場データの検出件数：' + detected.length + '件',
    rows: detected,
    count: detected.length
  };
}

function clearAbnormalBikeMarketDataForAdmin(auth) {
  assertMarketAdminPasscode_(auth);
  var detection = detectAbnormalBikeMarketDataForAdmin(auth);
  if (!detection.rows.length) {
    return { message: 'クリア対象の異常相場データはありません。', clearedCount: 0, rows: [] };
  }
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var clearColumns = [
    '相場_最低総額',
    '相場_最高総額',
    '相場_平均総額',
    '相場_単純平均総額',
    '相場_中央値総額',
    '相場_外れ値除外平均総額',
    '相場_参考相場総額',
    '相場_掲載台数',
    '相場_価格取得可能台数',
    '相場_抽出候補件数',
    '相場_年式一致件数',
    '相場_集計対象件数',
    '相場_本体価格代用件数',
    '相場_外れ値除外件数',
    '相場_外れ値除外価格',
    '相場_計算方法',
    '相場_取得元',
    '相場_取得日時',
    '相場_エラー',
    '相場_生データ',
    '相場_最終依頼日時'
  ];
  detection.rows.forEach(function(row) {
    clearColumns.forEach(function(columnName) {
      var columnNumber = headerMap[columnName];
      if (columnNumber) {
        sheet.getRange(row.rowNumber, columnNumber).clearContent();
      }
    });
  });
  return {
    message: '異常相場データをクリアしました。クリア件数：' + detection.rows.length + '件',
    clearedCount: detection.rows.length,
    rows: detection.rows
  };
}

function repairSavedBikeMarketStatusForAdmin(auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
  ensureBikeMarketColumns_(sheet, headerMap);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { message: '補正対象の顧客行はありません。', repairedCount: 0, rows: [] };
  }
  var lastCol = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var repaired = [];
  for (var i = 0; i < rows.length; i++) {
    var rowNumber = i + 2;
    var aggregation = readBikeMarketAggregationFromSavedColumns_(rows[i], displayRows[i], headerMap);
    if (!isBikeMarketAggregationSuccess_(aggregation)) {
      continue;
    }
    if (headerMap['相場_ステータス']) sheet.getRange(rowNumber, headerMap['相場_ステータス']).setValue('success');
    if (headerMap['相場_エラー']) sheet.getRange(rowNumber, headerMap['相場_エラー']).clearContent();
    if (headerMap['相場_エラーコード']) sheet.getRange(rowNumber, headerMap['相場_エラーコード']).clearContent();
    repaired.push({
      rowNumber: rowNumber,
      customerName: getCellByHeader_(displayRows[i], headerMap, 'お名前') || '',
      bikeName: getCellByHeader_(displayRows[i], headerMap, '希望車種(希望車種)') || '',
      referenceMarketPrice: aggregation.reference_market_price,
      priceAvailableCount: aggregation.price_available_count
    });
  }
  return {
    message: '相場保存値を再補正しました。補正件数：' + repaired.length + '件',
    repairedCount: repaired.length,
    rows: repaired
  };
}

function readBikeMarketAggregationFromSavedColumns_(row, displayRow, headerMap) {
  function value(columnName) {
    var index = headerMap[columnName] ? headerMap[columnName] - 1 : -1;
    if (index < 0) {
      return null;
    }
    return strictBikeMarketNumber_(row[index]);
  }
  return {
    extracted_count: value('相場_抽出候補件数') || 0,
    year_matched_count: value('相場_年式一致件数') || 0,
    price_available_count: value('相場_価格取得可能台数') || 0,
    calculation_target_count: value('相場_集計対象件数') || 0,
    min_price: value('相場_最低総額'),
    max_price: value('相場_最高総額'),
    simple_average_price: value('相場_単純平均総額') || value('相場_平均総額'),
    median_price: value('相場_中央値総額'),
    trimmed_average_price: value('相場_外れ値除外平均総額'),
    reference_market_price: value('相場_参考相場総額'),
    used_base_price_fallback_count: value('相場_本体価格代用件数') || 0,
    outlier_excluded_count: value('相場_外れ値除外件数') || 0,
    outlier_excluded_prices: [],
    calculation_method: getCellByHeader_(displayRow, headerMap, '相場_計算方法') || ''
  };
}

function getMainSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }
  return sheet;
}

function getHeaderMap_(sheet) {
  repairBaseApplicationHeaders_(sheet);

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return {};
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var name = trimFullWidth(String(headers[i] || ''));
    if (name !== '') {
      map[name] = i + 1;
    }
  }
  return map;
}

function getManagementColumnMap_(headerMap) {
  var map = {};
  for (var i = 0; i < WEBAPP_MANAGEMENT_COLUMNS.length; i++) {
    var columnName = WEBAPP_MANAGEMENT_COLUMNS[i];
    map[columnName] = headerMap[columnName] || headerMap[WEBAPP_LEGACY_MANAGEMENT_COLUMNS[columnName]] || null;
  }
  return map;
}

function hasMissingManagementColumns_(managementMap) {
  for (var i = 0; i < WEBAPP_MANAGEMENT_COLUMNS.length; i++) {
    if (!managementMap[WEBAPP_MANAGEMENT_COLUMNS[i]]) {
      return true;
    }
  }
  return false;
}

function buildCustomerSummary_(row, rowNumber, headerMap, managementMap, callHistoryMap, hasBikeMarketCsv) {
  var rowKey = buildApplicationRowKey_(row, headerMap);
  var callHistory = callHistoryMap[rowKey] || [];
  var latestCall = callHistory.length > 0 ? callHistory[callHistory.length - 1] : null;
  var applicationType = getManagedCell_(row, managementMap, '申込種別') || '仮審査申込';
  var status = normalizeStatusLabel_(getManagedCell_(row, managementMap, '対応状況') || getManagedCell_(row, managementMap, '対応ステータス') || '新規受付');
  var marketState = buildBikeMarketState_(row, headerMap, hasBikeMarketCsv);
  var marketAggregation = marketState.priceAggregation || {};

  return {
    rowNumber: rowNumber,
    rowKey: rowKey,
    applicationType: applicationType,
    receivedAt: getCellByHeader_(row, headerMap, '受信日時'),
    requestType: getCellByHeader_(row, headerMap, 'ご希望'),
    name: getCellByHeader_(row, headerMap, 'お名前'),
    kana: getCellByHeader_(row, headerMap, 'フリガナ'),
    phone: normalizeDisplayValue_('電話番号', getCellByHeader_(row, headerMap, '電話番号')),
    email: getCellByHeader_(row, headerMap, 'メールアドレス'),
    birthDate: getCellByHeader_(row, headerMap, '生年月日'),
    age: getCellByHeader_(row, headerMap, '年齢'),
    address: getCellByHeader_(row, headerMap, '住所'),
    addressKana: normalizeAddressKana_(getCellByHeader_(row, headerMap, '住所(カナ)')),
    prefecture: extractPrefecture_(getCellByHeader_(row, headerMap, '住所'), getCellByHeader_(row, headerMap, '郵便番号')),
    workplace: getCellByHeader_(row, headerMap, '勤務先名'),
    workplaceKana: getCellByHeader_(row, headerMap, '勤務先名(フリガナ)'),
    workPostalCode: getCellByHeader_(row, headerMap, '勤務先郵便番号'),
    workAddress: getCellByHeader_(row, headerMap, '勤務先住所'),
    workPhone: normalizeDisplayValue_('勤務先電話番号', getCellByHeader_(row, headerMap, '勤務先電話番号')),
    yearsEmployed: getCellByHeader_(row, headerMap, '勤続年数'),
    annualIncome: getCellByHeader_(row, headerMap, '税込年収'),
    desiredCar: getCellByHeader_(row, headerMap, '希望車種(希望車種)'),
    desiredYear: getCellByHeader_(row, headerMap, '年式(希望車種)'),
    maxMonthlyPayment: getCellByHeader_(row, headerMap, '毎月の支払い金額は最高ではいくら払えますか'),
    applicationAmount: getCellByHeader_(row, headerMap, '審査申込金額'),
    paymentCount: getCellByHeader_(row, headerMap, '支払い回数'),
    customerRate: getCellByHeader_(row, headerMap, 'お客様提示金利(%)') || '13.9',
    firstPayment: getCellByHeader_(row, headerMap, '1回目支払額'),
    monthlyPayment: getCellByHeader_(row, headerMap, '2回目〜毎月'),
    totalPayment: getCellByHeader_(row, headerMap, '総支払額'),
    actualRate: getCellByHeader_(row, headerMap, '実際の金利(%)'),
    actualCostTotal: getCellByHeader_(row, headerMap, '実コスト総額'),
    kickbackDiff: getCellByHeader_(row, headerMap, 'キックバック差額'),
    status: status,
    assignee: getManagedCell_(row, managementMap, '担当者'),
    review1: getManagedCell_(row, managementMap, 'プレミアファイナンス審査結果') || '未依頼',
    review2: getManagedCell_(row, managementMap, 'アスト審査結果') || '未依頼',
    callCount: callHistory.length,
    latestCallAt: latestCall ? latestCall.callAt : '',
    latestCallResult: latestCall ? latestCall.result : '',
    latestCallStaff: latestCall ? latestCall.staffName : '',
    callHistory: callHistory,
    memo: getManagedCell_(row, managementMap, '対応メモ'),
    updatedAt: getManagedCell_(row, managementMap, '最終更新日時'),
    updatedBy: getManagedCell_(row, managementMap, '最終更新者'),
    market: marketState,
    market_status: marketState.marketStatus || '',
    market_reference_price: marketAggregation.reference_market_price || 0,
    market_min_price: marketAggregation.min_price || 0,
    market_max_price: marketAggregation.max_price || 0,
    market_simple_average_price: marketAggregation.simple_average_price || 0,
    market_median_price: marketAggregation.median_price || 0,
    market_trimmed_average_price: marketAggregation.trimmed_average_price || 0,
    market_extracted_count: marketAggregation.extracted_count || 0,
    market_year_matched_count: marketAggregation.year_matched_count || 0,
    market_price_available_count: marketAggregation.price_available_count || 0,
    market_calculation_target_count: marketAggregation.calculation_target_count || 0,
    market_calculation_method: marketAggregation.calculation_method || '',
    market_error_message: marketState.errorMessage || '',
    market_error_code: marketState.errorCode || '',
    applicationFields: buildApplicationFields_(row, headerMap)
  };
}

function getCellByHeader_(row, headerMap, columnName) {
  var column = headerMap[columnName];
  if (!column) {
    return '';
  }
  return row[column - 1] || '';
}

function extractPrefecture_(address, postalCode) {
  var text = trimFullWidth(String(address || ''));
  var match = text.match(/^(北海道|東京都|京都府|大阪府|.{2,3}県)/);
  if (match) {
    return match[1];
  }

  var postalPrefix = normalizePhoneNumber_(postalCode).replace(/\D/g, '').substring(0, 2);
  var postalMap = {
    '00': '北海道', '01': '秋田県', '02': '岩手県', '03': '青森県', '04': '北海道', '05': '北海道', '06': '北海道', '07': '北海道', '08': '北海道', '09': '北海道',
    '10': '東京都', '11': '東京都', '12': '東京都', '13': '東京都', '14': '東京都', '15': '東京都', '16': '東京都', '17': '東京都', '18': '東京都', '19': '東京都', '20': '東京都',
    '21': '神奈川県', '22': '神奈川県', '23': '神奈川県', '24': '神奈川県', '25': '神奈川県',
    '26': '千葉県', '27': '千葉県', '28': '千葉県', '29': '千葉県',
    '30': '茨城県', '31': '茨城県', '32': '栃木県', '33': '埼玉県', '34': '埼玉県', '35': '埼玉県', '36': '埼玉県', '37': '群馬県',
    '38': '長野県', '39': '長野県', '40': '山梨県', '41': '静岡県', '42': '静岡県', '43': '静岡県', '44': '愛知県', '45': '愛知県', '46': '愛知県', '47': '愛知県', '48': '愛知県', '49': '三重県',
    '50': '岐阜県', '51': '三重県', '52': '滋賀県', '53': '大阪府', '54': '大阪府', '55': '大阪府', '56': '大阪府', '57': '大阪府', '58': '大阪府', '59': '大阪府',
    '60': '京都府', '61': '京都府', '62': '京都府', '63': '奈良県', '64': '和歌山県', '65': '兵庫県', '66': '兵庫県', '67': '兵庫県', '68': '鳥取県', '69': '島根県',
    '70': '岡山県', '71': '岡山県', '72': '広島県', '73': '広島県', '74': '山口県', '75': '山口県', '76': '香川県', '77': '徳島県', '78': '高知県', '79': '愛媛県',
    '80': '福岡県', '81': '福岡県', '82': '福岡県', '83': '福岡県', '84': '佐賀県', '85': '長崎県', '86': '熊本県', '87': '大分県', '88': '宮崎県', '89': '鹿児島県',
    '90': '沖縄県', '91': '福井県', '92': '石川県', '93': '富山県', '94': '新潟県', '95': '新潟県', '96': '福島県', '97': '福島県', '98': '宮城県', '99': '山形県'
  };

  return postalMap[postalPrefix] || '';
}

function getManagedCell_(row, managementMap, columnName) {
  var column = managementMap[columnName];
  if (!column) {
    return '';
  }
  return row[column - 1] || '';
}

function findCurrentRowNumber_(sheet, payload) {
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) {
    return null;
  }

  var requestedRowNumber = Number(payload.rowNumber);
  if (requestedRowNumber >= 2 && requestedRowNumber <= lastRow) {
    var requestedRow = sheet.getRange(requestedRowNumber, 1, 1, lastCol).getDisplayValues()[0];
    if (buildApplicationRowKey_(requestedRow, headerMap) === payload.rowKey) {
      return requestedRowNumber;
    }
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var matchedRowNumbers = [];
  for (var i = 0; i < rows.length; i++) {
    if (buildApplicationRowKey_(rows[i], headerMap) === payload.rowKey) {
      matchedRowNumbers.push(i + 2);
    }
  }

  return matchedRowNumbers.length === 1 ? matchedRowNumbers[0] : null;
}

function buildApplicationRowKey_(row, headerMap) {
  var keyParts = [
    getCellByHeader_(row, headerMap, '受信日時'),
    getCellByHeader_(row, headerMap, 'お名前'),
    getCellByHeader_(row, headerMap, '電話番号'),
    getCellByHeader_(row, headerMap, 'メールアドレス')
  ];

  var normalized = keyParts.map(function(value) {
    return normalizeDuplicateValue(value);
  });

  return Utilities.base64EncodeWebSafe(normalized.join('|'));
}

function isEmptyDisplayRow_(row) {
  for (var i = 0; i < row.length; i++) {
    if (trimFullWidth(String(row[i] || '')) !== '') {
      return false;
    }
  }
  return true;
}

function normalizeOption_(value, options, fallback) {
  var normalized = trimFullWidth(String(value || ''));
  return options.indexOf(normalized) !== -1 ? normalized : fallback;
}

function normalizeStatusLabel_(status) {
  var normalized = trimFullWidth(String(status || ''));
  var map = {
    '電話つながった': '電話がつながりプレミア審査前',
    'フォーム記入済': 'プレミア審査中',
    '1社目審査中': 'プレミア審査中',
    '1社目可決（本決済・送金・成約）': 'プレミア可決',
    '1社目否決（2社目審査中）': 'プレミア否決',
    '2社目可決（成約）': 'アスト可決',
    'アスト契約': 'アスト契約待ち',
    '2社目否決（対応終了）': 'アスト否決'
  };

  return map[normalized] || normalized || '新規受付';
}

function buildApplicationFields_(row, headerMap) {
  var fields = [];
  var applicationColumns = getApplicationFieldColumns_();
  for (var i = 0; i < applicationColumns.length; i++) {
    var columnName = applicationColumns[i];
    if (WEBAPP_HIDDEN_APPLICATION_FIELDS.indexOf(columnName) !== -1) {
      continue;
    }

    var value = normalizeDisplayValue_(columnName, getCellByHeader_(row, headerMap, columnName));
    if (columnName === '住所(カナ)') {
      value = normalizeAddressKana_(value);
    }
    fields.push({
      name: columnName,
      value: value,
      editable: columnName !== '受信日時',
      important: WEBAPP_IMPORTANT_APPLICATION_FIELDS.indexOf(columnName) !== -1
    });
  }
  return fields;
}

function updateBlankApplicationFields_(sheet, rowNumber, headerMap, fieldValues) {
  var applicationColumns = getApplicationFieldColumns_();
  Object.keys(fieldValues).forEach(function(columnName) {
    if (applicationColumns.indexOf(columnName) === -1 || columnName === '受信日時' || WEBAPP_HIDDEN_APPLICATION_FIELDS.indexOf(columnName) !== -1) {
      return;
    }

    var columnNumber = headerMap[columnName];
    if (!columnNumber) {
      return;
    }

    var newValue = normalizeApplicationFieldValue_(columnName, fieldValues[columnName]);
    if (WEBAPP_PHONE_FIELDS.indexOf(columnName) !== -1) {
      sheet.getRange(rowNumber, columnNumber).setNumberFormat('@');
    }
    sheet.getRange(rowNumber, columnNumber).setValue(newValue);
  });
}

function getApplicationFieldColumns_() {
  var fields = COLUMNS.slice();
  var extraColumns = typeof EXTRA_APPLICATION_COLUMNS !== 'undefined' ? EXTRA_APPLICATION_COLUMNS : [];
  for (var i = 0; i < extraColumns.length; i++) {
    if (fields.indexOf(extraColumns[i]) === -1) {
      fields.push(extraColumns[i]);
    }
  }
  return fields;
}

function normalizeApplicationFieldValue_(columnName, value) {
  var text = trimFullWidth(String(value || ''));
  if (WEBAPP_PHONE_FIELDS.indexOf(columnName) === -1) {
    return text;
  }
  return normalizePhoneNumber_(text);
}

function normalizeDisplayValue_(columnName, value) {
  if (WEBAPP_PHONE_FIELDS.indexOf(columnName) === -1) {
    return value;
  }
  return normalizePhoneNumber_(value);
}

function normalizeAddressKana_(value) {
  var text = trimFullWidth(String(value || ''));
  if (WEBAPP_HOUSING_VALUES.indexOf(text) !== -1) {
    return '';
  }
  return text;
}

function ensureBikeMarketColumns_(sheet, headerMap) {
  for (var i = 0; i < WEBAPP_BIKE_MARKET_COLUMNS.length; i++) {
    var columnName = WEBAPP_BIKE_MARKET_COLUMNS[i];
    if (!headerMap[columnName]) {
      var nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(columnName).setFontWeight('bold');
      headerMap[columnName] = nextColumn;
    }
  }
}

function buildBikeMarketState_(row, headerMap, hasBikeMarketCsv) {
  var fetchedAt = getCellByHeader_(row, headerMap, '相場_取得日時');
  var errorMessage = getCellByHeader_(row, headerMap, '相場_エラー');
  var savedMarketStatus = getCellByHeader_(row, headerMap, '相場_ステータス');
  var savedErrorCode = getCellByHeader_(row, headerMap, '相場_エラーコード');
  var rawSummary = safeParseJson_(getCellByHeader_(row, headerMap, '相場_生データ'));
  var aggregation = getBikeMarketAggregation_(rawSummary);
  if (!isBikeMarketAggregationSuccess_(aggregation)) {
    aggregation = readBikeMarketAggregationFromSavedColumns_(row, row, headerMap);
  }
  var aggregationValidation = validateBikeMarketAggregation_(aggregation);
  var hasSuccessValues = isBikeMarketAggregationSuccess_(aggregation);
  var displayError = normalizeBikeMarketDisplayError_(errorMessage);
  var averagePrice = aggregation.simple_average_price || null;
  var simpleAveragePrice = aggregation.simple_average_price || null;
  var medianPrice = aggregation.median_price || null;
  var trimmedAveragePrice = aggregation.trimmed_average_price || null;
  var referencePrice = aggregation.reference_market_price || null;
  var listingCount = aggregation.year_matched_count || 0;
  var validPriceCount = aggregation.price_available_count || 0;
  var searchBikeName = getCellByHeader_(row, headerMap, '相場_検索車種');
  var searchYear = getCellByHeader_(row, headerMap, '相場_検索年式');
  var currentBikeName = getCellByHeader_(row, headerMap, '希望車種(希望車種)');
  var currentYear = getCellByHeader_(row, headerMap, '年式(希望車種)');
  var needsRefresh = false;

  if (fetchedAt && isBikeMarketFetchedAtExpired_(fetchedAt)) {
    needsRefresh = true;
  }
  if (fetchedAt && normalizeBikeMarketKeyPart_(searchBikeName) !== normalizeBikeMarketKeyPart_(currentBikeName)) {
    needsRefresh = true;
  }
  if (fetchedAt && normalizeYearInput_(searchYear).cachePart !== normalizeYearInput_(currentYear).cachePart) {
    needsRefresh = true;
  }

  var status = '相場未取得';
  if (savedMarketStatus === 'processing') {
    status = '相場取得中';
  } else if (hasSuccessValues) {
    status = needsRefresh ? '要再取得' : '相場取得済み';
  } else if (savedMarketStatus === 'success') {
    status = '相場取得済み';
  } else if (savedMarketStatus === 'model_check') {
    status = '車種名確認';
  } else if (savedMarketStatus === 'no_match') {
    status = '該当なし';
  } else if (savedMarketStatus === 'error') {
    status = '取得エラー';
  } else if (savedMarketStatus === 'deferred') {
    status = '相場未取得';
  } else if (displayError === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM) {
    status = '車種名確認';
  } else if (isBikeMarketNoDataMessage_(errorMessage)) {
    status = '該当なし';
  } else if (errorMessage) {
    status = '取得エラー';
  } else if (needsRefresh) {
    status = '要再取得';
  } else if (!aggregationValidation.valid && fetchedAt) {
    status = '取得エラー';
  } else if (referencePrice || averagePrice) {
    status = '相場取得済み';
  } else if (fetchedAt && listingCount === 0) {
    status = '該当なし';
  }

  return {
    status: status,
    minPrice: aggregation.min_price || null,
    maxPrice: aggregation.max_price || null,
    averagePrice: averagePrice,
    simpleAveragePrice: simpleAveragePrice,
    medianPrice: medianPrice,
    trimmedAveragePrice: trimmedAveragePrice,
    referencePrice: referencePrice,
    listingCount: listingCount,
    validPriceCount: validPriceCount,
    extractedCount: aggregation.extracted_count || 0,
    yearMatchedCount: aggregation.year_matched_count || 0,
    calculationTargetCount: aggregation.calculation_target_count || 0,
    usedBasePriceFallbackCount: aggregation.used_base_price_fallback_count || 0,
    outlierExcludedCount: aggregation.outlier_excluded_count || 0,
    outlierExcludedPrices: aggregation.outlier_excluded_prices || [],
    calculationMethod: aggregation.calculation_method || '',
    priceWarning: aggregation.price_warning || '',
    noDataReason: rawSummary && rawSummary.noDataReason ? rawSummary.noDataReason : '',
    modelCandidateOptions: getBikeMarketDisplayCandidateOptions_(rawSummary),
    priceAggregation: aggregation,
    mappingError: aggregationValidation.valid ? '' : aggregationValidation.message,
    marketStatus: hasSuccessValues ? 'success' : savedMarketStatus,
    errorCode: hasSuccessValues ? '' : savedErrorCode,
    sources: getCellByHeader_(row, headerMap, '相場_取得元'),
    fetchedAt: fetchedAt,
    errorMessage: hasSuccessValues ? '' : displayError,
    needsRefresh: needsRefresh,
    searchBikeName: searchBikeName,
    searchYear: searchYear
  };
}

function getBikeMarketAggregation_(summary) {
  var source = summary && summary.priceAggregation ? summary.priceAggregation : {};
  return {
    extracted_count: strictBikeMarketNumber_(source.extracted_count) || strictBikeMarketNumber_(summary && (summary.market_extracted_count || summary.extractedCount)),
    year_matched_count: strictBikeMarketNumber_(source.year_matched_count) || strictBikeMarketNumber_(summary && (summary.market_year_matched_count || summary.yearMatchedCount)),
    price_available_count: strictBikeMarketNumber_(source.price_available_count) || strictBikeMarketNumber_(summary && (summary.market_price_available_count || summary.priceAvailableCount || summary.validPriceCount)),
    calculation_target_count: strictBikeMarketNumber_(source.calculation_target_count) || strictBikeMarketNumber_(summary && (summary.market_calculation_target_count || summary.calculationTargetCount)),
    min_price: strictBikeMarketNumber_(source.min_price) || strictBikeMarketNumber_(summary && (summary.market_min_price || summary.minTotalPriceYen)),
    max_price: strictBikeMarketNumber_(source.max_price) || strictBikeMarketNumber_(summary && (summary.market_max_price || summary.maxTotalPriceYen)),
    simple_average_price: strictBikeMarketNumber_(source.simple_average_price) || strictBikeMarketNumber_(summary && (summary.market_simple_average_price || summary.simpleAverageTotalPriceYen || summary.averageTotalPriceYen)),
    median_price: strictBikeMarketNumber_(source.median_price) || strictBikeMarketNumber_(summary && (summary.market_median_price || summary.medianTotalPriceYen)),
    trimmed_average_price: strictBikeMarketNumber_(source.trimmed_average_price) || strictBikeMarketNumber_(summary && (summary.market_trimmed_average_price || summary.trimmedAverageTotalPriceYen)),
    reference_market_price: strictBikeMarketNumber_(source.reference_market_price) || strictBikeMarketNumber_(summary && (summary.market_reference_price || summary.referenceMarketPriceYen)),
    used_base_price_fallback_count: strictBikeMarketNumber_(source.used_base_price_fallback_count) || strictBikeMarketNumber_(summary && summary.market_used_base_price_fallback_count),
    outlier_excluded_count: strictBikeMarketNumber_(source.outlier_excluded_count) || strictBikeMarketNumber_(summary && summary.market_outlier_excluded_count),
    outlier_excluded_prices: Array.isArray(source.outlier_excluded_prices) ? source.outlier_excluded_prices.map(strictBikeMarketNumber_).filter(function(value) { return value !== null; }) : [],
    abnormal_excluded_prices: Array.isArray(source.abnormal_excluded_prices) ? source.abnormal_excluded_prices : (Array.isArray(summary && summary.market_abnormal_excluded_prices) ? summary.market_abnormal_excluded_prices : []),
    calculation_method: String(source.calculation_method || (summary && (summary.market_calculation_method || summary.calculationMethod)) || ''),
    price_warning: String(source.price_warning || (summary && (summary.market_price_warning || summary.priceWarning)) || '')
  };
}

function getBikeMarketDisplayCandidateOptions_(summary) {
  var candidates = [];
  if (!summary) {
    return candidates;
  }
  if (Array.isArray(summary.modelCandidateOptions)) {
    candidates = candidates.concat(summary.modelCandidateOptions);
  }
  var diagnostics = summary.diagnostics && summary.diagnostics.modelDictionaryDiagnostics
    ? summary.diagnostics.modelDictionaryDiagnostics
    : summary.modelDictionaryDiagnostics;
  if (diagnostics) {
    candidates = candidates
      .concat(diagnostics.multipleInputCandidates || [])
      .concat(diagnostics.inferredModelCandidates || [])
      .concat(diagnostics.aliasCandidates || []);
  }
  var masterMatch = summary.goobikeModelMasterMatch
    || (summary.diagnostics && summary.diagnostics.goobikeModelMasterMatch);
  if (masterMatch && Array.isArray(masterMatch.candidates)) {
    candidates = candidates.concat(masterMatch.candidates.map(function(item) {
      return item.officialModelName || item;
    }));
  }
  return filterSafeBikeModelDisplayCandidates_(summary.requestedBikeName || summary.bikeName || '', candidates);
}

function filterSafeBikeModelDisplayCandidates_(bikeName, candidates) {
  var inputProfile = buildBikeModelCandidateProfile_(bikeName || '', '');
  var rows = getGoobikeModelMasterRows_();
  var analyzed = [];
  var seen = {};
  (candidates || []).forEach(function(candidate) {
    var text = trimFullWidth(String(candidate || ''));
    var key = normalizeBikeMarketKeyPart_(text);
    if (!text || !key || seen[key]) {
      return;
    }
    seen[key] = true;
    var matchingRows = rows.filter(function(row) {
      var rowKey = normalizeBikeMarketKeyPart_(row.officialModelName || row.normalizedModelName || '');
      var rowModelKey = normalizeModelName(row.officialModelName || row.normalizedModelName || '');
      var candidateModelKey = normalizeModelName(text);
      return rowKey === key || rowModelKey === candidateModelKey;
    });
    if (!matchingRows.length) {
      return;
    }
    var best = null;
    var inputKeys = buildGoobikeModelMasterInputKeys_(bikeName || text);
    matchingRows.forEach(function(row) {
      var analysis = analyzeGoobikeModelMasterCandidate_(inputProfile, inputKeys, row);
      if (!best || analysis.score > best.score) {
        best = analysis;
      }
    });
    if (best && best.showCandidate) {
      analyzed.push(best);
    }
  });
  analyzed.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.listingCount || 0) - Number(a.listingCount || 0);
  });
  return analyzed.slice(0, WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MAX).map(function(item) {
    return item.officialModelName;
  });
}

function normalizeBikeMarketResult_(response) {
  var summary = response && response.summary ? response.summary : (response || {});
  var aggregation = getBikeMarketAggregation_(summary);
  var fetchedAt = summary.fetchedAt || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var normalized = {
    status: 'success',
    market_status: 'success',
    market_reference_price: Number(aggregation.reference_market_price || 0),
    market_min_price: Number(aggregation.min_price || 0),
    market_max_price: Number(aggregation.max_price || 0),
    market_simple_average_price: Number(aggregation.simple_average_price || 0),
    market_median_price: Number(aggregation.median_price || 0),
    market_trimmed_average_price: Number(aggregation.trimmed_average_price || 0),
    market_extracted_count: Number(aggregation.extracted_count || 0),
    market_year_matched_count: Number(aggregation.year_matched_count || 0),
    market_price_available_count: Number(aggregation.price_available_count || 0),
    market_calculation_target_count: Number(aggregation.calculation_target_count || 0),
    market_calculation_method: aggregation.calculation_method || '',
    market_price_warning: aggregation.price_warning || '',
    market_error_message: '',
    market_error_code: '',
    market_fetched_at: fetchedAt,
    market_raw_json: '',
    priceAggregation: aggregation
  };
  if (!isBikeMarketNormalizedSuccess_(normalized)) {
    normalized.status = 'error';
    normalized.market_status = summary.status === 'no_data' ? 'no_data' : 'error';
    normalized.market_error_code = summary.errorCode || '';
    normalized.market_error_message = summary.errorMessage || WEBAPP_BIKE_MARKET_ERROR_SYSTEM;
  }
  summary.priceAggregation = aggregation;
  summary.market_status = normalized.market_status;
  summary.market_reference_price = normalized.market_reference_price;
  summary.market_min_price = normalized.market_min_price;
  summary.market_max_price = normalized.market_max_price;
  summary.market_simple_average_price = normalized.market_simple_average_price;
  summary.market_median_price = normalized.market_median_price;
  summary.market_trimmed_average_price = normalized.market_trimmed_average_price;
  summary.market_extracted_count = normalized.market_extracted_count;
  summary.market_year_matched_count = normalized.market_year_matched_count;
  summary.market_price_available_count = normalized.market_price_available_count;
  summary.market_calculation_target_count = normalized.market_calculation_target_count;
  summary.market_calculation_method = normalized.market_calculation_method;
  summary.market_price_warning = normalized.market_price_warning;
  summary.market_error_message = normalized.market_error_message;
  summary.market_error_code = normalized.market_error_code;
  normalized.market_raw_json = JSON.stringify(summary);
  return normalized;
}

function isBikeMarketNormalizedSuccess_(normalized) {
  return Boolean(normalized
    && Number(normalized.market_reference_price || 0) > 0
    && Number(normalized.market_min_price || 0) > 0
    && Number(normalized.market_max_price || 0) > 0
    && Number(normalized.market_price_available_count || 0) > 0);
}

function isBikeMarketAggregationSuccess_(aggregation) {
  return Boolean(aggregation
    && Number(aggregation.reference_market_price || 0) > 0
    && Number(aggregation.min_price || 0) > 0
    && Number(aggregation.max_price || 0) > 0
    && Number(aggregation.price_available_count || 0) > 0);
}

function strictBikeMarketNumber_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  var number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateBikeMarketAggregation_(aggregation) {
  var agg = aggregation || {};
  var extracted = agg.extracted_count || 0;
  var yearMatched = agg.year_matched_count || 0;
  var priceAvailable = agg.price_available_count || 0;
  var calculationTarget = agg.calculation_target_count || 0;
  if (extracted > 10000 || yearMatched > 10000 || priceAvailable > 10000 || calculationTarget > 10000) {
    return { valid: false, errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.COUNT_CONSISTENCY_ERROR, message: '相場件数が異常値です。' };
  }
  if (extracted < yearMatched || yearMatched < priceAvailable || priceAvailable < calculationTarget) {
    return { valid: false, errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.COUNT_CONSISTENCY_ERROR, message: '相場件数の整合性が崩れています。' };
  }
  var prices = [
    agg.min_price,
    agg.max_price,
    agg.simple_average_price,
    agg.median_price,
    agg.trimmed_average_price,
    agg.reference_market_price
  ];
  for (var i = 0; i < prices.length; i++) {
    if (prices[i] !== null && prices[i] !== undefined && prices[i] >= 1000000000) {
      return { valid: false, errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.PRICE_CONSISTENCY_ERROR, message: '相場価格が異常値です。' };
    }
  }
  if (priceAvailable > 0) {
    if (!agg.min_price || !agg.max_price || agg.min_price > agg.max_price) {
      return { valid: false, errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.PRICE_CONSISTENCY_ERROR, message: '最低総額と最高総額の整合性が崩れています。' };
    }
    if (!isBikeMarketPriceInsideRange_(agg.median_price, agg.min_price, agg.max_price)
      || !isBikeMarketPriceInsideRange_(agg.simple_average_price, agg.min_price, agg.max_price)
      || !isBikeMarketPriceInsideRange_(agg.reference_market_price, agg.min_price, agg.max_price)) {
      return { valid: false, errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.PRICE_CONSISTENCY_ERROR, message: '相場価格の整合性が崩れています。' };
    }
  }
  return { valid: true, errorCode: '', message: '' };
}

function isBikeMarketPriceInsideRange_(price, minPrice, maxPrice) {
  if (price === null || price === undefined || price === '') {
    return true;
  }
  return price >= minPrice && price <= maxPrice;
}

function verifySavedBikeMarketFields_(sheet, headerMap, rowNumber, aggregation) {
  var checks = [
    ['market_extracted_count', 'extracted_count'],
    ['market_year_matched_count', 'year_matched_count'],
    ['market_price_available_count', 'price_available_count'],
    ['market_calculation_target_count', 'calculation_target_count'],
    ['market_min_price', 'min_price'],
    ['market_max_price', 'max_price'],
    ['market_simple_average_price', 'simple_average_price'],
    ['market_median_price', 'median_price'],
    ['market_reference_price', 'reference_market_price']
  ];
  var mismatch = [];
  for (var i = 0; i < checks.length; i++) {
    var columnName = WEBAPP_BIKE_MARKET_FIELD_COLUMNS[checks[i][0]];
    var columnNumber = headerMap[columnName];
    if (!columnNumber) {
      mismatch.push(columnName + ':列なし');
      continue;
    }
    var actual = strictBikeMarketNumber_(sheet.getRange(rowNumber, columnNumber).getValue());
    var expected = aggregation[checks[i][1]];
    if ((actual || 0) !== (expected || 0)) {
      mismatch.push(columnName + ': expected=' + expected + ', actual=' + actual);
    }
  }
  if (mismatch.length > 0) {
    return { valid: false, message: 'FIELD_MAPPING_ERROR ' + mismatch.join(' / ') };
  }
  return { valid: true, message: '' };
}

function verifySavedBikeMarketSuccess_(sheet, headerMap, rowNumber) {
  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  var displayRow = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var aggregation = readBikeMarketAggregationFromSavedColumns_(row, displayRow, headerMap);
  var statusColumn = WEBAPP_BIKE_MARKET_FIELD_COLUMNS.market_status;
  var savedStatus = getCellByHeader_(displayRow, headerMap, statusColumn);
  if (!isBikeMarketAggregationSuccess_(aggregation)) {
    return { valid: false, message: 'FIELD_SAVE_ERROR 保存後の相場金額または価格取得件数を確認できません。' };
  }
  if (savedStatus !== 'success') {
    return { valid: false, message: 'FIELD_SAVE_ERROR market_status=' + savedStatus };
  }
  return { valid: true, message: '' };
}

function isBikeMarketCsvMissingError_(errorMessage) {
  return String(errorMessage || '').indexOf('CSVデータがまだ取り込まれていません') !== -1;
}

function isBikeMarketNoDataMessage_(errorMessage) {
  var text = String(errorMessage || '');
  if (text === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM) {
    return false;
  }
  return text === WEBAPP_BIKE_MARKET_ERROR_NO_DATA
    || text === WEBAPP_BIKE_MARKET_ERROR_NO_MATCH
    || isBikeMarketCsvMissingError_(text)
    || text.indexOf('該当する相場CSVデータが見つかりません') !== -1
    || text.indexOf('価格取得できる車両がありません') !== -1;
}

function normalizeBikeMarketDisplayError_(errorMessage) {
  var text = String(errorMessage || '');
  if (text === '') {
    return '';
  }
  if (text === WEBAPP_BIKE_MARKET_ERROR_NO_DATA || isBikeMarketCsvMissingError_(text)) {
    return WEBAPP_BIKE_MARKET_ERROR_NO_DATA;
  }
  if (text === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM || text.indexOf('車種名確認') !== -1) {
    return WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM;
  }
  if (isBikeMarketNoDataMessage_(text)) {
    return WEBAPP_BIKE_MARKET_ERROR_NO_MATCH;
  }
  return WEBAPP_BIKE_MARKET_ERROR_SYSTEM;
}

function isBikeMarketFetchedAtExpired_(fetchedAt) {
  var fetchedTime = parseDateTimeValue_(fetchedAt);
  if (!fetchedTime) {
    return false;
  }
  var thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return new Date().getTime() - fetchedTime >= thirtyDaysMs;
}

function parseDateTimeValue_(value) {
  var text = trimFullWidth(String(value || ''));
  var match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!match) {
    return 0;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  ).getTime();
}

function getBikeMarketSummaryWithCache_(bikeName, yearInput, now) {
  var normalizedYear = normalizeYearInput_(yearInput);
  var multipleCandidates = splitMultipleBikeModelInput_(bikeName);
  if (multipleCandidates.length > 1) {
    return buildBikeMarketModelConfirmSummary_(
      bikeName,
      yearInput,
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      'multiple_model_candidates',
      multipleCandidates
    );
  }
  var modelResolution = resolveGoobikeOfficialModelForInput_(bikeName);
  if (modelResolution.status === 'master_unavailable') {
    return buildBikeMarketModelConfirmSummary_(
      bikeName,
      yearInput,
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      'goobike_model_master_unavailable',
      []
    );
  }
  if (modelResolution.status === 'multiple') {
    return buildBikeMarketModelConfirmSummary_(
      bikeName,
      yearInput,
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      'goobike_model_master_multiple',
      modelResolution.candidates.map(function(item) { return item.officialModelName; })
    );
  }
  var cacheModelKey = modelResolution.status === 'resolved' ? modelResolution.normalizedModelName : normalizeBikeMarketKeyPart_(bikeName);
  var cacheKey = WEBAPP_BIKE_MARKET_CACHE_VERSION + '|' + cacheModelKey + '|' + normalizedYear.cachePart;
  var cached = getBikeMarketCache_(cacheKey, now);
  if (cached && isBikeMarketSummaryCacheable_(cached)) {
    cached.fromCache = true;
    return cached;
  }

  var summary = buildBikeMarketSummaryFromManualCsv_(bikeName, yearInput, normalizedYear, now);
  if (summary && summary.status === 'no_data') {
    summary = buildBikeMarketSummaryFromGoobike_(bikeName, yearInput, normalizedYear, now, modelResolution);
  }
  if (isBikeMarketSummaryCacheable_(summary)) {
    saveBikeMarketCache_(cacheKey, bikeName, yearInput, summary, now);
  }
  return summary;
}

function isBikeMarketSummaryCacheable_(summary) {
  return Boolean(summary
    && summary.status === 'success'
    && Number(summary.validPriceCount || 0) > 0
    && Number(summary.referenceMarketPriceYen || summary.averageTotalPriceYen || 0) > 0);
}

function buildBikeMarketSummaryFromManualCsv_(bikeName, yearInput, normalizedYear, now) {
  var fetchedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var sheet = getOrCreateBikeMarketSheet_();
  var listings = [];
  if (sheet.getLastRow() <= 1) {
    return buildEmptyBikeMarketSummary_(bikeName, yearInput, fetchedAt, WEBAPP_BIKE_MARKET_ERROR_NO_DATA, 'not_registered');
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MARKET_CSV_COLUMNS.length).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var listingName = row[1];
    var listingYear = parseBikeMarketYearNumber_(row[2]);
    if (!isBikeNameMatched_(bikeName, listingName)) {
      continue;
    }
    if (!isYearMatched_(listingYear, normalizedYear)) {
      continue;
    }

    listings.push({
      source: row[0] || 'manual',
      title: listingName,
      modelName: listingName,
      year: listingYear,
      basePriceYen: parsePriceToYen_(row[4]),
      totalPriceYen: parsePriceToYen_(row[3]),
      mileageKm: parseYenNumber_(row[5]),
      shopName: row[6] || '',
      prefecture: row[7] || '',
      url: row[8] || '',
      fetchedAt: fetchedAt
    });
  }

  listings = dedupeBikeListings_(listings);
  return summarizeBikeListings_(bikeName, yearInput, listings, fetchedAt);
}

function buildEmptyBikeMarketSummary_(bikeName, yearInput, fetchedAt, errorMessage, noDataReason, errorCode) {
  return {
    bikeName: bikeName,
    yearInput: yearInput || '',
    sources: ['manual'],
    listingCount: 0,
    validPriceCount: 0,
    extractedCount: 0,
    yearMatchedCount: 0,
    priceAvailableCount: 0,
    calculationTargetCount: 0,
    minTotalPriceYen: null,
    maxTotalPriceYen: null,
    averageTotalPriceYen: null,
    simpleAverageTotalPriceYen: null,
    medianTotalPriceYen: null,
    trimmedAverageTotalPriceYen: null,
    referenceMarketPriceYen: null,
    usedBasePriceFallbackCount: 0,
    outlierExcludedCount: 0,
    outlierExcludedPrices: [],
    calculationMethod: '',
    market_min_price: null,
    market_max_price: null,
    market_simple_average_price: null,
    market_median_price: null,
    market_trimmed_average_price: null,
    market_reference_price: null,
    market_extracted_count: 0,
    market_year_matched_count: 0,
    market_price_available_count: 0,
    market_calculation_target_count: 0,
    market_used_base_price_fallback_count: 0,
    market_outlier_excluded_count: 0,
    market_outlier_excluded_prices: [],
    market_calculation_method: '',
    priceAggregation: {
      extracted_count: 0,
      year_matched_count: 0,
      price_available_count: 0,
      calculation_target_count: 0,
      min_price: null,
      max_price: null,
      simple_average_price: null,
      median_price: null,
      trimmed_average_price: null,
      reference_market_price: null,
      used_base_price_fallback_count: 0,
      outlier_excluded_count: 0,
      outlier_excluded_prices: [],
      calculation_method: ''
    },
    listings: [],
    warnings: ['登録済み相場データから算出します。外部サイトの自動取得は無効です。'],
    errorMessage: errorMessage,
    errorCode: errorCode || '',
    status: 'no_data',
    noDataReason: noDataReason || 'no_match',
    fetchedAt: fetchedAt
  };
}

function buildBikeMarketSummaryFromGoobike_(bikeName, yearInput, normalizedYear, now, modelResolution) {
  var diagnosis = runBikeMarketExternalDiagnosisForInput_(bikeName, yearInput, normalizedYear, now, modelResolution);
  if (diagnosis.summary && diagnosis.summary.status === 'success') {
    diagnosis.summary.diagnostics = compactBikeMarketDiagnostics_(diagnosis);
    return diagnosis.summary;
  }

  var fetchedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var errorCode = diagnosis.errorCode || WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR;
  var noDataCodes = [
    WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_FORBIDDEN,
    WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_NOT_FOUND,
    WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_EMPTY,
    WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_BLOCKED,
    WEBAPP_BIKE_MARKET_ERROR_CODES.PARSE_NO_LISTINGS,
    WEBAPP_BIKE_MARKET_ERROR_CODES.PARSE_NO_PRICE,
    WEBAPP_BIKE_MARKET_ERROR_CODES.NO_YEAR_MATCH,
    WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH
  ];
  if (noDataCodes.indexOf(errorCode) !== -1) {
    var errorMessage = shouldAskBikeModelConfirmation_(bikeName, diagnosis) ? WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM : WEBAPP_BIKE_MARKET_ERROR_NO_MATCH;
    var noDataReason = errorMessage === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM ? 'model_confirmation_required' : (diagnosis.noDataReason || 'no_match');
    var emptySummary = buildGoobikeEmptySummary_(bikeName, yearInput, fetchedAt, errorMessage, noDataReason, errorCode);
    emptySummary.diagnostics = compactBikeMarketDiagnostics_(diagnosis);
    if (errorCode === WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_FORBIDDEN || errorCode === WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_BLOCKED) {
      emptySummary.warnings = ['外部サイト取得不可: Google Apps ScriptサーバーからGooBike検索結果を取得できません。'];
    }
    return emptySummary;
  }

  var errorSummary = buildBikeMarketSystemErrorSummary_(bikeName, yearInput, fetchedAt, diagnosis.errorMessage, errorCode, diagnosis.stack);
  errorSummary.diagnostics = compactBikeMarketDiagnostics_(diagnosis);
  return errorSummary;
}

function buildGoobikeEmptySummary_(bikeName, yearInput, fetchedAt, errorMessage, noDataReason, errorCode) {
  var summary = buildEmptyBikeMarketSummary_(bikeName, yearInput, fetchedAt, errorMessage, noDataReason, errorCode);
  summary.sources = [WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE];
  summary.warnings = ['GooBike検索結果から相場を確認しています。'];
  return summary;
}

function buildBikeMarketModelConfirmSummary_(bikeName, yearInput, fetchedAt, noDataReason, candidates) {
  var resolution = resolveGoobikeOfficialModelForInput_(bikeName || '');
  var summary = buildEmptyBikeMarketSummary_(
    bikeName,
    yearInput,
    fetchedAt,
    WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM,
    noDataReason || 'model_confirmation_required',
    WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH
  );
  summary.sources = [WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE];
  summary.modelCandidateOptions = filterSafeBikeModelDisplayCandidates_(bikeName || '', candidates || []);
  summary.goobikeModelMasterMatch = resolution;
  summary.diagnostics = {
    modelDictionaryDiagnostics: {
      inputBikeName: bikeName || '',
      normalizedInput: normalizeBikeMarketKeyPart_(bikeName || ''),
      inferredModelCandidates: summary.modelCandidateOptions,
      aliasCandidates: summary.modelCandidateOptions,
      excludeCandidates: [],
      resultModelNames: [],
      candidateScoreDiagnostics: resolution.candidateDiagnostics || []
    }
  };
  summary.warnings = noDataReason === 'goobike_model_master_unavailable'
    ? ['GooBike車種マスタが未更新です。管理者画面でGooBike車種マスタを更新してください。']
    : ['複数の車種候補があります。どれか1つを選んで再検索してください。'];
  return summary;
}

function buildBikeMarketSystemErrorSummary_(bikeName, yearInput, fetchedAt, rawMessage, errorCode, stack) {
  if (rawMessage) {
    console.warn('Bike market fetch failed: ' + rawMessage);
  }
  return {
    bikeName: bikeName,
    yearInput: yearInput || '',
    sources: [WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE],
    listingCount: 0,
    validPriceCount: 0,
    extractedCount: 0,
    yearMatchedCount: 0,
    priceAvailableCount: 0,
    calculationTargetCount: 0,
    minTotalPriceYen: null,
    maxTotalPriceYen: null,
    averageTotalPriceYen: null,
    simpleAverageTotalPriceYen: null,
    medianTotalPriceYen: null,
    trimmedAverageTotalPriceYen: null,
    referenceMarketPriceYen: null,
    usedBasePriceFallbackCount: 0,
    outlierExcludedCount: 0,
    outlierExcludedPrices: [],
    calculationMethod: '',
    market_min_price: null,
    market_max_price: null,
    market_simple_average_price: null,
    market_median_price: null,
    market_trimmed_average_price: null,
    market_reference_price: null,
    market_extracted_count: 0,
    market_year_matched_count: 0,
    market_price_available_count: 0,
    market_calculation_target_count: 0,
    market_used_base_price_fallback_count: 0,
    market_outlier_excluded_count: 0,
    market_outlier_excluded_prices: [],
    market_calculation_method: '',
    priceAggregation: {
      extracted_count: 0,
      year_matched_count: 0,
      price_available_count: 0,
      calculation_target_count: 0,
      min_price: null,
      max_price: null,
      simple_average_price: null,
      median_price: null,
      trimmed_average_price: null,
      reference_market_price: null,
      used_base_price_fallback_count: 0,
      outlier_excluded_count: 0,
      outlier_excluded_prices: [],
      calculation_method: ''
    },
    listings: [],
    warnings: rawMessage ? [rawMessage] : [],
    errorMessage: WEBAPP_BIKE_MARKET_ERROR_SYSTEM,
    errorCode: errorCode || WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR,
    status: 'error',
    noDataReason: 'fetch_error',
    fetchedAt: fetchedAt,
    stack: stack || ''
  };
}

function debugBikeMarketFetchForAdmin(bikeName, yearInput, auth) {
  assertMarketAdminPasscode_(auth);
  var now = new Date();
  var normalizedYear = normalizeYearInput_(yearInput || '');
  var result = runBikeMarketExternalDiagnosisForInput_(bikeName || '', yearInput || '', normalizedYear, now);
  result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', result.parsedListings || []);
  return result;
}

function debugBikeMarketMatchingForAdmin(bikeName, yearInput, auth) {
  assertMarketAdminPasscode_(auth);
  var now = new Date();
  var normalizedYear = normalizeYearInput_(yearInput || '');
  var manualSummary = buildBikeMarketSummaryFromManualCsv_(bikeName || '', yearInput || '', normalizedYear, now);
  var externalDiagnosis = runBikeMarketExternalDiagnosisForInput_(bikeName || '', yearInput || '', normalizedYear, now);
  externalDiagnosis.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', externalDiagnosis.parsedListings || []);
  return {
    executedAt: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    inputBikeName: bikeName || '',
    inputYear: yearInput || '',
    normalizedBikeName: normalizeBikeMarketKeyPart_(bikeName || ''),
    normalizedYear: normalizedYear.cachePart,
    modelDictionaryDiagnostics: buildBikeModelDictionaryDiagnostics_(bikeName || '', externalDiagnosis.parsedListings || []),
    registeredMarketSummary: manualSummary,
    goBikeDiagnosis: externalDiagnosis
  };
}

function runBikeMarketExternalDiagnosisForInput_(bikeName, yearInput, normalizedYear, now, modelResolution) {
  var resolution = modelResolution || resolveGoobikeOfficialModelForInput_(bikeName || '');
  var fetchedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  if (resolution.status === 'master_unavailable') {
    return {
      inputBikeName: bikeName || '',
      inputYear: yearInput || '',
      normalizedBikeName: normalizeBikeMarketKeyPart_(bikeName || ''),
      normalizedYear: normalizedYear.cachePart,
      usedGoobikeOfficialModelName: '',
      goobikeModelMasterMatch: resolution,
      searchUrls: [],
      fetchResults: [],
      parsedListings: [],
      matchedListings: [],
      extractionStats: {},
      summary: buildBikeMarketModelConfirmSummary_(bikeName || '', yearInput || '', fetchedAt, 'goobike_model_master_unavailable', []),
      errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH,
      errorMessage: WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM,
      stack: '',
      finalJudgement: 'MODEL_CONFIRM',
      noDataReason: 'goobike_model_master_unavailable',
      modelDictionaryDiagnostics: buildBikeModelDictionaryDiagnostics_(bikeName || '', [])
    };
  }
  if (resolution.status === 'multiple') {
    var candidates = resolution.candidates.map(function(item) { return item.officialModelName; });
    return {
      inputBikeName: bikeName || '',
      inputYear: yearInput || '',
      normalizedBikeName: normalizeBikeMarketKeyPart_(bikeName || ''),
      normalizedYear: normalizedYear.cachePart,
      usedGoobikeOfficialModelName: '',
      goobikeModelMasterMatch: resolution,
      searchUrls: [],
      fetchResults: [],
      parsedListings: [],
      matchedListings: [],
      extractionStats: {},
      summary: buildBikeMarketModelConfirmSummary_(bikeName || '', yearInput || '', fetchedAt, 'goobike_model_master_multiple', candidates),
      errorCode: WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH,
      errorMessage: WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM,
      stack: '',
      finalJudgement: 'MODEL_CONFIRM',
      noDataReason: 'goobike_model_master_multiple',
      modelDictionaryDiagnostics: buildBikeModelDictionaryDiagnostics_(bikeName || '', [])
    };
  }
  var searchBikeName = resolution.status === 'resolved' ? resolution.officialModelName : (bikeName || '');
  var result = runBikeMarketExternalDiagnosis_(searchBikeName, yearInput, normalizedYear, now);
  result.inputBikeName = bikeName || '';
  result.normalizedBikeName = normalizeBikeMarketKeyPart_(bikeName || '');
  result.usedGoobikeOfficialModelName = resolution.status === 'resolved' ? resolution.officialModelName : '';
  result.goobikeModelMasterMatch = resolution;
  result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', result.parsedListings || []);
  if (result.summary) {
    result.summary.requestedBikeName = bikeName || '';
    result.summary.goobikeOfficialModelName = result.usedGoobikeOfficialModelName || '';
    result.summary.goobikeModelMasterMatch = resolution;
    if (result.summary.diagnostics) {
      result.summary.diagnostics.modelDictionaryDiagnostics = result.modelDictionaryDiagnostics;
    }
  }
  return result;
}

function runBikeMarketExternalDiagnosis_(bikeName, yearInput, normalizedYear, now) {
  var fetchedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var urls = buildGoobikeDiagnosisUrls_(bikeName, normalizedYear);
  var result = {
    inputBikeName: bikeName || '',
    inputYear: yearInput || '',
    normalizedBikeName: normalizeBikeMarketKeyPart_(bikeName || ''),
    normalizedYear: normalizedYear.cachePart,
    searchUrls: urls,
    fetchResults: [],
    parsedListings: [],
    matchedListings: [],
    extractionStats: {},
    summary: null,
    errorCode: '',
    errorMessage: '',
    stack: '',
    finalJudgement: '',
    noDataReason: ''
  };
  result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', []);

  if (!bikeName) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH;
    result.errorMessage = '車種名が未入力です。';
    result.noDataReason = 'missing_bike_name';
    result.finalJudgement = 'NO_MODEL_MATCH';
    result.summary = buildGoobikeEmptySummary_(bikeName, yearInput, fetchedAt, WEBAPP_BIKE_MARKET_ERROR_NO_MATCH, result.noDataReason, result.errorCode);
    result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', result.parsedListings || []);
    return result;
  }
  if (!urls.length) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH;
    result.errorMessage = 'GooBike検索URLを作成できませんでした。';
    result.noDataReason = 'no_goobike_url';
    result.finalJudgement = 'NO_MODEL_MATCH';
    result.summary = buildGoobikeEmptySummary_(bikeName, yearInput, fetchedAt, WEBAPP_BIKE_MARKET_ERROR_NO_MATCH, result.noDataReason, result.errorCode);
    result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', result.parsedListings || []);
    return result;
  }

  var allListings = [];
  var allParsedListings = [];
  var allMatchedListings = [];
  var firstErrorCode = '';
  var firstErrorMessage = '';
  var firstStack = '';
  var fetchedOkCount = 0;
  var totalDetailUrlCount = 0;

  for (var i = 0; i < urls.length; i++) {
    var fetchResult = fetchGoobikeUrlForDiagnosis_(urls[i], bikeName);
    result.fetchResults.push(sanitizeGoobikeFetchResult_(fetchResult));
    totalDetailUrlCount += Number(fetchResult.detailUrlCount || 0);
    if (fetchResult.errorCode) {
      if (!firstErrorCode) {
        firstErrorCode = fetchResult.errorCode;
        firstErrorMessage = fetchResult.errorMessage || '';
        firstStack = fetchResult.stack || '';
      }
      continue;
    }

    fetchedOkCount++;
    var inspected = inspectGoobikeListings_(fetchResult.content || '', bikeName, normalizedYear, fetchedAt);
    allParsedListings = allParsedListings.concat(inspected.parsedListings);
    allMatchedListings = allMatchedListings.concat(inspected.matchedListings);
    allListings = allListings.concat(inspected.priceListings);
  }

  var mergedListingCount = allListings.length;
  allParsedListings = dedupeBikeParsedListings_(allParsedListings);
  allMatchedListings = dedupeBikeParsedListings_(allMatchedListings);
  result.parsedListings = allParsedListings;
  result.matchedListings = allMatchedListings;
  allListings = dedupeBikeListings_(allListings);
  if (normalizedYear && normalizedYear.unspecified) {
    allListings.sort(function(a, b) {
      return Number(b.year || 0) - Number(a.year || 0);
    });
  }
  result.extractionStats = buildGoobikeExtractionStats_(result.fetchResults, allParsedListings, allMatchedListings, allListings, mergedListingCount);
  result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', allParsedListings);
  if (allListings.length > 0) {
    var summary = summarizeBikeListings_(bikeName, yearInput, allListings, fetchedAt, {
      extractedCount: allParsedListings.length,
      yearMatchedCount: allMatchedListings.length
    });
    if (summary.status === 'success') {
      summary.sources = [WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE];
      summary.errorCode = '';
      result.summary = summary;
      result.finalJudgement = 'SUCCESS';
      return result;
    }
  }

  var modelMatchCount = 0;
  var yearMatchCount = 0;
  var priceCount = 0;
  for (var p = 0; p < allParsedListings.length; p++) {
    if (allParsedListings[p].modelMatched) modelMatchCount++;
    if (allParsedListings[p].yearMatched) yearMatchCount++;
    if (allParsedListings[p].priceAvailable) priceCount++;
  }

  if (fetchedOkCount === 0) {
    result.errorCode = firstErrorCode || WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR;
    result.errorMessage = firstErrorMessage || 'GooBike検索結果を取得できませんでした。';
    result.stack = firstStack || '';
    result.noDataReason = 'fetch_unavailable';
  } else if (totalDetailUrlCount === 0 || allParsedListings.length === 0) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.PARSE_NO_LISTINGS;
    result.errorMessage = 'HTMLは取得できましたが車両候補を抽出できませんでした。';
    result.noDataReason = 'parse_no_listings';
  } else if (modelMatchCount === 0) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.NO_MODEL_MATCH;
    result.errorMessage = '検索結果はありますが車種が一致しませんでした。';
    result.noDataReason = 'no_model_match';
  } else if (yearMatchCount === 0) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.NO_YEAR_MATCH;
    result.errorMessage = '車種候補はありますが年式が一致しませんでした。';
    result.noDataReason = 'no_year_match';
  } else if (priceCount === 0) {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.PARSE_NO_PRICE;
    result.errorMessage = '車両候補はありますが価格を抽出できませんでした。';
    result.noDataReason = 'parse_no_price';
  } else {
    result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR;
    result.errorMessage = '相場取得診断で未分類の失敗が発生しました。';
    result.noDataReason = 'unknown';
  }
  result.finalJudgement = result.errorCode;
  var finalErrorMessage = shouldAskBikeModelConfirmation_(bikeName, result) ? WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM : WEBAPP_BIKE_MARKET_ERROR_NO_MATCH;
  var finalNoDataReason = finalErrorMessage === WEBAPP_BIKE_MARKET_ERROR_MODEL_CONFIRM ? 'model_confirmation_required' : result.noDataReason;
  result.summary = buildGoobikeEmptySummary_(bikeName, yearInput, fetchedAt, finalErrorMessage, finalNoDataReason, result.errorCode);
  result.modelDictionaryDiagnostics = buildBikeModelDictionaryDiagnostics_(bikeName || '', result.parsedListings || []);
  return result;
}

function buildGoobikeDiagnosisUrls_(bikeName, normalizedYear) {
  var urls = [];
  var directSearchIds = getDirectGoobikeSearchIds_(bikeName);
  if (directSearchIds) {
    urls.push(buildGoobikeSearchResultUrl_(directSearchIds, normalizedYear));
  }
  urls = urls.concat(buildGoobikeSearchUrlCandidates_(bikeName, normalizedYear));
  urls = urls.concat(buildGoobikeUrlCandidates_(bikeName));
  var expanded = [];
  urls.forEach(function(url) {
    expanded = expanded.concat(getGoobikeFetchUrls_(url));
  });
  var seen = {};
  return expanded.filter(function(url) {
    if (!url || seen[url]) {
      return false;
    }
    seen[url] = true;
    return true;
  });
}

function buildGoobikeExtractionStats_(fetchResults, parsedListings, matchedListings, priceListings, mergedListingCount) {
  var displayedCount = 0;
  var detailUrlCount = 0;
  for (var i = 0; i < (fetchResults || []).length; i++) {
    displayedCount = Math.max(displayedCount, Number(fetchResults[i].displayedCount || 0));
    detailUrlCount = Math.max(detailUrlCount, Number(fetchResults[i].detailUrlCount || 0));
  }
  var listCardCount = 0;
  var listPriceCount = 0;
  var detailPriceCount = 0;
  for (var p = 0; p < (parsedListings || []).length; p++) {
    if (parsedListings[p].extractionSource === 'list') {
      listCardCount++;
      if (parsedListings[p].selectedPriceYen) {
        listPriceCount++;
      }
    } else if (parsedListings[p].extractionSource === 'detail' && parsedListings[p].selectedPriceYen) {
      detailPriceCount++;
    }
  }
  return {
    displayedCount: displayedCount,
    detailUrlCount: detailUrlCount,
    listCardCount: listCardCount,
    listPriceCount: listPriceCount,
    detailPriceCount: detailPriceCount,
    mergedListingCount: mergedListingCount || 0,
    dedupedListingCount: priceListings ? priceListings.length : 0,
    modelMatchedCount: parsedListings ? parsedListings.filter(function(item) { return item.modelMatched; }).length : 0,
    yearMatchedCount: matchedListings ? matchedListings.length : 0,
    selectedPriceCount: priceListings ? priceListings.filter(function(item) { return item.selectedPriceYen; }).length : 0
  };
}

function fetchGoobikeUrlForDiagnosis_(url, bikeName) {
  var startedAt = new Date();
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    var code = response.getResponseCode();
    var text = decodeGoobikeResponse_(response);
    var blockedReason = detectGoobikeBlockedReason_(text, code);
    var result = {
      url: url,
      statusCode: code,
      contentLength: String(text || '').length,
      contentSample: String(text || '').slice(0, 500),
      containsBikeName: containsBikeNameInGoobikeText_(text, bikeName),
      containsPriceText: containsGoobikePriceText_(text),
      detailUrlCount: countGoobikeDetailUrls_(text),
      displayedCount: extractGoobikeDisplayedCount_(text),
      blockedReason: blockedReason,
      elapsedMs: new Date().getTime() - startedAt.getTime(),
      errorCode: '',
      errorMessage: '',
      stack: '',
      content: text
    };
    if (code === 403 || code === 401) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_FORBIDDEN;
      result.errorMessage = 'GooBike取得 HTTP ' + code;
    } else if (code === 404) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_NOT_FOUND;
      result.errorMessage = 'GooBike取得 HTTP 404';
    } else if (code < 200 || code >= 300) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR;
      result.errorMessage = 'GooBike取得 HTTP ' + code;
    } else if (!text || result.contentLength < WEBAPP_BIKE_MARKET_MIN_HTML_LENGTH) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_EMPTY;
      result.errorMessage = 'HTML本文が短すぎます。length=' + result.contentLength;
    } else if (blockedReason && !isUsableGoobikeListingPage_(result)) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_BLOCKED;
      result.errorMessage = blockedReason;
    } else if (!result.containsBikeName && !result.containsPriceText) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_EMPTY;
      result.errorMessage = '車種名または価格らしき文字列がHTML内に見つかりません。';
    } else if (result.detailUrlCount === 0) {
      result.errorCode = WEBAPP_BIKE_MARKET_ERROR_CODES.PARSE_NO_LISTINGS;
      result.errorMessage = '車両詳細URLを抽出できません。';
    }
    return result;
  } catch (error) {
    return {
      url: url,
      statusCode: '',
      contentLength: 0,
      contentSample: '',
      containsBikeName: false,
      containsPriceText: false,
      detailUrlCount: 0,
      displayedCount: 0,
      blockedReason: '',
      elapsedMs: new Date().getTime() - startedAt.getTime(),
      errorCode: classifyBikeMarketFetchException_(error),
      errorMessage: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : '',
      content: ''
    };
  }
}

function isUsableGoobikeListingPage_(fetchResult) {
  return Boolean(fetchResult
    && Number(fetchResult.statusCode || 0) >= 200
    && Number(fetchResult.statusCode || 0) < 300
    && Number(fetchResult.contentLength || 0) >= WEBAPP_BIKE_MARKET_MIN_HTML_LENGTH
    && Number(fetchResult.detailUrlCount || 0) > 0
    && fetchResult.containsBikeName
    && fetchResult.containsPriceText);
}

function sanitizeGoobikeFetchResult_(fetchResult) {
  return {
    url: fetchResult.url,
    statusCode: fetchResult.statusCode,
    contentLength: fetchResult.contentLength,
    contentSample: fetchResult.contentSample,
    containsBikeName: fetchResult.containsBikeName,
    containsPriceText: fetchResult.containsPriceText,
    detailUrlCount: fetchResult.detailUrlCount,
    displayedCount: fetchResult.displayedCount || 0,
    blockedReason: fetchResult.blockedReason,
    elapsedMs: fetchResult.elapsedMs,
    errorCode: fetchResult.errorCode,
    errorMessage: fetchResult.errorMessage,
    stack: fetchResult.stack
  };
}

function compactBikeMarketDiagnostics_(diagnosis) {
  if (!diagnosis) {
    return null;
  }
  return {
    normalizedBikeName: diagnosis.normalizedBikeName,
    normalizedYear: diagnosis.normalizedYear,
    usedGoobikeOfficialModelName: diagnosis.usedGoobikeOfficialModelName || '',
    goobikeModelMasterMatch: diagnosis.goobikeModelMasterMatch || null,
    searchUrls: diagnosis.searchUrls,
    fetchResults: diagnosis.fetchResults,
    parsedCount: diagnosis.parsedListings ? diagnosis.parsedListings.length : 0,
    matchedCount: diagnosis.matchedListings ? diagnosis.matchedListings.length : 0,
    extractionStats: diagnosis.extractionStats || {},
    modelDictionaryDiagnostics: diagnosis.modelDictionaryDiagnostics || null,
    priceAggregation: diagnosis.summary && diagnosis.summary.priceAggregation ? diagnosis.summary.priceAggregation : null,
    errorCode: diagnosis.errorCode || '',
    errorMessage: diagnosis.errorMessage || '',
    finalJudgement: diagnosis.finalJudgement || ''
  };
}

function inspectGoobikeListings_(html, bikeName, normalizedYear, fetchedAt) {
  var blocks = splitGoobikeListingBlocks_(html);
  var parsedListings = [];
  var matchedListings = [];
  var priceListings = [];
  var detailCache = {};
  var parsedUrlMap = {};
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var title = extractGoobikeListingTitle_(block);
    var years = extractGoobikeListingYears_(block);
    var titleModelYear = extractGoobikeTitleModelYear_(block);
    var prices = extractGoobikeListingPrices_(block);
    var stockUrl = extractGoobikeListingUrl_(block);
    var cardValidation = validateGoobikeListingCard_(block, title);
    var modelMatch = getBikeMarketModelMatchInfo_(bikeName, title);
    var modelMatched = modelMatch.matched;
    var detailYearError = '';
    if (modelMatched && years.length === 0 && stockUrl) {
      var detailResult = extractGoobikeDetailYears_(stockUrl, detailCache);
      years = detailResult.years;
      detailYearError = detailResult.errorMessage || '';
    }
    var yearMatched = modelMatched && isAnyGoobikeYearMatched_(years, normalizedYear);
    var yearMatchReason = getBikeMarketYearMatchReason_(years, normalizedYear, yearMatched);
    var priceAvailable = Boolean(prices.selectedPriceYen);
    var cardBoundaryTreatment = getBikeMarketCardBoundaryTreatment_(cardValidation, title, prices, modelMatched, yearMatched);
    var cardBoundaryExplanation = getBikeMarketCardBoundaryExplanation_(cardValidation, cardBoundaryTreatment);
    var exclusionReason = getBikeMarketListingExclusionReason_(cardValidation, cardBoundaryTreatment, modelMatch, yearMatched, prices);
    var parsed = {
      title: title,
      normalizedTitle: modelMatch.normalizedTitle,
      normalizedInputBikeName: modelMatch.normalizedInput,
      modelCanonicalKey: modelMatch.canonicalKey || '',
      titleValidationResult: cardValidation.titleValidationResult,
      cardBoundaryResult: cardValidation.cardBoundaryResult,
      cardBoundaryTreatment: cardBoundaryTreatment,
      cardBoundarySeverity: cardBoundaryExplanation.severity,
      cardBoundaryMessage: cardBoundaryExplanation.message,
      years: years,
      titleModelYear: titleModelYear,
      basePriceYen: prices.basePriceYen,
      totalPriceYen: prices.totalPriceYen,
      vehiclePriceYen: prices.vehiclePriceYen,
      warrantyTotalPriceYen: prices.warrantyTotalPriceYen,
      selectedPriceYen: prices.selectedPriceYen,
      selectedPriceReason: prices.selectedPriceReason,
      priceMissingReason: prices.priceMissingReason,
      priceValidationResult: prices.priceValidationResult,
      cardDebug: prices.cardDebug,
      url: stockUrl,
      extractionSource: 'list',
      modelMatched: modelMatched,
      modelMatchReason: modelMatch.reason,
      zx4rrExcluded: modelMatch.zx4rrExcluded,
      yearMatched: yearMatched,
      yearMatchReason: yearMatchReason,
      priceAvailable: priceAvailable,
      exclusionReason: exclusionReason || (modelMatched && !yearMatched ? '年式不一致' : ''),
      calculationTarget: !exclusionReason && yearMatched && Boolean(prices.selectedPriceYen),
      detailYearError: detailYearError
    };
    parsedListings.push(parsed);
    if (stockUrl) {
      parsedUrlMap[normalizeGoobikeDetailUrl_(stockUrl)] = true;
    }
    if (yearMatched) {
      matchedListings.push(parsed);
      priceListings.push({
        source: WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE,
        title: title,
        modelName: title,
        year: years.length ? years[0] : null,
        titleModelYear: titleModelYear,
        basePriceYen: prices.basePriceYen,
        totalPriceYen: prices.totalPriceYen,
        vehiclePriceYen: prices.vehiclePriceYen,
        warrantyTotalPriceYen: prices.warrantyTotalPriceYen,
        selectedPriceYen: prices.selectedPriceYen,
        selectedPriceReason: prices.selectedPriceReason,
        priceMissingReason: prices.priceMissingReason,
        priceValidationResult: prices.priceValidationResult,
        cardBoundaryTreatment: cardBoundaryTreatment,
        cardBoundarySeverity: cardBoundaryExplanation.severity,
        cardBoundaryMessage: cardBoundaryExplanation.message,
        modelMatchReason: modelMatch.reason,
        yearMatchReason: yearMatchReason,
        cardDebug: prices.cardDebug,
        mileageKm: parseGoobikeMileageKm_(block),
        extractionSource: 'list',
        shopName: extractGoobikeShopName_(block),
        prefecture: '',
        url: stockUrl,
        fetchedAt: fetchedAt
      });
    }
  }
  var detailListings = inspectGoobikeDetailListings_(html, bikeName, normalizedYear, fetchedAt, detailCache, parsedUrlMap);
  parsedListings = parsedListings.concat(detailListings.parsedListings);
  matchedListings = matchedListings.concat(detailListings.matchedListings);
  priceListings = priceListings.concat(detailListings.priceListings);
  return {
    parsedListings: parsedListings,
    matchedListings: matchedListings,
    priceListings: priceListings
  };
}

function containsBikeNameInGoobikeText_(html, bikeName) {
  var text = normalizeBikeMarketKeyPart_(htmlToText_(html));
  var bikeKey = normalizeBikeMarketKeyPart_(bikeName);
  return Boolean(bikeKey && text.indexOf(bikeKey) !== -1);
}

function containsGoobikePriceText_(html) {
  var text = toHalfWidthText_(htmlToText_(html));
  return /車両価格|支払総額|[0-9]+(?:\.[0-9]+)?\s*万円/.test(text);
}

function countGoobikeDetailUrls_(html) {
  return extractGoobikeListingDetailUrls_(html).length;
}

function extractGoobikeDisplayedCount_(html) {
  var text = toHalfWidthText_(htmlToText_(html)).replace(/\s+/g, ' ');
  var patterns = [
    /([0-9,]+)\s*件がヒット/i,
    /([0-9,]+)\s*件\s*中\s*[0-9,]+/i,
    /検索結果[^0-9]*([0-9,]+)\s*件/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match) {
      return Number(String(match[1]).replace(/,/g, '')) || 0;
    }
  }
  return 0;
}

function detectGoobikeBlockedReason_(html, statusCode) {
  var text = toHalfWidthText_(htmlToText_(html)).toLowerCase();
  if (statusCode === 403 || statusCode === 401) {
    return 'HTTP ' + statusCode + ' forbidden';
  }
  var patterns = [
    { regex: /captcha|recaptcha/, label: 'CAPTCHA page' },
    { regex: /access denied|forbidden|permission denied/, label: 'access denied page' },
    { regex: /bot|robot|automated access/, label: 'bot detection page' },
    { regex: /security|セキュリティ|アクセス制限|アクセスが制限|不正なアクセス|ロボット/, label: 'security or access restriction page' }
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].regex.test(text)) {
      return patterns[i].label;
    }
  }
  return '';
}

function classifyBikeMarketFetchException_(error) {
  var message = String(error && error.message ? error.message : error || '').toLowerCase();
  if (/authorization|permission|権限|承認/.test(message)) {
    return WEBAPP_BIKE_MARKET_ERROR_CODES.AUTH_REQUIRED;
  }
  if (/timed out|timeout|タイムアウト/.test(message)) {
    return WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_TIMEOUT;
  }
  if (/403|forbidden/.test(message)) {
    return WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_FORBIDDEN;
  }
  if (/404|not found/.test(message)) {
    return WEBAPP_BIKE_MARKET_ERROR_CODES.FETCH_NOT_FOUND;
  }
  return WEBAPP_BIKE_MARKET_ERROR_CODES.SYSTEM_ERROR;
}

function buildGoobikeUrlCandidates_(bikeName) {
  var candidates = [];
  var key = normalizeBikeMarketKeyPart_(bikeName);
  var directMap = {
    s1000r: { maker: 'bmw', model: 's1000r' },
    s1000rr: { maker: 'bmw', model: 's1000rr' },
    r1250gs: { maker: 'bmw', model: 'r1250gs' },
    r1200gs: { maker: 'bmw', model: 'r1200gs' }
  };
  if (directMap[key]) {
    candidates = candidates.concat(buildGoobikeModelUrlCandidates_(directMap[key].maker, directMap[key].model));
  }

  var maker = detectGoobikeMaker_(bikeName);
  var modelSlug = normalizeGoobikeModelSlug_(bikeName, maker);
  if (maker && modelSlug) {
    candidates = candidates.concat(buildGoobikeModelUrlCandidates_(maker.slug, modelSlug));
  }

  var seen = {};
  return candidates.filter(function(url) {
    if (seen[url]) {
      return false;
    }
    seen[url] = true;
    return true;
  });
}

function buildGoobikeSearchUrlCandidates_(bikeName, normalizedYear) {
  var phrases = getBikeModelSearchPhrases_(bikeName);
  if (!phrases.length) {
    return [];
  }

  var candidates = [];
  for (var p = 0; p < phrases.length; p++) {
    var normalizedName = normalizeGoobikeSearchPhrase_(phrases[p]);
    if (!normalizedName) {
      continue;
    }
    candidates.push(buildGoobikeFreeSearchUrl_(normalizedName, normalizedYear));
    var spacedModelName = expandGoobikeSearchPhraseVariants_(normalizedName);
    for (var v = 0; v < spacedModelName.length; v++) {
      if (spacedModelName[v] && spacedModelName[v] !== normalizedName) {
        candidates.push(buildGoobikeFreeSearchUrl_(spacedModelName[v], normalizedYear));
      }
    }

    var maker = detectGoobikeMaker_(phrases[p]);
    if (maker) {
      var withoutMaker = normalizeGoobikeSearchPhrase_(removeKnownGoobikeMakerName_(phrases[p], maker));
      if (withoutMaker && withoutMaker !== normalizedName) {
        candidates.push(buildGoobikeFreeSearchUrl_(withoutMaker, normalizedYear));
      }
    }

    var compactName = normalizedName.replace(/\s+/g, '');
    if (compactName && compactName !== normalizedName) {
      candidates.push(buildGoobikeFreeSearchUrl_(compactName, normalizedYear));
    }
  }

  var seen = {};
  return candidates.filter(function(url) {
    if (!url || seen[url]) {
      return false;
    }
    seen[url] = true;
    return true;
  });
}

function buildGoobikeFreeSearchUrl_(phrase, normalizedYear) {
  var payload = {
    category: 'USDN',
    phrase: phrase,
    query: phrase,
    limit: '30'
  };
  if (normalizedYear && normalizedYear.valid && !normalizedYear.unspecified && normalizedYear.from) {
    payload.syear1 = String(normalizedYear.from);
    payload.syear2 = String(normalizedYear.to || normalizedYear.from);
  }
  var query = Object.keys(payload).filter(function(key) {
    return payload[key] !== '';
  }).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(payload[key]).replace(/%20/g, '+');
  }).join('&');
  return WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + '/cgi-bin/fsearch/search.cgi?' + query;
}

function normalizeGoobikeSearchPhrase_(bikeName) {
  return trimFullWidth(toHalfWidthText_(bikeName))
    .replace(/[（）()]/g, ' ')
    .replace(/[・･]/g, ' ')
    .replace(/[-‐‑‒–—―ーｰ]/g, ' ')
    .replace(/[^\w\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandGoobikeSearchPhraseVariants_(phrase) {
  var text = trimFullWidth(String(phrase || ''));
  var variants = [];
  var ninjaMatch = text.match(/\b(ninja)(zx\s*\d+[a-z]?(?:\s+\w+)*)\b/i);
  if (ninjaMatch) {
    variants.push(text.replace(ninjaMatch[0], ninjaMatch[1] + ' ' + ninjaMatch[2]));
  }
  return variants;
}

function removeKnownGoobikeMakerName_(bikeName, maker) {
  var text = toHalfWidthText_(bikeName);
  if (!maker) {
    return text;
  }
  for (var i = 0; i < maker.names.length; i++) {
    text = text.replace(new RegExp(escapeRegExp_(maker.names[i]), 'ig'), ' ');
  }
  return text;
}

function getDirectGoobikeSearchIds_(bikeName) {
  var key = normalizeBikeMarketKeyPart_(bikeName);
  var directMap = {
    // GooBikeの検索結果URLで動作確認済み。モデルページ経由より安定して取得できます。
    s1000r: { maker: '9', model: '3090125' }
  };
  return directMap[key] || null;
}

function buildGoobikeModelUrlCandidates_(makerSlug, modelSlug) {
  var path = '/maker-' + makerSlug + '/car-' + makerSlug + '_' + modelSlug;
  return [
    WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + path + '/index.html',
    WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + path + '/used/index.html',
    WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL + path + '/index.html',
    WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL + path + '/used/index.html'
  ];
}

function detectGoobikeMaker_(bikeName) {
  var text = toHalfWidthText_(bikeName).toLowerCase();
  var makers = [
    { slug: 'honda', names: ['honda', 'ホンダ'] },
    { slug: 'yamaha', names: ['yamaha', 'ヤマハ'] },
    { slug: 'suzuki', names: ['suzuki', 'スズキ'] },
    { slug: 'kawasaki', names: ['kawasaki', 'カワサキ'] },
    { slug: 'bmw', names: ['bmw', 'ビーエムダブリュー'] },
    { slug: 'ducati', names: ['ducati', 'ドゥカティ', 'ドカティ'] },
    { slug: 'triumph', names: ['triumph', 'トライアンフ'] },
    { slug: 'harley_davidson', names: ['harley', 'harley-davidson', 'ハーレー', 'ハーレーダビッドソン'] },
    { slug: 'ktm', names: ['ktm'] },
    { slug: 'aprilia', names: ['aprilia', 'アプリリア'] }
  ];

  for (var i = 0; i < makers.length; i++) {
    for (var j = 0; j < makers[i].names.length; j++) {
      if (text.indexOf(makers[i].names[j].toLowerCase()) !== -1) {
        return makers[i];
      }
    }
  }
  return null;
}

function normalizeGoobikeModelSlug_(bikeName, maker) {
  var text = toHalfWidthText_(bikeName).toLowerCase();
  if (maker) {
    for (var i = 0; i < maker.names.length; i++) {
      text = text.replace(new RegExp(escapeRegExp_(maker.names[i].toLowerCase()), 'g'), '');
    }
  }
  text = text
    .replace(/[（）()]/g, ' ')
    .replace(/[・･]/g, ' ')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return text;
}

function fetchGoobikeResultPage_(searchIds, normalizedYear, refererUrl) {
  return fetchGoobikeText_(buildGoobikeSearchResultUrl_(searchIds, normalizedYear), {
    referer: refererUrl
  });
}

function buildGoobikeSearchResultUrl_(searchIds, normalizedYear) {
  var payload = {
    maker: searchIds.maker || '',
    model: searchIds.model || '',
    used_car: '1',
    siborikomi: 'on'
  };
  if (normalizedYear && normalizedYear.valid && !normalizedYear.unspecified && normalizedYear.from) {
    payload.syear1 = String(normalizedYear.from);
    payload.syear2 = String(normalizedYear.to || normalizedYear.from);
    payload.nenshiki_start = String(normalizedYear.from);
    payload.nenshiki_end = String(normalizedYear.to || normalizedYear.from);
  }
  var query = Object.keys(payload).filter(function(key) {
    return payload[key] !== '';
  }).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(payload[key]);
  }).join('&');
  return WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL + '/cgi-bin/search/search_result.cgi' + (query ? '?' + query : '');
}

function fetchGoobikeText_(url, options) {
  var urls = getGoobikeFetchUrls_(url);
  var errors = [];
  for (var i = 0; i < urls.length; i++) {
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        return fetchGoobikeTextOnce_(urls[i], options);
      } catch (error) {
        errors.push(urls[i] + ' ' + (error && error.message ? error.message : String(error)));
        Utilities.sleep(350);
      }
    }
  }
  throw new Error(errors.join(' / '));
}

function getGoobikeFetchUrls_(url) {
  var urls = [String(url || '')];
  if (String(url || '').indexOf(WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL) === 0) {
    urls.push(String(url).replace(WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL, WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL));
  } else if (String(url || '').indexOf(WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL) === 0) {
    urls.push(String(url).replace(WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL, WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL));
  }
  var seen = {};
  return urls.filter(function(candidate) {
    if (!candidate || seen[candidate]) {
      return false;
    }
    seen[candidate] = true;
    return true;
  });
}

function fetchGoobikeTextOnce_(url, options) {
  var requestOptions = {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };
  if (options && options.method) {
    requestOptions.method = options.method;
  }
  if (options && options.payload) {
    requestOptions.payload = options.payload;
  }
  if (options && options.referer) {
    requestOptions.headers.Referer = options.referer;
  }

  var response = UrlFetchApp.fetch(url, requestOptions);
  var code = response.getResponseCode();
  var text = decodeGoobikeResponse_(response);
  if (!text || String(text).length === 0) {
    throw new Error('GooBike取得本文0文字');
  }
  if (code < 200 || code >= 400) {
    if (hasGoobikeListingMarkers_(text)) {
      return text;
    }
    throw new Error('GooBike取得 HTTP ' + code);
  }
  return text;
}

function hasGoobikeListingMarkers_(text) {
  var source = String(text || '');
  return source.indexOf('bike_sec') !== -1
    || source.indexOf('車両価格') !== -1
    || source.indexOf('支払総額') !== -1
    || source.indexOf('検索結果') !== -1;
}

function decodeGoobikeResponse_(response) {
  var encodings = ['UTF-8', 'Shift_JIS', 'EUC-JP', 'EUC_JP'];
  var bestText = '';
  var bestScore = -1;
  for (var i = 0; i < encodings.length; i++) {
    var text = '';
    try {
      text = response.getContentText(encodings[i]);
    } catch (error) {
      continue;
    }
    var score = 0;
    if (text.indexOf('車両価格') !== -1) score += 5;
    if (text.indexOf('支払総額') !== -1) score += 5;
    if (text.indexOf('検索結果') !== -1) score += 2;
    if (text.indexOf('S1000R') !== -1 || text.indexOf('Ｓ１０００Ｒ') !== -1) score += 1;
    score -= (text.match(/�/g) || []).length;
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }
  if (bestText) {
    return bestText;
  }
  try {
    return response.getContentText();
  } catch (error) {
    return '';
  }
}

function authorizeMarketExternalRequest(auth) {
  assertMarketAdminPasscode_(auth);
  var response = UrlFetchApp.fetch(WEBAPP_BIKE_MARKET_GOOBIKE_BASE_URL + '/', {
    muteHttpExceptions: true,
    followRedirects: true
  });
  return '相場取得の外部アクセス承認が完了しました。HTTP ' + response.getResponseCode();
}

function debugBikeMarketFetchForWeb_(bikeName, yearInput, auth) {
  return debugBikeMarketFetchForAdmin(bikeName, yearInput, auth);
}

function debugFetchGoobikeUrl_(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    var text = decodeGoobikeResponse_(response);
    return {
      url: url,
      code: response.getResponseCode(),
      length: String(text || '').length,
      hasMarkers: hasGoobikeListingMarkers_(text),
      listingBlockCount: splitGoobikeListingBlocks_(text).length,
      sample: htmlToText_(text).slice(0, 500)
    };
  } catch (error) {
    return {
      url: url,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function extractGoobikeSearchIds_(html) {
  return {
    maker: extractHtmlInputValue_(html, 'maker'),
    model: extractHtmlInputValue_(html, 'model')
  };
}

function extractHtmlInputValue_(html, name) {
  var inputRegex = /<input\b[^>]*>/gi;
  var match;
  while ((match = inputRegex.exec(String(html || ''))) !== null) {
    var tag = match[0];
    if (getHtmlAttribute_(tag, 'name') !== name) {
      continue;
    }
    return getHtmlAttribute_(tag, 'value');
  }
  return '';
}

function getHtmlAttribute_(tag, attributeName) {
  var regex = new RegExp("\\b" + escapeRegExp_(attributeName) + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", 'i');
  var match = String(tag || '').match(regex);
  return match ? (match[1] || match[2] || match[3] || '') : '';
}

function parseGoobikeListings_(html, bikeName, normalizedYear, fetchedAt) {
  var listings = [];
  var blocks = splitGoobikeListingBlocks_(html);
  var detailCache = {};
  var parsedUrlMap = {};
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var title = extractGoobikeListingTitle_(block);
    var cardValidation = validateGoobikeListingCard_(block, title);
    var modelMatch = getBikeMarketModelMatchInfo_(bikeName, title);
    if (!cardValidation.titleValid || !modelMatch.matched) {
      continue;
    }
    var years = extractGoobikeListingYears_(block);
    var stockUrl = extractGoobikeListingUrl_(block);
    if (years.length === 0 && stockUrl) {
      years = extractGoobikeDetailYears_(stockUrl, detailCache).years;
    }
    if (!isAnyGoobikeYearMatched_(years, normalizedYear)) {
      continue;
    }
    var prices = extractGoobikeListingPrices_(block);
    if (!prices.selectedPriceYen) {
      continue;
    }
    var cardBoundaryTreatment = getBikeMarketCardBoundaryTreatment_(cardValidation, title, prices, true, true);
    var cardBoundaryExplanation = getBikeMarketCardBoundaryExplanation_(cardValidation, cardBoundaryTreatment);
    listings.push({
      source: WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE,
      title: title,
      modelName: title,
      year: years.length ? years[0] : null,
      basePriceYen: prices.basePriceYen,
      totalPriceYen: prices.totalPriceYen,
      vehiclePriceYen: prices.vehiclePriceYen,
      warrantyTotalPriceYen: prices.warrantyTotalPriceYen,
      selectedPriceYen: prices.selectedPriceYen,
      selectedPriceReason: prices.selectedPriceReason,
      priceMissingReason: prices.priceMissingReason,
      priceValidationResult: prices.priceValidationResult,
      cardBoundaryTreatment: cardBoundaryTreatment,
      cardBoundarySeverity: cardBoundaryExplanation.severity,
      cardBoundaryMessage: cardBoundaryExplanation.message,
      cardDebug: prices.cardDebug,
      mileageKm: parseGoobikeMileageKm_(block),
      extractionSource: 'list',
      shopName: extractGoobikeShopName_(block),
      prefecture: '',
      url: stockUrl,
      fetchedAt: fetchedAt
    });
    if (stockUrl) {
      parsedUrlMap[normalizeGoobikeDetailUrl_(stockUrl)] = true;
    }
  }
  var detailListings = inspectGoobikeDetailListings_(html, bikeName, normalizedYear, fetchedAt, detailCache, parsedUrlMap);
  listings = listings.concat(detailListings.priceListings);
  return listings;
}

function splitGoobikeListingBlocks_(html) {
  var source = String(html || '');
  var urlBlocks = splitGoobikeListingBlocksByDetailUrl_(source);
  if (urlBlocks.length) {
    return urlBlocks;
  }
  var blocks = source.match(/<div\b[^>]*class=["'][^"']*\bbike_sec\b[^"']*["'][\s\S]*?(?=<div\b[^>]*class=["'][^"']*\bbike_sec\b|<div\b[^>]*class=["'][^"']*\bpager\b|$)/gi) || [];
  if (blocks.length) {
    return blocks;
  }

  blocks = source.match(/<li\b[^>]*class=["'][^"']*\b(?:bike|stock|vehicle|search)[^"']*["'][\s\S]*?(?=<li\b[^>]*class=["'][^"']*\b(?:bike|stock|vehicle|search)[^"']*["']|<div\b[^>]*class=["'][^"']*\bpager\b|$)/gi) || [];
  if (blocks.length) {
    return blocks;
  }

  blocks = source.split(/(?=<[^>]+class=["'][^"']*\bbike_sec\b)/i).filter(function(block) {
    return hasGoobikeListingMarkers_(block);
  });
  return urlBlocks.length > blocks.length ? urlBlocks : blocks;
}

function splitGoobikeListingBlocksByDetailUrl_(html) {
  var source = String(html || '');
  var positions = extractGoobikeListingDetailUrlPositions_(source);
  var blocks = [];
  var starts = [];
  for (var s = 0; s < positions.length; s++) {
    starts.push(findGoobikeListingCardStart_(source, positions[s].index));
  }
  for (var i = 0; i < positions.length; i++) {
    var position = positions[i].index;
    var nextPosition = i + 1 < positions.length ? positions[i + 1].index : null;
    var start = starts[i];
    var nextStart = i + 1 < starts.length ? starts[i + 1] : null;
    var end = nextStart && nextStart > position ? nextStart : (nextPosition || findGoobikeListingCardEnd_(source, position));
    if (end <= position) {
      end = findGoobikeListingCardEnd_(source, position);
    }
    var block = '<!--codex-target-url:' + positions[i].url + '-->' + source.slice(start, end);
    if (block && block.indexOf('/spread/') !== -1) {
      blocks.push(block);
    }
  }
  return blocks;
}

function findGoobikeListingCardStart_(source, position) {
  var searchStart = Math.max(0, position - 3000);
  var head = source.slice(searchStart, position);
  var regex = /<(?:div|li|tr|article)\b[^>]*(?:class|id)=["'][^"']*(?:bike_sec|bike|stock|vehicle|search|result|list|item|cassette)[^"']*["'][^>]*>/gi;
  var match;
  var best = -1;
  while ((match = regex.exec(head)) !== null) {
    best = searchStart + match.index;
  }
  if (best >= 0 && position - best <= 3000) {
    return best;
  }
  var anchorStart = source.lastIndexOf('<a', position);
  if (anchorStart >= 0 && position - anchorStart <= 800) {
    return anchorStart;
  }
  return Math.max(0, position - 800);
}

function findGoobikeListingCardEnd_(source, position) {
  var fallback = Math.min(source.length, position + 20000);
  var tail = source.slice(position, fallback);
  var match = tail.match(/<(?:div|nav|section)\b[^>]*class=["'][^"']*(?:pager|pagination|recommend|footer)[^"']*["']/i);
  if (match && typeof match.index === 'number') {
    return position + match.index;
  }
  return fallback;
}

function extractGoobikeListingTitle_(block) {
  var source = getGoobikeFocusedListingBlock_(block, 1200, 2500) || String(block || '');
  var targetTitle = extractGoobikeTargetLinkTitle_(String(block || ''));
  if (isValidGoobikeListingTitle_(targetTitle)) {
    return targetTitle;
  }
  var patterns = [
    /<h[1-6][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-6]>/i,
    /<p\b[^>]*class=["'][^"']*(?:bike_name|bike-name|name|title|tit)[^"']*["'][\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    /<a\b[^>]*class=["'][^"']*(?:bike_name|bike-name|name|title|tit)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /<a\b[^>]*href=["'][^"']*\/spread\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = source.match(patterns[i]);
    var title = trimFullWidth(htmlToText_(match ? match[1] : ''));
    if (isValidGoobikeListingTitle_(title)) {
      return title;
    }
  }

  var altMatch = source.match(/\balt=["']([^"']+)["']/i);
  var altTitle = trimFullWidth(htmlToText_(altMatch ? altMatch[1] : ''));
  if (isValidGoobikeListingTitle_(altTitle)) {
    return altTitle;
  }

  var plainTitle = extractBikeNameFromPlainGoobikeText_(source);
  return isValidGoobikeListingTitle_(plainTitle) ? plainTitle : '';
}

function extractGoobikeListingUrl_(block) {
  var markerMatch = String(block || '').match(/<!--codex-target-url:([\s\S]*?)-->/);
  if (markerMatch) {
    return normalizeGoobikeDetailUrl_(markerMatch[1]).replace(/[?#].*$/, '');
  }
  var match = String(block || '').match(/\bhref=["']([^"']*\/spread\/[^"']+)["']/i);
  if (!match) {
    return '';
  }
  return normalizeGoobikeDetailUrl_(match[1]);
}

function validateGoobikeListingCard_(block, title) {
  var urls = extractGoobikeListingDetailUrls_(block);
  var titleOk = isValidGoobikeListingTitle_(title);
  if (urls.length > 1) {
    return {
      valid: false,
      titleValid: titleOk,
      reason: 'CARD_BOUNDARY_ERROR',
      titleValidationResult: titleOk ? 'OK' : 'TITLE_EXTRACTION_ERROR',
      cardBoundaryResult: 'CARD_BOUNDARY_ERROR'
    };
  }
  if (!titleOk) {
    return {
      valid: false,
      titleValid: false,
      reason: 'TITLE_EXTRACTION_ERROR',
      titleValidationResult: 'TITLE_EXTRACTION_ERROR',
      cardBoundaryResult: 'OK'
    };
  }
  return {
    valid: true,
    titleValid: true,
    reason: '',
    titleValidationResult: 'OK',
    cardBoundaryResult: 'OK'
  };
}

function getBikeMarketCardBoundaryTreatment_(cardValidation, title, prices, modelMatched, yearMatched) {
  if (!cardValidation || cardValidation.cardBoundaryResult !== 'CARD_BOUNDARY_ERROR') {
    return 'none';
  }
  if (isValidGoobikeListingTitle_(title)
      && prices && prices.selectedPriceYen
      && prices.priceValidationResult === 'OK'
      && modelMatched
      && yearMatched) {
    return 'warning / タイトル・価格・年式が正常なため集計対象';
  }
  return 'exclusion / カード境界を確認できないため除外';
}

function getBikeMarketCardBoundaryExplanation_(cardValidation, cardBoundaryTreatment) {
  if (!cardValidation || cardValidation.cardBoundaryResult !== 'CARD_BOUNDARY_ERROR') {
    return { severity: 'none', message: '' };
  }
  if (String(cardBoundaryTreatment || '').indexOf('warning') === 0) {
    return {
      severity: 'warning',
      message: 'CARD_BOUNDARY_ERRORは検出されていますが、タイトル・価格・年式が正常なため警告として集計対象にしています。'
    };
  }
  return {
    severity: 'error',
    message: 'CARD_BOUNDARY_ERRORのため、このカードは境界誤認の可能性があり集計対象から除外します。'
  };
}

function getBikeMarketListingExclusionReason_(cardValidation, cardBoundaryTreatment, modelMatch, yearMatched, prices) {
  if (!cardValidation || !cardValidation.titleValid) {
    return 'TITLE_EXTRACTION_ERROR';
  }
  if (modelMatch && modelMatch.zx4rrExcluded) {
    return 'ZX-4RR のため除外';
  }
  if (!modelMatch || !modelMatch.matched) {
    return getBikeMarketModelExclusionReason_(modelMatch && modelMatch.normalizedInput, modelMatch && modelMatch.normalizedTitle);
  }
  if (!yearMatched) {
    return '年式不一致';
  }
  if (!prices || !prices.selectedPriceYen) {
    return prices && prices.priceValidationResult ? prices.priceValidationResult : '価格未取得';
  }
  if (cardValidation.cardBoundaryResult === 'CARD_BOUNDARY_ERROR' && String(cardBoundaryTreatment || '').indexOf('warning') !== 0) {
    return 'CARD_BOUNDARY_ERROR';
  }
  return '';
}

function getBikeMarketYearMatchReason_(years, normalizedYear, matched) {
  if (!normalizedYear || !normalizedYear.valid) {
    return 'false / 入力年式が不正';
  }
  if (normalizedYear.unspecified || (!normalizedYear.from && !normalizedYear.to)) {
    return 'true / 年式未指定';
  }
  var list = Array.isArray(years) ? years : [];
  for (var i = 0; i < list.length; i++) {
    if (isYearMatched_(list[i], normalizedYear)) {
      return 'true / years に ' + list[i] + ' が含まれるため';
    }
  }
  return (matched ? 'true' : 'false') + ' / years=' + list.join(', ') + ' input=' + normalizedYear.from;
}

function extractGoobikeTargetLinkTitle_(block) {
  var source = String(block || '');
  var targetUrl = extractGoobikeListingUrl_(source);
  var path = getGoobikeDetailPath_(targetUrl);
  if (!path) {
    return '';
  }
  var regex = new RegExp('<a\\b[^>]*href=["\'][^"\']*' + escapeRegExp_(path) + '[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/a>', 'gi');
  var match;
  while ((match = regex.exec(source)) !== null) {
    var title = trimFullWidth(htmlToText_(match[1]));
    if (isValidGoobikeListingTitle_(title)) {
      return title;
    }
  }
  return '';
}

function isValidGoobikeListingTitle_(title) {
  var text = trimFullWidth(htmlToText_(title));
  if (!text) {
    return false;
  }
  return !isInvalidGoobikeListingTitle_(text);
}

function isInvalidGoobikeListingTitle_(title) {
  var text = trimFullWidth(htmlToText_(title)).replace(/\s+/g, '');
  if (!text) {
    return true;
  }
  return /お見積り|お問い合わせ|お問合せ|来店を予約|車両状態を見る|グーバイク保証とは|カタログを見る|価格相場表|この条件で絞り込む|お気に入り|メールで受取る/.test(text);
}

function getGoobikeDetailPath_(url) {
  var match = String(url || '').match(/\/spread\/[^?#"'<\s)]+/i);
  return match ? match[0] : '';
}

function getGoobikeFocusedListingBlock_(block, beforeChars, afterChars) {
  var source = String(block || '');
  var targetUrl = extractGoobikeListingUrl_(source);
  if (!targetUrl) {
    return '';
  }
  var path = getGoobikeDetailPath_(targetUrl);
  if (!path) {
    return '';
  }
  var position = source.indexOf(path);
  if (position < 0) {
    return '';
  }
  var start = Math.max(0, position - beforeChars);
  var end = Math.min(source.length, position + afterChars);
  return source.slice(start, end);
}

function normalizeGoobikeDetailUrl_(url) {
  var text = String(url || '').replace(/&amp;/g, '&');
  if (!text) {
    return '';
  }
  if (text.indexOf('//') === 0) {
    return 'https:' + text;
  }
  if (text.indexOf('http') === 0) {
    return text;
  }
  return WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + (text.charAt(0) === '/' ? text : '/' + text);
}

function extractGoobikeListingDetailUrls_(html) {
  return extractGoobikeListingDetailUrlPositions_(html).map(function(item) {
    return item.url;
  });
}

function extractGoobikeListingDetailUrlPositions_(html) {
  var source = String(html || '');
  var regex = /(?:https?:\/\/(?:www\.)?goobike\.com)?\/spread\/[^"'<\s)]+/gi;
  var seen = {};
  var urls = [];
  var match;
  while ((match = regex.exec(source)) !== null) {
    var url = normalizeGoobikeDetailUrl_(match[0]).replace(/[?#].*$/, '');
    if (!url || seen[url]) {
      continue;
    }
    seen[url] = true;
    urls.push({ url: url, index: match.index });
  }
  return urls;
}

function inspectGoobikeDetailListings_(html, bikeName, normalizedYear, fetchedAt, detailCache, parsedUrlMap) {
  var urls = extractGoobikeListingDetailUrls_(html);
  var parsedListings = [];
  var matchedListings = [];
  var priceListings = [];
  var maxDetailFetches = 20;
  for (var i = 0; i < urls.length && i < maxDetailFetches; i++) {
    var url = urls[i];
    var detail = extractGoobikeDetailListing_(url, detailCache);
    var title = detail.title;
    var titleModelYear = detail.titleModelYear || extractGoobikeTitleModelYear_(title);
    if (isGenericGoobikeDetailTitle_(title) && (detail.years.length > 0 || detail.prices.totalPriceYen || detail.prices.basePriceYen)) {
      title = bikeName;
    }
    var modelMatch = getBikeMarketModelMatchInfo_(bikeName, title);
    var modelMatched = modelMatch.matched;
    var yearMatched = modelMatched && isAnyGoobikeYearMatched_(detail.years, normalizedYear);
    var yearMatchReason = getBikeMarketYearMatchReason_(detail.years, normalizedYear, yearMatched);
    var priceAvailable = Boolean(detail.prices.selectedPriceYen);
    var exclusionReason = modelMatched ? '' : getBikeMarketModelExclusionReason_(bikeName, title);
    var parsed = {
      title: title,
      normalizedTitle: modelMatch.normalizedTitle,
      normalizedInputBikeName: modelMatch.normalizedInput,
      modelCanonicalKey: modelMatch.canonicalKey || '',
      titleValidationResult: isValidGoobikeListingTitle_(title) ? 'OK' : 'TITLE_EXTRACTION_ERROR',
      cardBoundaryResult: 'OK',
      cardBoundaryTreatment: 'none',
      years: detail.years,
      titleModelYear: titleModelYear,
      basePriceYen: detail.prices.basePriceYen,
      totalPriceYen: detail.prices.totalPriceYen,
      vehiclePriceYen: detail.prices.vehiclePriceYen,
      warrantyTotalPriceYen: detail.prices.warrantyTotalPriceYen,
      selectedPriceYen: detail.prices.selectedPriceYen,
      selectedPriceReason: detail.prices.selectedPriceReason,
      priceMissingReason: detail.prices.priceMissingReason,
      priceValidationResult: detail.prices.priceValidationResult,
      cardDebug: detail.prices.cardDebug,
      url: url,
      extractionSource: 'detail',
      modelMatched: modelMatched,
      modelMatchReason: modelMatch.reason,
      zx4rrExcluded: modelMatch.zx4rrExcluded,
      yearMatched: yearMatched,
      yearMatchReason: yearMatchReason,
      priceAvailable: priceAvailable,
      exclusionReason: exclusionReason || (modelMatched && !yearMatched ? '年式不一致' : ''),
      calculationTarget: yearMatched && Boolean(detail.prices.selectedPriceYen),
      detailYearError: detail.errorMessage || ''
    };
    parsedListings.push(parsed);
    if (!yearMatched) {
      continue;
    }
    matchedListings.push(parsed);
    priceListings.push({
      source: WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE,
      title: title,
      modelName: title,
      year: detail.years.length ? detail.years[0] : null,
      titleModelYear: titleModelYear,
      basePriceYen: detail.prices.basePriceYen,
      totalPriceYen: detail.prices.totalPriceYen,
      vehiclePriceYen: detail.prices.vehiclePriceYen,
      warrantyTotalPriceYen: detail.prices.warrantyTotalPriceYen,
      selectedPriceYen: detail.prices.selectedPriceYen,
      selectedPriceReason: detail.prices.selectedPriceReason,
      priceMissingReason: detail.prices.priceMissingReason,
      priceValidationResult: detail.prices.priceValidationResult,
      cardBoundaryTreatment: 'none',
      modelMatchReason: modelMatch.reason,
      yearMatchReason: yearMatchReason,
      cardDebug: detail.prices.cardDebug,
      mileageKm: detail.mileageKm,
      extractionSource: 'detail',
      shopName: detail.shopName,
      prefecture: '',
      url: url,
      fetchedAt: fetchedAt
    });
  }
  return {
    parsedListings: parsedListings,
    matchedListings: matchedListings,
    priceListings: priceListings
  };
}

function extractGoobikeDetailListing_(url, cache) {
  var key = String(url || '');
  if (cache && cache[key] && cache[key].listing) {
    return cache[key].listing;
  }
  var listing = {
    title: '',
    years: [],
    titleModelYear: null,
    prices: { basePriceYen: null, totalPriceYen: null, warrantyTotalPriceYen: null, selectedPriceYen: null },
    mileageKm: 0,
    shopName: '',
    errorMessage: ''
  };
  try {
    var html = fetchGoobikeTextOnce_(key, {
      referer: WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + '/'
    });
    listing.title = extractGoobikeDetailTitle_(html) || extractGoobikeListingTitle_(html);
    listing.years = extractGoobikeListingYears_(html);
    listing.titleModelYear = extractGoobikeTitleModelYear_(html);
    listing.prices = extractGoobikeListingPrices_(html);
    listing.mileageKm = parseGoobikeMileageKm_(html);
    listing.shopName = extractGoobikeShopName_(html);
  } catch (error) {
    listing.errorMessage = error && error.message ? error.message : String(error);
  }
  if (cache) {
    cache[key] = cache[key] || {};
    cache[key].listing = listing;
  }
  return listing;
}

function isGenericGoobikeDetailTitle_(title) {
  var text = trimFullWidth(htmlToText_(title));
  return !text || /サイトマップ|sitemap|グーバイク|goobike/i.test(text);
}

function extractGoobikeDetailTitle_(html) {
  var source = String(html || '');
  var patterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = source.match(patterns[i]);
    var text = trimFullWidth(htmlToText_(match ? match[1] : '')).split(/[｜|]/)[0];
    if (text) {
      return text;
    }
  }
  return '';
}

function extractGoobikeShopName_(block) {
  var match = String(block || '').match(/<dl class=["']shop_name["'][\s\S]*?<dt>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  return trimFullWidth(htmlToText_(match ? match[1] : ''));
}

function extractGoobikeListingYears_(block) {
  var sourceBlock = getGoobikeFocusedListingBlock_(block, 2500, 5000) || String(block || '');
  var years = [];
  var regex = /<span>\s*(?:モデル年式|初度登録年)\s*<\/span>\s*<b>([\s\S]*?)<\/b>/g;
  var match;
  while ((match = regex.exec(sourceBlock)) !== null) {
    var year = parseSingleBikeMarketYear_(htmlToText_(match[1]));
    if (year && years.indexOf(year) === -1) {
      years.push(year);
    }
  }
  var plainText = htmlToText_(sourceBlock);
  var fallbackRegex = /(?:モデル年式|初度登録年)\s*([^\s　\/／|｜]+)/g;
  while ((match = fallbackRegex.exec(plainText)) !== null) {
    var fallbackYear = parseSingleBikeMarketYear_(match[1]);
    if (fallbackYear && years.indexOf(fallbackYear) === -1) {
      years.push(fallbackYear);
    }
  }
  return years;
}

function extractGoobikeTitleModelYear_(block) {
  var sourceBlock = getGoobikeFocusedListingBlock_(block, 2500, 5000) || String(block || '');
  var text = toHalfWidthText_(htmlToText_(sourceBlock)).replace(/\s+/g, ' ');
  var match = text.match(/(20[0-9]{2})\s*年?\s*モデル/);
  return match ? Number(match[1]) : null;
}

function extractGoobikeDetailYears_(url, cache) {
  var key = String(url || '');
  if (!key) {
    return { years: [], errorMessage: 'detail url missing' };
  }
  if (cache && cache[key] && cache[key].years) {
    return { years: cache[key].years, errorMessage: cache[key].errorMessage || '' };
  }
  var result = { years: [], errorMessage: '' };
  try {
    var html = fetchGoobikeTextOnce_(key, {
      referer: WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + '/'
    });
    result.years = extractGoobikeListingYears_(html);
  } catch (error) {
    result.errorMessage = error && error.message ? error.message : String(error);
  }
  if (cache) {
    cache[key] = cache[key] || {};
    cache[key].years = result.years;
    cache[key].errorMessage = result.errorMessage;
  }
  return result;
}

function isAnyGoobikeYearMatched_(years, normalizedYear) {
  if (!normalizedYear.valid) {
    return false;
  }
  if (normalizedYear.unspecified || (!normalizedYear.from && !normalizedYear.to)) {
    return true;
  }
  for (var i = 0; i < years.length; i++) {
    if (isYearMatched_(years[i], normalizedYear)) {
      return true;
    }
  }
  return false;
}

function extractGoobikeListingPrices_(block) {
  var rawHtml = String(block || '');
  var plainText = buildGoobikeCardPlainText_(rawHtml);
  var cells = [];
  var tableMatch = rawHtml.match(/<table>[\s\S]*?<th>\s*車両価格\s*<\/th>\s*<th>\s*支払総額\s*<\/th>[\s\S]*?<\/table>/i);
  if (tableMatch) {
    cells = tableMatch[0].match(/<td[\s\S]*?<\/td>/gi) || [];
  }
  var prices = {
    basePriceYen: cells[0] ? parsePriceToYen_(normalizeGoobikePriceText_(cells[0])) : null,
    totalPriceYen: cells[1] ? parsePriceToYen_(normalizeGoobikePriceText_(cells[1])) : null,
    vehiclePriceYen: cells[0] ? parsePriceToYen_(normalizeGoobikePriceText_(cells[0])) : null,
    warrantyTotalPriceYen: null,
    selectedPriceYen: null,
    selectedPriceReason: '',
    priceMissingReason: ''
  };

  var warrantyLabels = ['グーバイク保証付き支払総額', 'グーバイク保証付きプラン支払総額', 'グーバイク保証付きプラン', 'グーバイク保証', '保証付きプラン', 'バイク保証付きプラン', '保証付き支払総額', '保証付きプラン支払総額', '保証付プラン支払総額'];
  var totalLabels = ['支払総額(税込)', '支払総額（税込）', '支払い総額', '支払総額', '総額', '乗り出し価格', '乗出し価格', '乗出価格'];
  var vehicleLabels = ['車両価格(税込)', '車両価格（税込）', '車両本体価格', '車輌価格', '車両価格', '本体価格'];
  prices.warrantyTotalPriceYen = extractPriceNearLabel_(rawHtml, warrantyLabels, 8000, {}) || extractPriceNearLabel_(plainText, warrantyLabels, 8000, {});
  if (!prices.totalPriceYen) {
    prices.totalPriceYen = extractPriceNearLabel_(rawHtml, totalLabels, 8000, { excludeWarrantyContext: true })
      || extractPriceNearLabel_(plainText, totalLabels, 8000, { excludeWarrantyContext: true });
  }
  if (!prices.basePriceYen) {
    prices.basePriceYen = extractPriceNearLabel_(rawHtml, vehicleLabels, 8000, {})
      || extractPriceNearLabel_(plainText, vehicleLabels, 8000, {});
  }
  prices.vehiclePriceYen = prices.basePriceYen;
  var totalValid = isBikeMarketPriceInValidRange_(prices.totalPriceYen);
  var baseValid = isBikeMarketPriceInValidRange_(prices.basePriceYen);
  prices.selectedPriceYen = totalValid ? prices.totalPriceYen : (baseValid ? prices.basePriceYen : null);
  prices.selectedPriceReason = totalValid ? '支払総額' : (baseValid ? '車両価格' : '');
  prices.priceValidationResult = prices.selectedPriceYen ? 'OK' : getBikeMarketPriceValidationReason_(prices);
  prices.priceMissingReason = prices.selectedPriceYen ? '' : (prices.warrantyTotalPriceYen ? '保証付きプラン価格のみ' : prices.priceValidationResult);
  prices.cardDebug = buildGoobikeCardDebug_(rawHtml, plainText);
  return prices;
}

function buildGoobikeCardPlainText_(html) {
  return toHalfWidthText_(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPriceNearLabel_(text, labels, maxDistance, options) {
  var source = normalizeGoobikePriceScanText_(String(text || ''));
  for (var i = 0; i < labels.length; i++) {
    var label = labels[i];
    var searchFrom = 0;
    while (searchFrom < source.length) {
      var pos = source.indexOf(label, searchFrom);
      if (pos < 0) {
        break;
      }
      if (options && options.excludeWarrantyContext) {
        var before = source.slice(Math.max(0, pos - 80), pos);
        if (/保証|グーバイク|プラン/.test(before)) {
          searchFrom = pos + label.length;
          continue;
        }
      }
      var windowText = source.slice(pos, pos + maxDistance);
      var price = parseFirstJapanesePriceToYen_(windowText);
      if (price) {
        return price;
      }
      searchFrom = pos + label.length;
    }
  }
  return null;
}

function parseFirstJapanesePriceToYen_(value) {
  var text = normalizeGoobikePriceScanText_(value);
  var manMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (manMatch) {
    return Math.round(Number(manMatch[1]) * 10000);
  }
  var yenMatch = text.match(/([0-9]{5,})\s*円/);
  if (yenMatch) {
    return Number(yenMatch[1]);
  }
  return null;
}

function normalizeGoobikePriceScanText_(value) {
  return toHalfWidthText_(String(value || ''))
    .replace(/,/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    .replace(/(\d)\s*万円/g, '$1万円')
    .trim();
}

function getBikeMarketPriceRule_(bikeName) {
  var entry = getBikeModelDictionaryEntryForName_(bikeName || '');
  var rule = entry && BIKE_MODEL_PRICE_RULES[entry.canonicalKey] ? BIKE_MODEL_PRICE_RULES[entry.canonicalKey] : null;
  return {
    min: rule && rule.min ? rule.min : BIKE_MARKET_MIN_VALID_PRICE,
    max: rule && rule.max ? rule.max : BIKE_MARKET_MAX_VALID_PRICE,
    canonicalKey: entry ? entry.canonicalKey : ''
  };
}

function isBikeMarketPriceInValidRange_(price, bikeName) {
  var number = Number(price || 0);
  var rule = getBikeMarketPriceRule_(bikeName || '');
  return Number.isFinite(number) && number >= rule.min && number <= rule.max;
}

function getBikeMarketPriceValidationReason_(prices, bikeName) {
  var candidates = [prices && prices.totalPriceYen, prices && prices.basePriceYen].filter(function(price) {
    return Number(price || 0) > 0;
  });
  if (candidates.length && candidates.some(function(price) { return !isBikeMarketPriceInValidRange_(price, bikeName); })) {
    return 'PRICE_OUT_OF_RANGE';
  }
  if (prices && prices.warrantyTotalPriceYen) {
    return '保証付きプラン価格のみ';
  }
  return '支払総額なし、本体価格なし';
}

function buildGoobikeCardDebug_(html, plainText) {
  var source = String(html || '');
  var plain = String(plainText || '');
  return {
    cardHtmlLength: source.length,
    containsVehiclePriceLabel: /車両価格|車両本体価格|本体価格|車輌価格/.test(plain),
    containsTotalPriceLabel: /支払総額|支払い総額|総額|乗り出し価格|乗出し価格|乗出価格/.test(plain),
    containsManYen: /万円/.test(plain),
    containsPriceLikeNumber: /[0-9]+(?:\.[0-9]+)?\s*万円|[0-9]{4,}\s*円/.test(plain),
    cardHtmlHead: toHalfWidthText_(htmlToText_(source.slice(0, 300))).replace(/\s+/g, ' ').trim(),
    vehiclePriceSnippet: getSnippetAroundPattern_(plain, /車両価格|車両本体価格|本体価格|車輌価格/),
    totalPriceSnippet: getSnippetAroundPattern_(plain, /支払総額|支払い総額|総額|乗り出し価格|乗出し価格|乗出価格/),
    warrantyPriceSnippet: getSnippetAroundPattern_(plain, /グーバイク保証付き支払総額|グーバイク保証付きプラン|保証付きプラン|保証付き支払総額/),
    manYenSnippet: getSnippetAroundPattern_(plain, /万円/)
  };
}

function getSnippetAroundPattern_(text, pattern) {
  var source = String(text || '');
  var match = source.match(pattern);
  if (!match) {
    return '';
  }
  var pos = match.index || 0;
  return source.slice(Math.max(0, pos - 150), Math.min(source.length, pos + 150));
}

function extractBikeNameFromPlainGoobikeText_(block) {
  var text = toHalfWidthText_(htmlToText_(block)).replace(/\s+/g, ' ');
  var match = text.match(/\b(BMW\s*)?S\s*1000\s*R\b/i);
  if (match) {
    return 'S1000R';
  }
  match = text.match(/\b(BMW\s*)?S\s*1000\s*RR\b/i);
  if (match) {
    return 'S1000RR';
  }
  return '';
}

function normalizeGoobikePriceText_(html) {
  return toHalfWidthText_(htmlToText_(html)).replace(/\s+/g, '');
}

function parseGoobikeMileageKm_(block) {
  var match = String(block || '').match(/<span>\s*走行距離\s*<\/span>\s*<b>([\s\S]*?)<\/b>/i);
  return match ? parseYenNumber_(htmlToText_(match[1])) : 0;
}

function htmlToText_(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|th|h\d|dl|dt|dd)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function(_, code) {
      return String.fromCharCode(Number(code));
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function toHalfWidthText_(value) {
  return trimFullWidth(String(value || ''))
    .replace(/[Ａ-Ｚａ-ｚ０-９．]/g, function(char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
}

function escapeRegExp_(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function summarizeBikeListings_(bikeName, yearInput, listings, fetchedAt, counts) {
  var priceItems = [];
  var excludedPriceItems = [];
  var fallbackCount = 0;
  var sourcesMap = {};
  for (var i = 0; i < listings.length; i++) {
    var listing = listings[i];
    sourcesMap[listing.source || 'manual'] = true;
    var validation = getValidatedBikeMarketListingPrice_(bikeName, listing);
    var price = validation.price;
    if (validation.excludedPrices.length) {
      excludedPriceItems = excludedPriceItems.concat(validation.excludedPrices);
    }
    if (validation.usedBasePriceFallback) {
      fallbackCount++;
    }
    if (price) {
      priceItems.push({
        price: price,
        usedBasePriceFallback: validation.usedBasePriceFallback,
        url: listing.url || '',
        title: listing.title || listing.modelName || ''
      });
    }
  }

  var prices = priceItems.map(function(item) { return item.price; });
  prices.sort(function(a, b) { return a - b; });
  var validCount = prices.length;
  var simpleAverage = validCount ? averageBikeMarketPrices_(prices) : null;
  var median = validCount ? medianBikeMarketPrices_(prices) : null;
  var reference = calculateReferenceBikeMarketPrice_(prices, median);
  var priceWarning = getBikeMarketPriceRangeWarning_(prices, reference.referencePrice, reference.outlierExcludedCount, median);

  var errorMessage = '';
  var status = 'success';
  var noDataReason = '';
  if (listings.length === 0) {
    errorMessage = WEBAPP_BIKE_MARKET_ERROR_NO_MATCH;
    status = 'no_data';
    noDataReason = 'no_match';
  } else if (validCount === 0) {
    errorMessage = WEBAPP_BIKE_MARKET_ERROR_NO_MATCH;
    status = 'no_data';
    noDataReason = 'price_missing';
  }

  return {
    bikeName: bikeName,
    yearInput: yearInput || '',
    sources: Object.keys(sourcesMap).length ? Object.keys(sourcesMap) : ['manual'],
    listingCount: listings.length,
    validPriceCount: validCount,
    extractedCount: counts && counts.extractedCount != null ? counts.extractedCount : listings.length,
    yearMatchedCount: counts && counts.yearMatchedCount != null ? counts.yearMatchedCount : listings.length,
    priceAvailableCount: validCount,
    calculationTargetCount: reference.calculationTargetCount,
    minTotalPriceYen: validCount ? prices[0] : null,
    maxTotalPriceYen: validCount ? prices[validCount - 1] : null,
    averageTotalPriceYen: simpleAverage,
    simpleAverageTotalPriceYen: simpleAverage,
    medianTotalPriceYen: median,
    trimmedAverageTotalPriceYen: reference.trimmedAveragePrice,
    referenceMarketPriceYen: reference.referencePrice,
    outlierExcludedCount: reference.outlierExcludedCount,
    outlierExcludedPrices: reference.outlierExcludedPrices,
    abnormalExcludedPrices: excludedPriceItems,
    calculationMethod: reference.calculationMethod,
    market_min_price: validCount ? prices[0] : null,
    market_max_price: validCount ? prices[validCount - 1] : null,
    market_simple_average_price: simpleAverage,
    market_median_price: median,
    market_trimmed_average_price: reference.trimmedAveragePrice,
    market_reference_price: reference.referencePrice,
    market_extracted_count: counts && counts.extractedCount != null ? counts.extractedCount : listings.length,
    market_year_matched_count: counts && counts.yearMatchedCount != null ? counts.yearMatchedCount : listings.length,
    market_price_available_count: validCount,
    market_calculation_target_count: reference.calculationTargetCount,
    market_used_base_price_fallback_count: fallbackCount,
    market_outlier_excluded_count: reference.outlierExcludedCount,
    market_outlier_excluded_prices: reference.outlierExcludedPrices,
    market_abnormal_excluded_prices: excludedPriceItems,
    market_calculation_method: reference.calculationMethod,
    market_price_warning: priceWarning,
    usedBasePriceFallbackCount: fallbackCount,
    priceAggregation: {
      extracted_count: counts && counts.extractedCount != null ? counts.extractedCount : listings.length,
      year_matched_count: counts && counts.yearMatchedCount != null ? counts.yearMatchedCount : listings.length,
      price_available_count: validCount,
      calculation_target_count: reference.calculationTargetCount,
      min_price: validCount ? prices[0] : null,
      max_price: validCount ? prices[validCount - 1] : null,
      simple_average_price: simpleAverage,
      median_price: median,
      trimmed_average_price: reference.trimmedAveragePrice,
      reference_market_price: reference.referencePrice,
      used_base_price_fallback_count: fallbackCount,
      outlier_excluded_count: reference.outlierExcludedCount,
      outlier_excluded_prices: reference.outlierExcludedPrices,
      abnormal_excluded_prices: excludedPriceItems,
      calculation_method: reference.calculationMethod,
      price_warning: priceWarning
    },
    listings: listings,
    warnings: buildBikeMarketWarnings_(sourcesMap, priceWarning),
    errorMessage: errorMessage,
    status: status,
    noDataReason: noDataReason,
    fetchedAt: fetchedAt
  };
}

function getValidatedBikeMarketListingPrice_(bikeName, listing) {
  var result = {
    price: null,
    usedBasePriceFallback: false,
    excludedPrices: []
  };
  var totalPrice = strictBikeMarketNumber_(listing && listing.totalPriceYen);
  var basePrice = strictBikeMarketNumber_(listing && (listing.basePriceYen || listing.vehiclePriceYen));
  var selectedPrice = strictBikeMarketNumber_(listing && listing.selectedPriceYen);
  var totalValid = totalPrice && isBikeMarketPriceInValidRange_(totalPrice, bikeName);
  var baseValid = basePrice && isBikeMarketPriceInValidRange_(basePrice, bikeName);

  if (totalPrice && !totalValid) {
    result.excludedPrices.push(buildBikeMarketExcludedPriceItem_(listing, totalPrice, 'PRICE_OUT_OF_RANGE'));
  }
  if (basePrice && !baseValid) {
    result.excludedPrices.push(buildBikeMarketExcludedPriceItem_(listing, basePrice, 'PRICE_OUT_OF_RANGE'));
  }

  if (selectedPrice && isBikeMarketPriceInValidRange_(selectedPrice, bikeName)) {
    result.price = selectedPrice;
    result.usedBasePriceFallback = Boolean(!totalValid && baseValid && selectedPrice === basePrice);
    return result;
  }
  if (totalValid) {
    result.price = totalPrice;
    return result;
  }
  if (baseValid) {
    result.price = basePrice;
    result.usedBasePriceFallback = true;
    return result;
  }
  return result;
}

function buildBikeMarketExcludedPriceItem_(listing, price, reason) {
  return {
    price: price,
    reason: reason || 'PRICE_OUT_OF_RANGE',
    title: listing && (listing.title || listing.modelName) || '',
    url: listing && listing.url || ''
  };
}

function averageBikeMarketPrices_(prices) {
  if (!prices || prices.length === 0) {
    return null;
  }
  var total = prices.reduce(function(sum, price) { return sum + price; }, 0);
  return Math.round(total / prices.length);
}

function medianBikeMarketPrices_(sortedPrices) {
  if (!sortedPrices || sortedPrices.length === 0) {
    return null;
  }
  var middle = Math.floor(sortedPrices.length / 2);
  if (sortedPrices.length % 2 === 0) {
    return Math.round((sortedPrices[middle - 1] + sortedPrices[middle]) / 2);
  }
  return sortedPrices[middle];
}

function calculateReferenceBikeMarketPrice_(sortedPrices, median) {
  var count = sortedPrices.length;
  if (count === 0) {
    return {
      referencePrice: null,
      trimmedAveragePrice: null,
      calculationTargetCount: 0,
      outlierExcludedCount: 0,
      outlierExcludedPrices: [],
      calculationMethod: ''
    };
  }
  var filtered = sortedPrices.slice();
  var method = 'single_price';
  if (count === 1) {
    method = 'single_price';
  } else if (count === 2) {
    method = 'simple_average_2_items';
  } else if (count >= 3 && count <= 6) {
    method = 'median_3_to_6_items';
  } else if (count >= 7 && count <= 9) {
    method = 'trimmed_average_7_to_9_items';
    filtered = sortedPrices.slice(1, sortedPrices.length - 1);
  } else {
    method = 'iqr_filtered_average_10_plus';
    filtered = filterBikeMarketPricesByIqr_(sortedPrices);
    if (filtered.length === 0) {
      method = 'median_fallback';
    }
  }

  var excluded = getExcludedBikeMarketPrices_(sortedPrices, filtered);
  var trimmedAverage = filtered.length ? averageBikeMarketPrices_(filtered) : null;
  var reference;
  if (count === 1) {
    reference = sortedPrices[0];
  } else if (count === 2) {
    reference = averageBikeMarketPrices_(sortedPrices);
  } else if (count >= 3 && count <= 6) {
    reference = median;
  } else if (filtered.length === 0) {
    reference = median;
  } else {
    reference = trimmedAverage;
  }

  return {
    referencePrice: roundBikeMarketReferencePrice_(reference),
    trimmedAveragePrice: trimmedAverage,
    calculationTargetCount: filtered.length || (method === 'median_fallback' ? 0 : count),
    outlierExcludedCount: excluded.length,
    outlierExcludedPrices: excluded,
    calculationMethod: method
  };
}

function filterBikeMarketPricesByIqr_(sortedPrices) {
  var q1 = percentileBikeMarketPrice_(sortedPrices, 0.25);
  var q3 = percentileBikeMarketPrice_(sortedPrices, 0.75);
  var iqr = q3 - q1;
  var lower = q1 - 1.5 * iqr;
  var upper = q3 + 1.5 * iqr;
  return sortedPrices.filter(function(price) {
    return price >= lower && price <= upper;
  });
}

function percentileBikeMarketPrice_(sortedPrices, ratio) {
  if (!sortedPrices.length) {
    return 0;
  }
  var index = (sortedPrices.length - 1) * ratio;
  var lower = Math.floor(index);
  var upper = Math.ceil(index);
  if (lower === upper) {
    return sortedPrices[lower];
  }
  return sortedPrices[lower] + (sortedPrices[upper] - sortedPrices[lower]) * (index - lower);
}

function getExcludedBikeMarketPrices_(sortedPrices, filteredPrices) {
  var remaining = {};
  for (var i = 0; i < filteredPrices.length; i++) {
    var key = String(filteredPrices[i]);
    remaining[key] = (remaining[key] || 0) + 1;
  }
  var excluded = [];
  for (var j = 0; j < sortedPrices.length; j++) {
    var priceKey = String(sortedPrices[j]);
    if (remaining[priceKey]) {
      remaining[priceKey]--;
    } else {
      excluded.push(sortedPrices[j]);
    }
  }
  return excluded;
}

function roundBikeMarketReferencePrice_(price) {
  if (!price) {
    return null;
  }
  return Math.round(price / 10000) * 10000;
}

function getBikeMarketPriceRangeWarning_(sortedPrices, referencePrice, outlierExcludedCount, medianPrice) {
  if (!sortedPrices || sortedPrices.length === 0) {
    return '';
  }
  var minPrice = sortedPrices[0];
  var maxPrice = sortedPrices[sortedPrices.length - 1];
  if (!minPrice || !maxPrice) {
    return '';
  }
  if (maxPrice / minPrice >= 3) {
    return '価格幅が大きいため要確認';
  }
  if (Number(outlierExcludedCount || 0) >= 2) {
    return '価格幅が大きいため要確認';
  }
  if (referencePrice && referencePrice >= minPrice * 2) {
    return '価格幅が大きいため要確認';
  }
  if (sortedPrices.length >= 10 && medianPrice && minPrice < medianPrice * 0.5) {
    return '価格幅が大きいため要確認';
  }
  if (sortedPrices.length >= 10 && medianPrice && maxPrice >= medianPrice * 2) {
    return '価格幅が大きいため要確認';
  }
  if (sortedPrices.length >= 10 && referencePrice && minPrice <= referencePrice * 0.5) {
    return '極端な安値があるため要確認';
  }
  return '';
}

function buildBikeMarketWarnings_(sourcesMap, priceWarning) {
  var warnings = [];
  if (sourcesMap && sourcesMap[WEBAPP_BIKE_MARKET_GOOBIKE_SOURCE]) {
    warnings.push('GooBike検索結果から算出しています。表示価格は掲載情報ベースです。');
  } else {
    warnings.push('登録済み相場データから算出しています。');
  }
  if (priceWarning) {
    warnings.push(priceWarning);
  }
  return warnings;
}

function dedupeBikeListings_(listings) {
  var byKey = {};
  var order = [];
  var result = [];
  for (var i = 0; i < listings.length; i++) {
    var listing = listings[i];
    if (isBikeMarketPriceRelationInvalid_(listing)) {
      continue;
    }
    var key = getBikeListingDedupeKey_(listing);
    if (!key) {
      result.push(listing);
      continue;
    }
    if (!byKey[key]) {
      byKey[key] = listing;
      order.push(key);
      continue;
    }
    byKey[key] = chooseBikeMarketListingForDuplicate_(byKey[key], listing);
  }
  for (var j = 0; j < order.length; j++) {
    result.push(byKey[order[j]]);
  }
  return result;
}

function dedupeBikeParsedListings_(listings) {
  var byKey = {};
  var order = [];
  var result = [];
  for (var i = 0; i < listings.length; i++) {
    var listing = listings[i];
    var key = getBikeListingDedupeKey_(listing);
    if (!key) {
      result.push(listing);
      continue;
    }
    if (!byKey[key]) {
      byKey[key] = listing;
      order.push(key);
    } else {
      byKey[key] = chooseBikeMarketParsedForDuplicate_(byKey[key], listing);
    }
  }
  for (var j = 0; j < order.length; j++) {
    result.push(byKey[order[j]]);
  }
  return result;
}

function getBikeListingDedupeKey_(listing) {
  if (!listing) {
    return '';
  }
  var normalizedUrl = normalizeGoobikeDetailUrl_(listing.url || '').replace(/[?#].*$/, '');
  if (normalizedUrl) {
    return normalizedUrl;
  }
  return [
    normalizeBikeMarketKeyPart_(listing.title || listing.modelName || ''),
    listing.year || (listing.years && listing.years.length ? listing.years.join('-') : ''),
    listing.totalPriceYen || '',
    listing.basePriceYen || ''
  ].join('|');
}

function chooseBikeMarketListingForDuplicate_(current, candidate) {
  if (!current) {
    return candidate;
  }
  if (!candidate) {
    return current;
  }
  var currentScore = scoreBikeMarketListingForMerge_(current);
  var candidateScore = scoreBikeMarketListingForMerge_(candidate);
  if (candidateScore > currentScore) {
    return mergeBikeMarketListings_(current, candidate);
  }
  return mergeBikeMarketListings_(candidate, current);
}

function scoreBikeMarketListingForMerge_(listing) {
  if (!listing) {
    return 0;
  }
  var score = 0;
  if (listing.extractionSource === 'list' && listing.selectedPriceYen) score += 50;
  if (listing.extractionSource === 'list' && listing.totalPriceYen) score += 20;
  if (listing.selectedPriceYen) score += 40;
  if (listing.totalPriceYen) score += 30;
  if (listing.basePriceYen || listing.vehiclePriceYen) score += 20;
  if (listing.year) score += 10;
  if (listing.mileageKm) score += 5;
  if (listing.shopName) score += 3;
  if (listing.title || listing.modelName) score += 2;
  return score;
}

function mergeBikeMarketListings_(primary, secondary) {
  var merged = {};
  var keys = [
    'source', 'title', 'modelName', 'year', 'basePriceYen', 'vehiclePriceYen',
    'totalPriceYen', 'warrantyTotalPriceYen', 'selectedPriceYen',
    'selectedPriceReason', 'priceMissingReason', 'priceValidationResult', 'cardDebug',
    'mileageKm', 'shopName', 'prefecture', 'url', 'fetchedAt', 'extractionSource'
  ];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    merged[key] = primary && primary[key] ? primary[key] : (secondary && secondary[key] ? secondary[key] : '');
  }
  if (primary && primary.totalPriceYen && secondary && secondary.totalPriceYen && primary.totalPriceYen !== secondary.totalPriceYen) {
    merged.selectedPriceYen = primary.totalPriceYen;
    merged.selectedPriceReason = primary.selectedPriceReason || '支払総額';
  }
  if (merged.selectedPriceYen) {
    merged.priceMissingReason = '';
    if (!merged.selectedPriceReason) {
      merged.selectedPriceReason = merged.totalPriceYen ? '支払総額' : '車両価格';
    }
  } else if (!merged.priceMissingReason && merged.warrantyTotalPriceYen) {
    merged.priceMissingReason = '保証付きプラン価格のみ';
  }
  return merged;
}

function chooseBikeMarketParsedForDuplicate_(current, candidate) {
  if (!current) {
    return candidate;
  }
  if (!candidate) {
    return current;
  }
  var currentScore = scoreBikeMarketListingForMerge_(current);
  var candidateScore = scoreBikeMarketListingForMerge_(candidate);
  if (candidateScore > currentScore) {
    return candidate;
  }
  return current;
}

function isBikeMarketPriceRelationInvalid_(listing) {
  if (!listing || !listing.basePriceYen || !listing.totalPriceYen) {
    return false;
  }
  return listing.basePriceYen > listing.totalPriceYen && (listing.basePriceYen - listing.totalPriceYen) > 50000;
}

function parseJapanesePriceToYen_(value) {
  var text = trimFullWidth(String(value || ''));
  if (text === '' || /ASK|価格応談|売約済み|商談中|価格未掲載/i.test(text)) {
    return null;
  }
  var normalized = normalizeGoobikePriceScanText_(text);
  var manMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (manMatch) {
    return Math.round(Number(manMatch[1]) * 10000);
  }
  var yenMatch = normalized.match(/([0-9]{5,})\s*円?/);
  if (yenMatch) {
    return Number(yenMatch[1]);
  }
  return null;
}

function parsePriceToYen_(value) {
  return parseJapanesePriceToYen_(value);
}

function parseYenNumber_(value) {
  var number = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function normalizeYearInput_(value) {
  var text = trimFullWidth(String(value || ''))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[．。]/g, '.')
    .replace(/\s+/g, '');
  var unspecifiedTerms = {
    '': true,
    '特になし': true,
    'なし': true,
    '未指定': true,
    '不明': true,
    '年式なし': true,
    '年式未指定': true,
    'なるべく新しめ': true,
    '新しめ': true,
    '高年式': true,
    '最近の年式': true
  };
  if (unspecifiedTerms[text]) {
    return { raw: text, cachePart: '', from: null, to: null, unspecified: true, valid: true };
  }
  var rangeMatch = text.match(/^(.+?)[〜～~-](.+)$/);
  if (rangeMatch) {
    var rangeFrom = parseSingleBikeMarketYear_(rangeMatch[1]);
    var rangeTo = parseSingleBikeMarketYear_(rangeMatch[2]);
    if (!rangeFrom || !rangeTo) {
      return { raw: text, cachePart: text, from: null, to: null, unspecified: false, valid: false };
    }
    var from = Math.min(rangeFrom, rangeTo);
    var to = Math.max(rangeFrom, rangeTo);
    return { raw: text, cachePart: from + '-' + to, from: from, to: to, unspecified: false, valid: true };
  }
  var year = parseSingleBikeMarketYear_(text);
  if (year) {
    return { raw: text, cachePart: String(year), from: year, to: year, unspecified: false, valid: true };
  }
  return { raw: text, cachePart: text, from: null, to: null, unspecified: false, valid: false };
}

function parseSingleBikeMarketYear_(value) {
  var text = trimFullWidth(String(value || ''))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/\s+/g, '')
    .replace(/年式$/, '')
    .replace(/年$/, '');
  var heiseiMatch = text.match(/^(?:平成|H|h)(\d+)$/);
  if (heiseiMatch) {
    return 1988 + Number(heiseiMatch[1]);
  }
  var reiwaGannenMatch = text.match(/^(?:令和元|R元|r元)$/);
  if (reiwaGannenMatch) {
    return 2019;
  }
  var reiwaMatch = text.match(/^(?:令和|R|r)(\d+)$/);
  if (reiwaMatch) {
    return 2018 + Number(reiwaMatch[1]);
  }
  var showaMatch = text.match(/^(?:昭和|S|s)(\d+)$/);
  if (showaMatch) {
    return 1925 + Number(showaMatch[1]);
  }
  var yearMatch = text.match(/^(19\d{2}|20\d{2})$/);
  if (yearMatch) {
    return Number(yearMatch[1]);
  }
  var embeddedYearMatch = text.match(/(19\d{2}|20\d{2})/);
  return embeddedYearMatch ? Number(embeddedYearMatch[1]) : null;
}

function parseBikeMarketYearNumber_(value) {
  var normalized = normalizeYearInput_(value);
  return normalized.valid && normalized.from === normalized.to ? normalized.from : null;
}

function isYearMatched_(listingYear, normalizedYear) {
  if (!normalizedYear.valid) {
    return false;
  }
  if (normalizedYear.unspecified || (!normalizedYear.from && !normalizedYear.to)) {
    return true;
  }
  if (!listingYear) {
    return false;
  }
  return listingYear >= normalizedYear.from && listingYear <= normalizedYear.to;
}

function normalizeBikeMarketKeyPart_(value) {
  var text = normalizeBikeMarketNameText_(value)
    .toLowerCase()
    .replace(/ニンジャ/g, 'ninja')
    .replace(/カワサキ/g, 'kawasaki')
    .replace(/[χΧ]/g, 'x')
    .replace(/[−ー－‐‑‒–—―ｰ-]/g, '-')
    .replace(/^(honda|yamaha|suzuki|kawasaki|bmw|ducati|triumph|harley|harleydavidson|ktm|aprilia|vespa|indian|mvagusta|husqvarna|ホンダ|ヤマハ|スズキ|カワサキ|ドゥカティ|ドカティ|トライアンフ|ハーレーダビッドソン|ハーレー|アプリリア|ベスパ|インディアン|ハスクバーナ)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[・･\-_/]/g, '')
    .replace(/[^a-z0-9ぁ-んァ-ヶ一-龥]/g, '');
  return text;
}

function normalizeBikeMarketNameText_(value) {
  var text = trimFullWidth(String(value || ''));
  try {
    text = text.normalize('NFKC');
  } catch (error) {
    text = text.replace(/[Ａ-Ｚａ-ｚ０-９．]/g, function(char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
  }
  return text;
}

function getDefaultBikeModelPrioritySearchWord_(canonicalKey) {
  var priorities = {
    ninjazx4rse: 'Ninja ZX-4R SE',
    bmws1000r: 'BMW S1000R',
    dragstar250: 'ドラッグスター 250',
    skywave250: 'スカイウェイブ 250',
    cygnus: 'シグナス',
    adv160: 'ADV160',
    zephyr400: 'ZEPHYR400',
    zephyr1100: 'ZEPHYR1100',
    zephyrx: 'ゼファーX',
    ninja400: 'Ninja 400',
    eliminator250v: 'エリミネーター250V',
    eliminator400: 'エリミネーター400',
    gsr250: 'GSR250',
    bandit250: 'Bandit250',
    yzfr1: 'YZF-R1',
    zzr1400: 'ZZR1400',
    magna50: 'マグナ50',
    supercub110pro: 'スーパーカブ110プロ',
    hornet250: 'HORNET250',
    cb400t: 'CB400T',
    cb400r: 'CB400R',
    cbr400r: 'CBR400R',
    gsx1300rhayabusa: 'GSX1300R Hayabusa',
    flhxs: 'Street Glide Special'
  };
  return priorities[canonicalKey] || canonicalKey;
}

function getDefaultBikeModelDictionaryEntries_() {
  var entries = [];
  Object.keys(BIKE_MODEL_ALIASES).forEach(function(canonicalKey) {
    entries.push({
      canonicalKey: canonicalKey,
      canonicalName: canonicalKey,
      aliases: BIKE_MODEL_ALIASES[canonicalKey].slice(),
      excludes: (BIKE_MODEL_EXCLUDES[canonicalKey] || []).slice(),
      prioritySearchWord: getDefaultBikeModelPrioritySearchWord_(canonicalKey),
      source: 'default',
      rowNumber: ''
    });
  });
  return entries;
}

function splitBikeModelDictionaryText_(value) {
  return String(value || '')
    .split(/[\n,、]+/)
    .map(function(item) { return trimFullWidth(item); })
    .filter(function(item) { return item !== ''; });
}

function addBikeModelDictionaryValues_(target, values) {
  var seen = {};
  target.forEach(function(value) {
    seen[normalizeBikeMarketKeyPart_(value)] = true;
  });
  values.forEach(function(value) {
    var key = normalizeBikeMarketKeyPart_(value);
    if (key && !seen[key]) {
      target.push(value);
      seen[key] = true;
    }
  });
}

function getBikeModelDictionaryEntries_() {
  if (WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE) {
    return WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE;
  }
  var entries = getDefaultBikeModelDictionaryEntries_();
  var byCanonical = {};
  entries.forEach(function(entry) {
    byCanonical[normalizeBikeMarketKeyPart_(entry.canonicalName)] = entry;
    byCanonical[normalizeBikeMarketKeyPart_(entry.canonicalKey)] = entry;
  });

  var sheet = getOrCreateBikeModelDictionarySheet_();
  if (sheet.getLastRow() <= 1) {
    WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = entries;
    return entries;
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS.length).getDisplayValues();
  rows.forEach(function(row, index) {
    var canonicalName = trimFullWidth(row[0]);
    if (!canonicalName) {
      return;
    }
    var canonicalKey = normalizeBikeMarketKeyPart_(canonicalName);
    var entry = byCanonical[canonicalKey];
    if (!entry) {
      entry = {
        canonicalKey: canonicalKey,
        canonicalName: canonicalName,
        aliases: [],
        excludes: [],
        prioritySearchWord: '',
        source: 'sheet',
        rowNumber: index + 2,
        updatedAt: row[4] || ''
      };
      entries.push(entry);
      byCanonical[canonicalKey] = entry;
    }
    addBikeModelDictionaryValues_(entry.aliases, [canonicalName].concat(splitBikeModelDictionaryText_(row[1])));
    addBikeModelDictionaryValues_(entry.excludes, splitBikeModelDictionaryText_(row[2]));
    if (trimFullWidth(row[3])) {
      entry.prioritySearchWord = trimFullWidth(row[3]);
    }
    entry.rowNumber = index + 2;
    entry.source = entry.source === 'default' ? 'default+sheet' : 'sheet';
    entry.updatedAt = row[4] || entry.updatedAt || '';
  });
  WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = entries;
  return entries;
}

function getBikeModelDictionaryAdminData(auth) {
  assertMarketAdminPasscode_(auth);
  var entries = getBikeModelDictionaryEntries_();
  return {
    columns: WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS,
    entries: entries.map(function(entry) {
      return {
        rowNumber: entry.rowNumber || '',
        source: entry.source || '',
        canonicalName: entry.canonicalName || entry.canonicalKey,
        canonicalKey: entry.canonicalKey,
        aliasesText: (entry.aliases || []).join(', '),
        excludesText: (entry.excludes || []).join(', '),
        prioritySearchWord: entry.prioritySearchWord || '',
        updatedAt: entry.updatedAt || '',
        registeredCount: (entry.aliases || []).length
      };
    })
  };
}

function saveBikeModelDictionaryEntry(payload, auth) {
  assertMarketAdminPasscode_(auth);
  var canonicalName = trimFullWidth(String(payload && payload.canonicalName || ''));
  if (!canonicalName) {
    throw new Error('代表車種名を入力してください。');
  }
  var aliases = splitBikeModelDictionaryText_(payload && payload.aliasesText);
  var excludes = splitBikeModelDictionaryText_(payload && payload.excludesText);
  var prioritySearchWord = trimFullWidth(String(payload && payload.prioritySearchWord || ''));
  var sheet = getOrCreateBikeModelDictionarySheet_();
  var now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var canonicalKey = normalizeBikeMarketKeyPart_(canonicalName);
  var rowNumber = null;
  if (sheet.getLastRow() > 1) {
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS.length).getDisplayValues();
    for (var i = 0; i < rows.length; i++) {
      if (normalizeBikeMarketKeyPart_(rows[i][0]) === canonicalKey) {
        rowNumber = i + 2;
        break;
      }
    }
  }
  var row = [
    canonicalName,
    aliases.join(', '),
    excludes.join(', '),
    prioritySearchWord,
    now
  ];
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    rowNumber = sheet.getLastRow();
  }
  WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = null;
  clearBikeMarketCache_();
  return {
    message: '車種名辞書を保存しました。相場キャッシュを削除しました。',
    rowNumber: rowNumber,
    data: getBikeModelDictionaryAdminData(auth)
  };
}

function updateBikeModelDictionaryFromCandidate(payload, auth) {
  assertMarketAdminPasscode_(auth);
  var canonicalName = trimFullWidth(String(payload && payload.canonicalName || payload && payload.inputBikeName || ''));
  var value = trimFullWidth(String(payload && payload.value || ''));
  var action = String(payload && payload.action || '');
  if (!canonicalName) {
    throw new Error('代表車種名を指定してください。');
  }
  if (!value) {
    throw new Error('追加する候補が空です。');
  }
  var existing = getBikeModelDictionaryAdminData(auth).entries.filter(function(entry) {
    return normalizeBikeMarketKeyPart_(entry.canonicalName) === normalizeBikeMarketKeyPart_(canonicalName)
      || normalizeBikeMarketKeyPart_(entry.canonicalKey) === normalizeBikeMarketKeyPart_(canonicalName);
  })[0] || {
    canonicalName: canonicalName,
    aliasesText: canonicalName,
    excludesText: '',
    prioritySearchWord: ''
  };
  var aliases = splitBikeModelDictionaryText_(existing.aliasesText);
  var excludes = splitBikeModelDictionaryText_(existing.excludesText);
  var priority = existing.prioritySearchWord || '';
  if (action === 'alias') {
    addBikeModelDictionaryValues_(aliases, [value]);
  } else if (action === 'exclude') {
    addBikeModelDictionaryValues_(excludes, [value]);
  } else if (action === 'priority') {
    priority = value;
    addBikeModelDictionaryValues_(aliases, [value]);
  } else {
    throw new Error('辞書更新の種類が不正です。');
  }
  return saveBikeModelDictionaryEntry({
    canonicalName: existing.canonicalName || canonicalName,
    aliasesText: aliases.join(', '),
    excludesText: excludes.join(', '),
    prioritySearchWord: priority
  }, auth);
}

function deleteBikeModelDictionaryEntry(canonicalName, auth) {
  assertMarketAdminPasscode_(auth);
  var key = normalizeBikeMarketKeyPart_(canonicalName);
  if (!key) {
    throw new Error('削除する代表車種名を指定してください。');
  }
  var sheet = getOrCreateBikeModelDictionarySheet_();
  if (sheet.getLastRow() <= 1) {
    throw new Error('削除できる登録辞書がありません。');
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS.length).getDisplayValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeBikeMarketKeyPart_(rows[i][0]) === key) {
      sheet.deleteRow(i + 2);
      WEBAPP_BIKE_MODEL_DICTIONARY_RUNTIME_CACHE = null;
      clearBikeMarketCache_();
      return {
        message: '車種名辞書を削除しました。相場キャッシュを削除しました。',
        data: getBikeModelDictionaryAdminData(auth)
      };
    }
  }
  throw new Error('固定辞書または未登録のため削除できません。編集で上書きしてください。');
}

function getOrCreateBikeModelDictionarySheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MODEL_DICTIONARY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_BIKE_MODEL_DICTIONARY_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_BIKE_MODEL_DICTIONARY_COLUMNS);
  return sheet;
}

function normalizeModelName(value) {
  return normalizeBikeMarketKeyPart_(value)
    .replace(/cc$/i, '')
    .replace(/^[0-9]+/, '');
}

function getGoobikeModelMasterAdminData(limit, auth) {
  assertMarketAdminPasscode_(auth);
  ensureGoobikeModelMasterSeedRows_();
  var rows = getGoobikeModelMasterRows_();
  return {
    columns: WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS,
    totalCount: rows.length,
    rows: rows.slice(0, limit || 300)
  };
}

function ensureGoobikeModelMasterSeedRows_() {
  var sheet = getOrCreateGoobikeModelMasterSheet_();
  if (sheet.getLastRow() > 1) {
    return;
  }
  var rows = getGoobikeModelMasterSeedRows_(Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'));
  writeGoobikeModelMasterRows_(rows);
  WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = rows;
}

function refreshGoobikeModelMasterForAdmin(auth) {
  assertMarketAdminPasscode_(auth);
  var now = new Date();
  var updatedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var rows = [];
  var errors = [];

  getGoobikeModelMasterSeedRows_(updatedAt).forEach(function(row) {
    rows.push(row);
  });

  GOOBIKE_MODEL_MASTER_MAKER_PAGES.forEach(function(page) {
    try {
      var html = fetchGoobikeTextOnce_(page.url, {
        referer: WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + '/'
      });
      rows = rows.concat(parseGoobikeModelMasterRowsFromHtml_(html, page.maker, page.url, updatedAt));
    } catch (error) {
      errors.push(page.maker + ': ' + (error && error.message ? error.message : String(error)));
    }
  });

  rows = mergeGoobikeModelMasterRows_(rows);
  rows = refreshSeedGoobikeModelMasterListingCounts_(rows, updatedAt, errors);
  rows = mergeGoobikeModelMasterRows_(rows);
  writeGoobikeModelMasterRows_(rows);
  WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = null;
  clearBikeMarketCache_();
  return {
    message: 'GooBike車種マスタを更新しました。登録件数：' + rows.length + '件',
    totalCount: rows.length,
    errors: errors,
    rows: rows.slice(0, 300)
  };
}

function getGoobikeModelMasterRows_() {
  if (WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE) {
    return WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE;
  }
  var sheet = getOrCreateGoobikeModelMasterSheet_();
  if (sheet.getLastRow() <= 1) {
    var seedRows = getGoobikeModelMasterSeedRows_(Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'));
    WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = seedRows;
    return seedRows;
  }
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS.length).getDisplayValues();
  var rows = values.map(function(row, index) {
    return normalizeGoobikeModelMasterRow_({
      maker: row[0],
      officialModelName: row[1],
      normalizedModelName: row[2],
      listingCount: parseYenNumber_(row[3]),
      sourceUrl: row[4],
      updatedAt: row[5],
      rowNumber: index + 2
    });
  }).filter(function(row) {
    return row.officialModelName && row.normalizedModelName;
  });
  WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE = rows.length ? rows : getGoobikeModelMasterSeedRows_(Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'));
  return WEBAPP_GOOBIKE_MODEL_MASTER_RUNTIME_CACHE;
}

function getGoobikeModelMasterSeedRows_(updatedAt) {
  return GOOBIKE_MODEL_MASTER_SEEDS.map(function(seed) {
    return normalizeGoobikeModelMasterRow_({
      maker: seed.maker,
      officialModelName: seed.officialModelName,
      normalizedModelName: normalizeModelName(seed.officialModelName),
      listingCount: seed.listingCount || 0,
      sourceUrl: seed.sourceUrl,
      updatedAt: updatedAt || ''
    });
  });
}

function normalizeGoobikeModelMasterRow_(row) {
  var officialModelName = trimFullWidth(String(row && (row.officialModelName || row.official_model_name) || ''));
  var normalized = trimFullWidth(String(row && (row.normalizedModelName || row.normalized_model_name) || '')) || normalizeModelName(officialModelName);
  return {
    maker: trimFullWidth(String(row && row.maker || '')),
    officialModelName: officialModelName,
    normalizedModelName: normalizeModelName(normalized || officialModelName),
    listingCount: Number(row && (row.listingCount || row.listing_count) || 0) || 0,
    sourceUrl: trimFullWidth(String(row && (row.sourceUrl || row.source_url) || '')),
    updatedAt: trimFullWidth(String(row && (row.updatedAt || row.updated_at) || '')),
    rowNumber: row && row.rowNumber ? row.rowNumber : ''
  };
}

function inferBikeMakerFromName_(value) {
  var text = normalizeBikeMarketNameText_(value).toLowerCase();
  var key = normalizeBikeMarketKeyPart_(value);
  var checks = [
    { maker: 'カワサキ', patterns: ['kawasaki', 'ninja', 'ニンジャ', 'zephyr', 'ゼファー', 'zrx', 'zzr', 'エリミネーター', 'eliminator', 'バリオス'] },
    { maker: 'ホンダ', patterns: ['honda', 'cb', 'cbr', 'pcx', 'adv', 'magna', 'マグナ', 'hornet', 'ホーネット', 'cub', 'カブ', 'dax', 'ct', 'crf'] },
    { maker: 'ヤマハ', patterns: ['yamaha', 'yzf', 'ybr', 'nmax', 'xmax', 'シグナス', 'cygnus', 'ドラッグスター', 'dragstar', 'majesty', 'マジェスティ', 'sr400', 'sr500', 'セロー', 'wr'] },
    { maker: 'スズキ', patterns: ['suzuki', 'gsx', 'gsr', 'hayabusa', 'ハヤブサ', '隼', 'バンディット', 'bandit', 'スカイウェイブ', 'skywave', 'アドレス', 'vストローム', 'vstrom', 'ジクサー', 'gixxer'] },
    { maker: 'BMW', patterns: ['bmw', 's1000r', 'r1250', 'r1300', 'k1600', 'g310'] },
    { maker: 'HARLEY-DAVIDSON', patterns: ['harley', 'flh', 'flhx', 'flhxs', 'flht', 'flhtcu', 'flhtk', 'fltr', 'fltrxs', 'fxdl', 'fxd', 'fxlrs', 'xl', 'ストリートグライド', 'エレクトラグライド', 'ローライダー', 'スポーツスター', 'ウルトラ'] }
  ];
  for (var i = 0; i < checks.length; i++) {
    for (var p = 0; p < checks[i].patterns.length; p++) {
      var pattern = checks[i].patterns[p].toLowerCase();
      var patternKey = normalizeBikeMarketKeyPart_(pattern);
      if ((pattern && text.indexOf(pattern) !== -1) || (patternKey && key.indexOf(patternKey) !== -1)) {
        return checks[i].maker;
      }
    }
  }
  return '';
}

function normalizeBikeMakerName_(value) {
  var text = normalizeBikeMarketNameText_(value).toLowerCase().replace(/[\s・･_\-]/g, '');
  if (!text) return '';
  if (text.indexOf('harley') !== -1 || text.indexOf('ハーレ') !== -1) return 'HARLEY-DAVIDSON';
  if (text.indexOf('bmw') !== -1 || text.indexOf('ビーエム') !== -1) return 'BMW';
  if (text.indexOf('honda') !== -1 || text.indexOf('ホンダ') !== -1) return 'ホンダ';
  if (text.indexOf('yamaha') !== -1 || text.indexOf('ヤマハ') !== -1) return 'ヤマハ';
  if (text.indexOf('suzuki') !== -1 || text.indexOf('スズキ') !== -1) return 'スズキ';
  if (text.indexOf('kawasaki') !== -1 || text.indexOf('カワサキ') !== -1) return 'カワサキ';
  return trimFullWidth(String(value || ''));
}

function extractBikeModelDisplacement_(value) {
  var text = normalizeBikeMarketNameText_(value).toLowerCase();
  if (/fifty|フィフティ/.test(text)) {
    return 50;
  }
  var matches = text.match(/\d{2,4}/g) || [];
  for (var i = 0; i < matches.length; i++) {
    var number = Number(matches[i]);
    if (!number || (number >= 1900 && number <= 2099)) {
      continue;
    }
    if (number >= 50 && number <= 2000) {
      return number;
    }
  }
  return null;
}

function isLikelyBareBikeModelCode_(value) {
  var text = normalizeBikeMarketNameText_(value)
    .replace(/[ 　・･_\-]/g, '')
    .toUpperCase();
  if (!text) {
    return false;
  }
  if (/^(CJ4[456]A|JA\d{2,3}|ZX400P|MC31|NC56|SC59|AC13)$/.test(text)) {
    return true;
  }
  return /^[A-Z]{1,4}\d{2,4}[A-Z]?$/.test(text);
}

function isGoobikeOfficialModelDisplayableCandidate_(row) {
  var official = trimFullWidth(String(row && row.officialModelName || ''));
  if (!official) {
    return false;
  }
  if (Number(row && row.listingCount || 0) < 1) {
    return false;
  }
  if (isLikelyBareBikeModelCode_(official)) {
    return false;
  }
  return true;
}

function getBikeDisplacementTolerance_(cc) {
  if (!cc) return null;
  if (cc <= 50) return 25;
  if (cc <= 125) return 50;
  if (cc <= 250) return 75;
  if (cc <= 400) return 100;
  if (cc <= 750) return 200;
  return 300;
}

function extractBikeModelMajorTerms_(value) {
  var text = normalizeBikeMarketNameText_(value).toLowerCase();
  var key = normalizeBikeMarketKeyPart_(value);
  var definitions = [
    { term: 'zephyr', patterns: ['zephyr', 'ゼファー'] },
    { term: 'ninja', patterns: ['ninja', 'ニンジャ'] },
    { term: 'magna', patterns: ['magna', 'マグナ'] },
    { term: 'eliminator', patterns: ['eliminator', 'エリミネーター'] },
    { term: 'electra_glide', patterns: ['electra glide', 'エレクトラグライド', 'flht', 'flhtcu', 'flhtk'] },
    { term: 'ultra', patterns: ['ultra', 'ウルトラ', 'flhtcu', 'flhtk'] },
    { term: 'street_glide', patterns: ['street glide', 'ストリートグライド', 'flhxs'] },
    { term: 'road_glide', patterns: ['road glide', 'ロードグライド', 'fltr', 'fltrxs'] },
    { term: 'low_rider', patterns: ['low rider', 'ローライダー', 'fxlrs', 'fxdl'] },
    { term: 's1000r', patterns: ['s1000r', 's 1000 r'] },
    { term: 'gsr', patterns: ['gsr'] },
    { term: 'gsx', patterns: ['gsx', 'hayabusa', 'ハヤブサ', '隼'] },
    { term: 'yzfr1', patterns: ['yzf-r1', 'yzfr1', 'yzf r1'] },
    { term: 'cbr', patterns: ['cbr'] },
    { term: 'cb', patterns: ['cb'] },
    { term: 'adv', patterns: ['adv'] },
    { term: 'cub', patterns: ['cub', 'カブ', 'c110'] },
    { term: 'hornet', patterns: ['hornet', 'ホーネット'] },
    { term: 'skywave', patterns: ['skywave', 'スカイウェイブ', 'cj44a', 'cj45a', 'cj46a'] },
    { term: 'dragstar', patterns: ['dragstar', 'drag star', 'ドラッグスター', 'xvs'] },
    { term: 'cygnus', patterns: ['cygnus', 'シグナス'] },
    { term: 'zzr', patterns: ['zzr', 'zx14r', 'zx-14r'] }
  ];
  var terms = [];
  definitions.forEach(function(definition) {
    for (var i = 0; i < definition.patterns.length; i++) {
      var pattern = definition.patterns[i];
      var patternKey = normalizeBikeMarketKeyPart_(pattern);
      if ((pattern && text.indexOf(pattern) !== -1) || (patternKey && key.indexOf(patternKey) !== -1)) {
        if (terms.indexOf(definition.term) === -1) {
          terms.push(definition.term);
        }
        return;
      }
    }
  });
  if (terms.indexOf('cbr') !== -1 && terms.indexOf('cb') !== -1) {
    terms.splice(terms.indexOf('cb'), 1);
  }
  return terms;
}

function buildBikeModelCandidateProfile_(value, maker) {
  return {
    raw: trimFullWidth(String(value || '')),
    normalized: normalizeModelName(value),
    maker: normalizeBikeMakerName_(maker || '') || inferBikeMakerFromName_(value),
    displacement: extractBikeModelDisplacement_(value),
    majorTerms: extractBikeModelMajorTerms_(value)
  };
}

function hasBikeModelMajorTermIntersection_(a, b) {
  var left = a || [];
  var right = b || [];
  for (var i = 0; i < left.length; i++) {
    if (right.indexOf(left[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function analyzeGoobikeModelMasterCandidate_(inputProfile, inputKeys, row) {
  var candidateProfile = buildBikeModelCandidateProfile_(
    [row.officialModelName, row.normalizedModelName].filter(Boolean).join(' '),
    row.maker
  );
  var score = 0;
  var reasons = [];
  var excludeReasons = [];
  if (!isGoobikeOfficialModelDisplayableCandidate_(row)) {
    if (!row || !row.officialModelName) {
      excludeReasons.push('GooBike正式車種名なし');
    } else if (Number(row.listingCount || 0) < 1) {
      excludeReasons.push('掲載件数なし');
    } else if (isLikelyBareBikeModelCode_(row.officialModelName)) {
      excludeReasons.push('型式のみ');
    }
  }
  var modelKey = normalizeModelName(row.normalizedModelName || row.officialModelName);
  var normalizedMatched = false;
  for (var i = 0; i < inputKeys.length; i++) {
    var inputKey = inputKeys[i];
    if (!inputKey || inputKey.length < 3 || !modelKey) {
      continue;
    }
    if (inputKey === modelKey) {
      score += 100;
      normalizedMatched = true;
      reasons.push('正規化後一致');
    } else if ((modelKey.indexOf(inputKey) !== -1 || inputKey.indexOf(modelKey) !== -1) && Math.min(inputKey.length, modelKey.length) >= 5) {
      score += 45;
      normalizedMatched = true;
      reasons.push('正規化後部分一致');
    } else {
      var overlap = getBikeModelKeyOverlapScore_(inputKey, modelKey);
      if (overlap >= 0.82 && Math.min(inputKey.length, modelKey.length) >= 6) {
        score += Math.round(35 + overlap * 20);
        reasons.push('正規化後類似');
      }
    }
  }
  var inputMaker = inputProfile.maker || '';
  var candidateMaker = candidateProfile.maker || normalizeBikeMakerName_(row.maker);
  if (inputMaker && candidateMaker) {
    if (inputMaker === candidateMaker) {
      score += 20;
      reasons.push('メーカー一致');
    } else {
      score -= 100;
      excludeReasons.push('メーカー違い');
    }
  }
  var majorMatched = hasBikeModelMajorTermIntersection_(inputProfile.majorTerms, candidateProfile.majorTerms);
  if (inputProfile.majorTerms.length > 0) {
    if (majorMatched) {
      score += 50;
      reasons.push('主要語一致');
    } else {
      score -= 80;
      excludeReasons.push('主要語不一致');
    }
  }
  var inputCc = inputProfile.displacement;
  var candidateCc = candidateProfile.displacement;
  if (inputCc && candidateCc) {
    var diff = Math.abs(inputCc - candidateCc);
    var tolerance = getBikeDisplacementTolerance_(inputCc);
    if (diff <= tolerance) {
      score += 30;
      reasons.push('排気量一致');
    } else if (majorMatched && inputCc > 750 && diff <= tolerance * 3) {
      score += 10;
      reasons.push('同系統の排気量違い');
    } else if (majorMatched && inputCc > 250 && diff <= tolerance * 3) {
      score -= 10;
      reasons.push('同系統の排気量違い');
    } else {
      score -= 50;
      excludeReasons.push('排気量大幅違い');
    }
  } else if (inputCc && !candidateCc && !normalizedMatched) {
    score -= 30;
    excludeReasons.push('候補側排気量不明');
  }
  if (inputCc && inputCc <= 50 && candidateCc && candidateCc > 75) {
    score -= 80;
    excludeReasons.push('50cc系に対して候補排気量が大きすぎる');
  }
  if (inputCc && inputCc <= 50 && !candidateCc && majorMatched) {
    score -= 25;
    excludeReasons.push('50cc系に対して候補側排気量不明');
  }
  if (inputCc && inputCc <= 250 && candidateCc && candidateCc >= 400) {
    score -= 55;
    excludeReasons.push('250cc以下に対して400cc以上');
  }
  if (modelKey.length < 4) {
    score -= 30;
    excludeReasons.push('候補文字列が短すぎる');
  }
  if (normalizedMatched && row.officialModelName) {
    score += 30;
    reasons.push('GooBike正式車種名一致');
  }
  if (inputMaker && !candidateMaker) {
    excludeReasons.push('候補側メーカー不明');
  }
  var showCandidate = score >= WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MIN_SCORE
    && isGoobikeOfficialModelDisplayableCandidate_(row)
    && excludeReasons.indexOf('メーカー違い') === -1
    && excludeReasons.indexOf('候補側メーカー不明') === -1
    && excludeReasons.indexOf('主要語不一致') === -1
    && excludeReasons.indexOf('排気量大幅違い') === -1
    && excludeReasons.indexOf('250cc以下に対して400cc以上') === -1
    && excludeReasons.indexOf('50cc系に対して候補排気量が大きすぎる') === -1;
  if (inputProfile.majorTerms.length > 0 && !majorMatched) {
    showCandidate = false;
  }
  if (inputProfile.majorTerms.length === 0 && !normalizedMatched) {
    showCandidate = false;
    excludeReasons.push('主要語不明かつ正規化一致なし');
  }
  return {
    maker: row.maker || candidateMaker,
    officialModelName: row.officialModelName,
    normalizedModelName: row.normalizedModelName,
    listingCount: row.listingCount || 0,
    sourceUrl: row.sourceUrl || '',
    score: score,
    inputMaker: inputMaker,
    candidateMaker: candidateMaker,
    inputDisplacement: inputCc || '',
    candidateDisplacement: candidateCc || '',
    inputMajorTerms: inputProfile.majorTerms,
    candidateMajorTerms: candidateProfile.majorTerms,
    showCandidate: showCandidate,
    reasons: reasons,
    excludeReasons: excludeReasons
  };
}

function refreshSeedGoobikeModelMasterListingCounts_(rows, updatedAt, errors) {
  var byUrl = {};
  rows.forEach(function(row) {
    if (row.sourceUrl) {
      byUrl[row.sourceUrl] = row;
    }
  });
  GOOBIKE_MODEL_MASTER_SEEDS.forEach(function(seed) {
    if (!seed.sourceUrl || !byUrl[seed.sourceUrl]) {
      return;
    }
    try {
      var html = fetchGoobikeTextOnce_(seed.sourceUrl, {
        referer: WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + '/'
      });
      var count = extractGoobikeDisplayedCount_(html);
      var official = extractGoobikeOfficialModelNameFromPage_(html) || seed.officialModelName;
      rows.push(normalizeGoobikeModelMasterRow_({
        maker: seed.maker,
        officialModelName: official,
        listingCount: count,
        sourceUrl: seed.sourceUrl,
        updatedAt: updatedAt
      }));
    } catch (error) {
      if (errors) {
        errors.push(seed.officialModelName + ': ' + (error && error.message ? error.message : String(error)));
      }
    }
  });
  return rows;
}

function parseGoobikeModelMasterRowsFromHtml_(html, makerName, sourceUrl, updatedAt) {
  var rows = [];
  var source = String(html || '');
  var anchorRegex = /<a\b[^>]*href=["']([^"']*\/maker-[^"']+\/car-[^"']+\/(?:index\.html)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = anchorRegex.exec(source)) !== null) {
    var href = normalizeGoobikeMasterUrl_(match[1]);
    var official = cleanGoobikeOfficialModelName_(htmlToText_(match[2]));
    if (!official) {
      official = extractGoobikeOfficialModelNameFromUrl_(href);
    }
    if (!official || !isLikelyGoobikeOfficialModelName_(official)) {
      continue;
    }
    rows.push(normalizeGoobikeModelMasterRow_({
      maker: makerName,
      officialModelName: official,
      listingCount: extractGoobikeListingCountNearPosition_(source, match.index),
      sourceUrl: href,
      updatedAt: updatedAt
    }));
  }

  var optionRegex = /<option\b[^>]*>([\s\S]*?)<\/option>/gi;
  while ((match = optionRegex.exec(source)) !== null) {
    var optionText = htmlToText_(match[1]);
    var optionName = cleanGoobikeOfficialModelName_(optionText);
    if (!optionName || !isLikelyGoobikeOfficialModelName_(optionName)) {
      continue;
    }
    rows.push(normalizeGoobikeModelMasterRow_({
      maker: makerName,
      officialModelName: optionName,
      listingCount: extractCountFromText_(optionText),
      sourceUrl: sourceUrl,
      updatedAt: updatedAt
    }));
  }
  return rows;
}

function normalizeGoobikeMasterUrl_(url) {
  var text = String(url || '').replace(/&amp;/g, '&');
  if (!text) {
    return '';
  }
  if (text.indexOf('//') === 0) {
    return 'https:' + text;
  }
  if (text.indexOf('http') === 0) {
    return text;
  }
  return WEBAPP_BIKE_MARKET_GOOBIKE_ALTERNATE_BASE_URL + (text.charAt(0) === '/' ? text : '/' + text);
}

function extractGoobikeOfficialModelNameFromUrl_(url) {
  var match = String(url || '').match(/\/car-([^\/?#]+)\//i);
  if (!match) {
    return '';
  }
  return match[1].replace(/_/g, ' ').toUpperCase();
}

function extractGoobikeOfficialModelNameFromPage_(html) {
  var text = htmlToText_(html).replace(/\s+/g, ' ');
  var patterns = [
    /([^\s]+(?:\s+[^\s]+){0,4})\([^)]*\)のバイクを探す/,
    /([^\s]+(?:\s+[^\s]+){0,4})\([^)]*\)のバイク一覧/,
    /([^\s]+(?:\s+[^\s]+){0,4})\([^)]*\)\s*[0-9,]+件がヒット/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    var name = cleanGoobikeOfficialModelName_(match ? match[1] : '');
    if (name) {
      return name;
    }
  }
  return '';
}

function cleanGoobikeOfficialModelName_(value) {
  var text = trimFullWidth(htmlToText_(value))
    .replace(/\([0-9,]+件?\)/g, '')
    .replace(/[0-9,]+件(?:がヒット|中.*表示)?/g, '')
    .replace(/のバイク(?:を探す|一覧).*$/g, '')
    .replace(/新車・中古バイク.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function isLikelyGoobikeOfficialModelName_(value) {
  var text = trimFullWidth(String(value || ''));
  var key = normalizeModelName(text);
  if (!text || key.length < 3 || text.length > 60) {
    return false;
  }
  if (/メーカー|排気量|地域|価格|支払|検索|お気に入り|問い合わせ|カタログ|一覧|次へ|前へ|先頭|最後|指定無し|指定なし/.test(text)) {
    return false;
  }
  return /[0-9A-Za-zＡ-Ｚａ-ｚ０-９ァ-ヶ一-龥χΧ]/.test(text);
}

function extractGoobikeListingCountNearPosition_(source, position) {
  var start = Math.max(0, Number(position || 0) - 120);
  var end = Math.min(String(source || '').length, Number(position || 0) + 220);
  return extractCountFromText_(htmlToText_(String(source || '').slice(start, end)));
}

function extractCountFromText_(value) {
  var text = toHalfWidthText_(String(value || '')).replace(/,/g, '');
  var match = text.match(/([0-9]+)\s*件/);
  return match ? Number(match[1]) || 0 : 0;
}

function mergeGoobikeModelMasterRows_(rows) {
  var byKey = {};
  var order = [];
  (rows || []).forEach(function(row) {
    var normalized = normalizeGoobikeModelMasterRow_(row);
    if (!normalized.officialModelName || !normalized.normalizedModelName) {
      return;
    }
    var key = normalized.maker + '|' + normalized.normalizedModelName;
    if (!byKey[key]) {
      byKey[key] = normalized;
      order.push(key);
      return;
    }
    var current = byKey[key];
    if ((normalized.listingCount || 0) > (current.listingCount || 0)) {
      current.listingCount = normalized.listingCount;
    }
    if (normalized.sourceUrl && (!current.sourceUrl || normalized.sourceUrl.indexOf('/car-') !== -1)) {
      current.sourceUrl = normalized.sourceUrl;
    }
    if (normalized.officialModelName.length > current.officialModelName.length && current.officialModelName.indexOf(' ') !== -1) {
      current.officialModelName = normalized.officialModelName;
    }
    current.updatedAt = normalized.updatedAt || current.updatedAt;
  });
  return order.map(function(key) { return byKey[key]; }).sort(function(a, b) {
    if (a.maker !== b.maker) return a.maker < b.maker ? -1 : 1;
    return a.normalizedModelName < b.normalizedModelName ? -1 : 1;
  });
}

function writeGoobikeModelMasterRows_(rows) {
  var sheet = getOrCreateGoobikeModelMasterSheet_();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS.length).clearContent();
  }
  var values = (rows || []).map(function(row) {
    return [
      row.maker || '',
      row.officialModelName || '',
      row.normalizedModelName || normalizeModelName(row.officialModelName || ''),
      row.listingCount || 0,
      row.sourceUrl || '',
      row.updatedAt || ''
    ];
  });
  if (values.length) {
    sheet.getRange(2, 1, values.length, WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS.length).setValues(values);
  }
}

function getOrCreateGoobikeModelMasterSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_GOOBIKE_MODEL_MASTER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_GOOBIKE_MODEL_MASTER_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_GOOBIKE_MODEL_MASTER_COLUMNS);
  return sheet;
}

function resolveGoobikeOfficialModelForInput_(bikeName) {
  var raw = trimFullWidth(String(bikeName || ''));
  var inputKey = normalizeModelName(raw);
  if (!inputKey) {
    return { status: 'none', searchBikeName: raw, candidates: [] };
  }
  var inputKeys = buildGoobikeModelMasterInputKeys_(raw);
  var inputProfile = buildBikeModelCandidateProfile_(raw, '');
  var rows = getGoobikeModelMasterRows_();
  var hasUsableMaster = rows.some(function(row) {
    return isGoobikeOfficialModelDisplayableCandidate_(row);
  });
  if (!hasUsableMaster) {
    return {
      status: 'master_unavailable',
      searchBikeName: raw,
      candidates: [],
      inputProfile: inputProfile,
      candidateDiagnostics: []
    };
  }
  var scored = [];
  var diagnostics = [];
  rows.forEach(function(row) {
    var analysis = analyzeGoobikeModelMasterCandidate_(inputProfile, inputKeys, row);
    diagnostics.push(analysis);
    if (analysis.showCandidate) {
      scored.push(analysis);
    }
  });
  scored.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.listingCount || 0) - Number(a.listingCount || 0);
  });
  var unique = [];
  var seen = {};
  scored.forEach(function(item) {
    var key = item.maker + '|' + item.normalizedModelName;
    if (!seen[key]) {
      seen[key] = true;
      unique.push(item);
    }
  });
  if (unique.length === 0) {
    return {
      status: 'none',
      searchBikeName: raw,
      candidates: [],
      inputProfile: inputProfile,
      candidateDiagnostics: diagnostics.sort(function(a, b) { return b.score - a.score; }).slice(0, 20)
    };
  }
  var topScore = unique[0].score;
  var topCandidates = unique.filter(function(item) {
    return item.score >= WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MIN_SCORE && item.showCandidate;
  }).slice(0, WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MAX);
  if (topCandidates.length === 1 || topScore >= 160 || topScore - (unique[1] ? unique[1].score : 0) >= 70) {
    return {
      status: 'resolved',
      searchBikeName: unique[0].officialModelName,
      officialModelName: unique[0].officialModelName,
      maker: unique[0].maker,
      listingCount: unique[0].listingCount,
      sourceUrl: unique[0].sourceUrl,
      normalizedModelName: unique[0].normalizedModelName,
      score: unique[0].score,
      candidates: topCandidates.length ? topCandidates : unique.slice(0, WEBAPP_GOOBIKE_MODEL_MASTER_CANDIDATE_MAX),
      inputProfile: inputProfile,
      candidateDiagnostics: diagnostics.sort(function(a, b) { return b.score - a.score; }).slice(0, 20)
    };
  }
  return {
    status: 'multiple',
    searchBikeName: raw,
    candidates: topCandidates,
    inputProfile: inputProfile,
    candidateDiagnostics: diagnostics.sort(function(a, b) { return b.score - a.score; }).slice(0, 20)
  };
}

function buildGoobikeModelMasterInputKeys_(bikeName) {
  var keys = [];
  addNormalizedModelKey_(keys, bikeName);
  var entry = getBikeModelDictionaryEntryForName_(bikeName);
  if (entry) {
    addNormalizedModelKey_(keys, entry.canonicalKey);
    addNormalizedModelKey_(keys, entry.canonicalName);
    addNormalizedModelKey_(keys, entry.prioritySearchWord);
    (entry.aliases || []).forEach(function(alias) {
      addNormalizedModelKey_(keys, alias);
    });
  }
  return keys.filter(function(key, index) {
    return key && keys.indexOf(key) === index;
  });
}

function addNormalizedModelKey_(target, value) {
  var key = normalizeModelName(value);
  if (key && target.indexOf(key) === -1) {
    target.push(key);
  }
}

function scoreGoobikeModelMasterMatch_(inputKeys, row) {
  var modelKey = normalizeModelName(row.normalizedModelName || row.officialModelName);
  if (!modelKey) {
    return 0;
  }
  var best = 0;
  for (var i = 0; i < inputKeys.length; i++) {
    var inputKey = inputKeys[i];
    if (!inputKey || inputKey.length < 3) {
      continue;
    }
    var score = 0;
    if (inputKey === modelKey) {
      score = 1000 + modelKey.length;
    } else if (modelKey.indexOf(inputKey) !== -1 && inputKey.length >= 4) {
      score = 780 + inputKey.length;
    } else if (inputKey.indexOf(modelKey) !== -1 && modelKey.length >= 4) {
      score = 720 + modelKey.length;
    } else {
      var overlap = getBikeModelKeyOverlapScore_(inputKey, modelKey);
      if (overlap >= 0.72 && Math.min(inputKey.length, modelKey.length) >= 5) {
        score = Math.round(560 + overlap * 100);
      }
    }
    if (score > best) {
      best = score;
    }
  }
  return best;
}

function getBikeModelDictionaryEntryForName_(bikeName) {
  var key = normalizeBikeMarketKeyPart_(bikeName);
  if (!key) {
    return null;
  }
  var entries = getBikeModelDictionaryEntries_();
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < entries.length; i++) {
    var keys = [entries[i].canonicalKey, entries[i].canonicalName].concat(entries[i].aliases || []).map(normalizeBikeMarketKeyPart_);
    for (var j = 0; j < keys.length; j++) {
      var aliasKey = keys[j];
      if (!aliasKey || aliasKey.length < 3) {
        continue;
      }
      var score = 0;
      if (key === aliasKey) {
        score = 1000 + aliasKey.length;
      } else if (key.indexOf(aliasKey) !== -1) {
        score = 700 + aliasKey.length;
      } else if (aliasKey.indexOf(key) !== -1 && key.length >= 5) {
        score = 500 + key.length - (aliasKey.length - key.length);
      }
      if (score > bestScore) {
        best = entries[i];
        bestScore = score;
      }
    }
  }
  return best;
}

function isBikeModelDictionaryExcluded_(entry, listingKey) {
  var excludes = entry && entry.excludes ? entry.excludes : [];
  for (var i = 0; i < excludes.length; i++) {
    var excludeKey = normalizeBikeMarketKeyPart_(excludes[i]);
    if (excludeKey && listingKey.indexOf(excludeKey) !== -1) {
      return excludes[i];
    }
  }
  return '';
}

function getBikeModelSearchPhrases_(bikeName) {
  var phrases = [];
  var officialResolution = resolveGoobikeOfficialModelForInput_(bikeName);
  if (officialResolution.status === 'resolved' && officialResolution.officialModelName) {
    addBikeModelDictionaryValues_(phrases, [officialResolution.officialModelName]);
  }
  var entry = getBikeModelDictionaryEntryForName_(bikeName);
  if (entry) {
    if (entry.prioritySearchWord) phrases.push(entry.prioritySearchWord);
    addBikeModelDictionaryValues_(phrases, entry.aliases || []);
  }
  addBikeModelDictionaryValues_(phrases, [bikeName]);
  return phrases.slice(0, 10);
}

function buildBikeModelInputAnalysis_(bikeName) {
  var normalizedInput = normalizeBikeMarketKeyPart_(bikeName);
  var entry = getBikeModelDictionaryEntryForName_(bikeName);
  var suggestions = getCloseBikeModelDictionaryCandidates_(bikeName);
  var ambiguousReason = '';
  if (!entry) {
    var raw = String(bikeName || '');
    if (raw.indexOf('...') !== -1 || normalizedInput.indexOf('cb250') !== -1) {
      ambiguousReason = '車種名が省略またはグレード混在の可能性があります。';
    } else if (normalizedInput.length > 0 && normalizedInput.length < 4) {
      ambiguousReason = '車種名が短く特定できません。';
    } else if (suggestions.length > 0) {
      ambiguousReason = '近い辞書候補があります。';
    }
  }
  return {
    inputBikeName: bikeName || '',
    normalizedInput: normalizedInput,
    canonicalKey: entry ? entry.canonicalKey : '',
    canonicalName: entry ? entry.canonicalName : '',
    prioritySearchWord: entry ? entry.prioritySearchWord : '',
    aliases: entry ? entry.aliases : [],
    excludes: entry ? entry.excludes : [],
    ambiguous: Boolean(ambiguousReason),
    ambiguousReason: ambiguousReason,
    closeCandidates: suggestions
  };
}

function splitMultipleBikeModelInput_(bikeName) {
  var raw = trimFullWidth(String(bikeName || ''))
    .replace(/など$/g, '')
    .replace(/等$/g, '')
    .trim();
  if (!raw) {
    return [];
  }
  var explicitSeparator = /(?:または|\bor\b|\/|、|,|・)/i.test(raw);
  if (!explicitSeparator && getBikeModelDictionaryEntryForName_(raw)) {
    return [raw];
  }
  var normalized = raw
    .replace(/(?:または|\bor\b)/ig, '|')
    .replace(/[\/、,・]/g, '|')
    .replace(/\s+/g, function(match) {
      return explicitSeparator ? match : '|';
    });
  var parts = normalized.split('|').map(function(part) {
    return trimFullWidth(part).replace(/など$/g, '').replace(/等$/g, '').trim();
  }).filter(function(part) {
    return part && !/^(など|等)$/.test(part);
  });
  if (!explicitSeparator && parts.length <= 3) {
    var joined = parts.join(' ');
    if (getBikeModelDictionaryEntryForName_(joined) || /^[^\d]+[\s　]+\d+(?:cc)?(?:[\s　]+プロ)?$/i.test(joined)) {
      return [raw];
    }
  }
  var seen = {};
  var result = [];
  parts.forEach(function(part) {
    var key = normalizeBikeMarketKeyPart_(part);
    if (key && !seen[key]) {
      seen[key] = true;
      result.push(part);
    }
  });
  return result.length > 1 ? result : [raw];
}

function shouldAskBikeModelConfirmation_(bikeName, diagnosis) {
  var analysis = buildBikeModelInputAnalysis_(bikeName);
  if (analysis.ambiguous) {
    return true;
  }
  if (diagnosis && diagnosis.noDataReason === 'no_model_match') {
    return true;
  }
  return false;
}

function getCloseBikeModelDictionaryCandidates_(bikeName) {
  var inputKey = normalizeBikeMarketKeyPart_(bikeName);
  if (!inputKey) {
    return [];
  }
  var result = [];
  var entries = getBikeModelDictionaryEntries_();
  for (var i = 0; i < entries.length; i++) {
    var aliases = [entries[i].canonicalName].concat(entries[i].aliases || []);
    for (var j = 0; j < aliases.length; j++) {
      var aliasKey = normalizeBikeMarketKeyPart_(aliases[j]);
      if (!aliasKey || aliasKey === inputKey) {
        continue;
      }
      var overlap = getBikeModelKeyOverlapScore_(inputKey, aliasKey);
      if (inputKey.indexOf(aliasKey) !== -1 || aliasKey.indexOf(inputKey) !== -1 || overlap >= 0.58) {
        result.push({
          canonicalKey: entries[i].canonicalKey,
          canonicalName: entries[i].canonicalName,
          alias: aliases[j],
          score: overlap
        });
        break;
      }
    }
  }
  return result.slice(0, 8);
}

function getBikeModelKeyOverlapScore_(a, b) {
  var shortKey = a.length <= b.length ? a : b;
  var longKey = a.length <= b.length ? b : a;
  if (!shortKey || !longKey) {
    return 0;
  }
  var hit = 0;
  for (var i = 0; i < shortKey.length; i++) {
    if (longKey.indexOf(shortKey.charAt(i)) !== -1) {
      hit++;
    }
  }
  return hit / shortKey.length;
}

function buildBikeModelDictionaryDiagnostics_(bikeName, parsedListings) {
  var analysis = buildBikeModelInputAnalysis_(bikeName);
  var officialResolution = resolveGoobikeOfficialModelForInput_(bikeName || '');
  var multipleInputCandidates = splitMultipleBikeModelInput_(bikeName);
  var modelNames = [];
  var seen = {};
  (parsedListings || []).forEach(function(item) {
    var title = item && item.title ? item.title : '';
    var key = normalizeBikeMarketKeyPart_(title);
    if (title && !seen[key]) {
      modelNames.push(title);
      seen[key] = true;
    }
  });
  var inferredCandidates = inferBikeModelCandidatesFromTitles_(bikeName, modelNames);
  var aliasCandidates = buildBikeModelAliasCandidates_(bikeName, modelNames, inferredCandidates);
  var excludeCandidates = buildBikeModelExcludeCandidates_(bikeName, modelNames);
  return {
    inputBikeName: analysis.inputBikeName,
    normalizedInput: analysis.normalizedInput,
    canonicalKey: analysis.canonicalKey,
    canonicalName: analysis.canonicalName,
    closeCandidates: analysis.closeCandidates,
    multipleInputCandidates: multipleInputCandidates.length > 1 ? multipleInputCandidates : [],
    resultModelNames: modelNames.slice(0, 30),
    inferredModelCandidates: inferredCandidates,
    aliasCandidates: aliasCandidates,
    excludeCandidates: excludeCandidates,
    candidateScoreDiagnostics: officialResolution.candidateDiagnostics || []
  };
}

function inferBikeModelCandidatesFromTitles_(bikeName, titles) {
  var candidates = [];
  var seen = {};
  (titles || []).forEach(function(title) {
    extractBikeModelCandidateWords_(title).forEach(function(candidate) {
      var key = normalizeBikeMarketKeyPart_(candidate);
      if (key && !seen[key]) {
        seen[key] = true;
        candidates.push(candidate);
      }
    });
  });
  getCloseBikeModelDictionaryCandidates_(bikeName).forEach(function(candidate) {
    var key = normalizeBikeMarketKeyPart_(candidate.alias);
    if (key && !seen[key]) {
      seen[key] = true;
      candidates.push(candidate.alias);
    }
  });
  return candidates.slice(0, 20);
}

function buildBikeModelAliasCandidates_(bikeName, titles, inferredCandidates) {
  var inputKey = normalizeBikeMarketKeyPart_(bikeName);
  var candidates = [];
  var seen = {};
  (inferredCandidates || []).concat(titles || []).forEach(function(value) {
    extractBikeModelCandidateWords_(value).forEach(function(candidate) {
      var key = normalizeBikeMarketKeyPart_(candidate);
      if (key && key !== inputKey && !seen[key]) {
        seen[key] = true;
        candidates.push(candidate);
      }
    });
  });
  return candidates.slice(0, 20);
}

function buildBikeModelExcludeCandidates_(bikeName, titles) {
  var inputEntry = getBikeModelDictionaryEntryForName_(bikeName);
  var inputKey = normalizeBikeMarketKeyPart_(bikeName);
  var candidates = [];
  var seen = {};
  (titles || []).forEach(function(title) {
    var matchInfo = getBikeMarketModelMatchInfo_(bikeName, title);
    if (matchInfo.matched) {
      return;
    }
    extractBikeModelCandidateWords_(title).forEach(function(candidate) {
      var key = normalizeBikeMarketKeyPart_(candidate);
      if (!key || key === inputKey || seen[key]) {
        return;
      }
      if (inputEntry && isBikeModelDictionaryExcluded_(inputEntry, key)) {
        return;
      }
      seen[key] = true;
      candidates.push(candidate);
    });
  });
  return candidates.slice(0, 20);
}

function extractBikeModelCandidateWords_(value) {
  var text = normalizeBikeMarketNameText_(htmlToText_(String(value || '')))
    .replace(/カワサキ|ホンダ|ヤマハ|スズキ|BMW|ビーエムダブリュー|KAWASAKI|HONDA|YAMAHA|SUZUKI/gi, ' ')
    .replace(/\b(19\d{2}|20\d{2})年?モデル?\b/gi, ' ')
    .replace(/\b(19\d{2}|20\d{2})年?式?\b/gi, ' ')
    .replace(/新車|中古車|ABS|ETC|保証|登録済み|未使用車|ワンオーナー|社外|カスタム|インジェクション|キャブ|車検付き|自賠責付き/g, ' ')
    .replace(/[【】［］\[\]（）()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  var candidates = [];
  var patterns = [
    /Ninja\s*ZX[-\s]?4R\s*SE/ig,
    /Ninja\s*400(?:\s*KRT\s*Edition)?|ニンジャ\s*400/ig,
    /ZX400P/ig,
    /ゼファー\s*1100|ZEPHYR\s*1100|ゼファー\s*750|ZEPHYR\s*750|ゼファー\s*400|ZEPHYR\s*400/ig,
    /ゼファー\s*[Xχ]|ZEPHYR\s*[Xχ]|ゼファー400\s*χ/ig,
    /スカイウェイブ\s*250\s*SS|スカイウェイブ\s*250|CJ4[456]A/ig,
    /ドラッグスター\s*250|XVS250/ig,
    /エリミネーター\s*250\s*V|ELIMINATOR\s*250\s*V|エリミネーター\s*250/ig,
    /エリミネーター\s*400(?:cc)?/ig,
    /FLHTCU|FLHTK|FLHT|エレクトラグライド\s*ウルトラ(?:クラシック)?|ウルトラ\s*リミテッド|Electra\s*Glide\s*Ultra\s*Classic|Ultra\s*Classic/ig,
    /FLHXS|ストリートグライド\s*スペシャル|Street\s*Glide\s*Special/ig,
    /FLTRXS|ロードグライド\s*スペシャル|Road\s*Glide\s*Special/ig,
    /FXLRS|ローライダー\s*S|Low\s*Rider\s*S/ig,
    /ホーネット\s*250|HORNET\s*250|MC31/ig,
    /マグナ\s*50|MAGNA\s*FIFTY|AC13/ig,
    /スーパーカブ\s*110\s*プロ|SUPER\s*CUB\s*110\s*PRO|JA(?:10|42|61)/ig,
    /CB400T|CB\s*400\s*T|ホークII|ホーク2|HAWK\s*II/ig,
    /CBR?400R{0,2}|CBR\s*400\s*RR/ig,
    /GSX1300R?\s*(?:ハヤブサ|隼|HAYABUSA)|GSX1300\s*隼/ig,
    /ZZR\s*1400|ZX[-\s]?14R|ZXR\s*1400/ig,
    /ADV\s*160/ig,
    /GSR\s*250/ig,
    /YZF[-\s]?R1/ig,
    /[A-Za-z]{2,}\s*[-]?\s*\d{2,4}[A-Za-z]*(?:\s+[A-Za-z]{1,3})?/g,
    /[ァ-ヶー一-龥A-Za-z]+[ 　]?\d{2,4}[A-Za-z]*(?:[ 　]?(?:SS|SE|ABS|プロ|タイプS|χ|X))?/g
  ];
  patterns.forEach(function(pattern) {
    var match;
    while ((match = pattern.exec(text)) !== null) {
      var candidate = trimFullWidth(match[0]).replace(/\s+/g, ' ');
      if (candidate && normalizeBikeMarketKeyPart_(candidate).length >= 3) {
        candidates.push(candidate);
      }
    }
  });
  var seen = {};
  return candidates.filter(function(candidate) {
    var key = normalizeBikeMarketKeyPart_(candidate);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, 12);
}

function isBikeNameMatched_(customerBikeName, listingBikeName) {
  return getBikeMarketModelMatchInfo_(customerBikeName, listingBikeName).matched;
}

function getBikeMarketModelMatchInfo_(customerBikeName, listingBikeName) {
  var customerKey = normalizeBikeMarketKeyPart_(customerBikeName);
  var listingKey = normalizeBikeMarketKeyPart_(listingBikeName);
  var entry = getBikeModelDictionaryEntryForName_(customerBikeName);
  var info = {
    normalizedInput: customerKey,
    normalizedTitle: listingKey,
    canonicalKey: entry ? entry.canonicalKey : '',
    matched: false,
    reason: '',
    zx4rrExcluded: false
  };
  if (customerKey === '' || listingKey === '') {
    info.reason = 'false / 正規化後の車種名が空';
    return info;
  }
  if (entry) {
    var excludedWord = isBikeModelDictionaryExcluded_(entry, listingKey);
    if (excludedWord) {
      info.zx4rrExcluded = entry.canonicalKey === 'ninjazx4rse';
      info.reason = 'false / 除外語 "' + excludedWord + '" のため除外';
      return info;
    }
    var aliases = [entry.canonicalKey].concat(entry.aliases || []);
    for (var a = 0; a < aliases.length; a++) {
      var aliasKey = normalizeBikeMarketKeyPart_(aliases[a]);
      if (aliasKey && aliasKey.length >= 3 && listingKey.indexOf(aliasKey) !== -1) {
        info.matched = true;
        info.reason = 'true / 辞書同義語 "' + aliases[a] + '" を含むため';
        return info;
      }
    }
    info.reason = 'false / 辞書同義語に一致しない';
    return info;
  }
  if (customerKey === listingKey) {
    info.matched = true;
    info.reason = 'true / 正規化後の車種名が完全一致';
    return info;
  }
  var longer = customerKey.length >= listingKey.length ? customerKey : listingKey;
  var shorter = customerKey.length >= listingKey.length ? listingKey : customerKey;
  if (shorter.length < 4) {
    info.reason = 'false / 比較対象が短すぎる';
    return info;
  }
  info.matched = longer.indexOf(shorter) !== -1;
  info.reason = info.matched ? 'true / 正規化後の車種名を含むため' : 'false / 正規化後の車種名を含まない';
  return info;
}

function matchSpecialBikeModel_(customerBikeName, listingBikeName) {
  var entry = getBikeModelDictionaryEntryForName_(customerBikeName);
  if (!entry) return null;
  return getBikeMarketModelMatchInfo_(customerBikeName, listingBikeName).matched;
}

function normalizeSpecialBikeModelKey_(value) {
  var entry = getBikeModelDictionaryEntryForName_(value);
  return entry ? entry.canonicalKey : '';
}

function getBikeMarketModelExclusionReason_(customerBikeName, listingBikeName) {
  var entry = getBikeModelDictionaryEntryForName_(customerBikeName);
  var listingKey = normalizeBikeMarketKeyPart_(listingBikeName);
  var excludedWord = isBikeModelDictionaryExcluded_(entry, listingKey);
  if (excludedWord) {
    return excludedWord + ' のため除外';
  }
  return listingBikeName ? '車種不一致' : '車種名なし';
}

function hasBikeMarketCsvRows_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MARKET_SHEET_NAME);
  return Boolean(sheet && sheet.getLastRow() > 1);
}

function getOrCreateBikeMarketSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MARKET_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_BIKE_MARKET_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_BIKE_MARKET_CSV_COLUMNS);
  return sheet;
}

function getOrCreateBikeMarketCacheSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MARKET_CACHE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_BIKE_MARKET_CACHE_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_BIKE_MARKET_CACHE_COLUMNS);
  return sheet;
}

function getOrCreateBikeMarketLogSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MARKET_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_BIKE_MARKET_LOG_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_BIKE_MARKET_LOG_COLUMNS);
  return sheet;
}

function getOrCreateBikeMarketAutoLogSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_BIKE_MARKET_AUTO_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_BIKE_MARKET_AUTO_LOG_SHEET_NAME);
  }
  setupHeaderRow_(sheet, WEBAPP_BIKE_MARKET_AUTO_LOG_COLUMNS);
  return sheet;
}

function setupHeaderRow_(sheet, columns) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns);
  } else {
    var current = sheet.getRange(1, 1, 1, columns.length).getDisplayValues()[0];
    var needsHeader = current.join('') === '';
    if (needsHeader) {
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    }
  }
  sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function getBikeMarketCache_(cacheKey, now) {
  var sheet = getOrCreateBikeMarketCacheSheet_();
  if (sheet.getLastRow() <= 1) {
    return null;
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MARKET_CACHE_COLUMNS.length).getDisplayValues();
  var nowTime = now.getTime();
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    if (row[0] !== cacheKey) {
      continue;
    }
    var expiresAt = parseDateTimeValue_(row[5]);
    if (expiresAt && expiresAt > nowTime) {
      try {
        return JSON.parse(row[3]);
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  return null;
}

function saveBikeMarketCache_(cacheKey, bikeName, yearInput, summary, now) {
  var sheet = getOrCreateBikeMarketCacheSheet_();
  var fetchedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  var expiresAt = Utilities.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  sheet.appendRow([cacheKey, bikeName, yearInput || '', JSON.stringify(summary), fetchedAt, expiresAt]);
}

function clearBikeMarketCache_() {
  var sheet = getOrCreateBikeMarketCacheSheet_();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MARKET_CACHE_COLUMNS.length).clearContent();
  }
}

function buildBikeMarketCacheKey_(bikeName, yearInput) {
  var normalizedYear = normalizeYearInput_(yearInput || '');
  return WEBAPP_BIKE_MARKET_CACHE_VERSION + '|' + normalizeBikeMarketKeyPart_(bikeName) + '|' + normalizedYear.cachePart;
}

function getBikeMarketCacheForAdmin(bikeName, yearInput, auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getOrCreateBikeMarketCacheSheet_();
  var key = buildBikeMarketCacheKey_(bikeName || '', yearInput || '');
  if (sheet.getLastRow() <= 1) {
    return { key: key, rows: [] };
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MARKET_CACHE_COLUMNS.length).getDisplayValues();
  var matched = [];
  for (var i = 0; i < rows.length; i++) {
    if (!bikeName || rows[i][0] === key) {
      matched.push({
        rowNumber: i + 2,
        normalizedKey: rows[i][0],
        bikeName: rows[i][1],
        yearInput: rows[i][2],
        fetchedAt: rows[i][4],
        expiresAt: rows[i][5],
        cacheable: isBikeMarketSummaryCacheable_(safeParseJson_(rows[i][3])),
        summary: safeParseJson_(rows[i][3])
      });
    }
  }
  return {
    key: key,
    rows: matched.slice(-50)
  };
}

function clearBikeMarketCacheForAdmin(bikeName, yearInput, auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getOrCreateBikeMarketCacheSheet_();
  if (sheet.getLastRow() <= 1) {
    return { message: '削除対象の相場キャッシュはありません。', deletedCount: 0 };
  }
  var key = buildBikeMarketCacheKey_(bikeName || '', yearInput || '');
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_BIKE_MARKET_CACHE_COLUMNS.length).getDisplayValues();
  var deletedCount = 0;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (!bikeName || rows[i][0] === key) {
      sheet.deleteRow(i + 2);
      deletedCount++;
    }
  }
  return {
    message: bikeName ? '指定条件の相場キャッシュを削除しました。削除件数：' + deletedCount + '件' : '相場キャッシュを全削除しました。削除件数：' + deletedCount + '件',
    deletedCount: deletedCount
  };
}

function isAutoFetchMarketOnNewApplicationEnabled_() {
  try {
    var value = PropertiesService.getScriptProperties().getProperty(WEBAPP_AUTO_FETCH_MARKET_PROPERTY_KEY);
    return value !== 'false';
  } catch (error) {
    return true;
  }
}

function getBikeMarketAutomationSettingsForAdmin(auth) {
  assertMarketAdminPasscode_(auth);
  return {
    autoFetchMarketOnNewApplication: isAutoFetchMarketOnNewApplicationEnabled_()
  };
}

function saveBikeMarketAutomationSettingsForAdmin(settings, auth) {
  assertMarketAdminPasscode_(auth);
  var enabled = !(settings && settings.autoFetchMarketOnNewApplication === false);
  PropertiesService.getScriptProperties().setProperty(WEBAPP_AUTO_FETCH_MARKET_PROPERTY_KEY, enabled ? 'true' : 'false');
  return {
    autoFetchMarketOnNewApplication: enabled,
    message: '新規申込時の自動相場取得を' + (enabled ? 'ON' : 'OFF') + 'にしました。'
  };
}

function appendBikeMarketFetchLog_(customerInfo, summary) {
  try {
    var diagnostics = summary && summary.diagnostics ? summary.diagnostics : {};
    var firstFetch = diagnostics.fetchResults && diagnostics.fetchResults.length ? diagnostics.fetchResults[0] : {};
    var now = new Date();
    var normalizedYear = normalizeYearInput_(summary && summary.yearInput ? summary.yearInput : '');
    var row = [
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      customerInfo && customerInfo.rowKey ? customerInfo.rowKey : (customerInfo && customerInfo.rowNumber ? customerInfo.rowNumber : ''),
      customerInfo && customerInfo.customerName ? customerInfo.customerName : '',
      summary && summary.bikeName ? summary.bikeName : '',
      summary && summary.yearInput ? summary.yearInput : '',
      diagnostics.normalizedBikeName || normalizeBikeMarketKeyPart_(summary && summary.bikeName ? summary.bikeName : ''),
      diagnostics.normalizedYear || normalizedYear.cachePart,
      summary && summary.sources ? summary.sources.join(' / ') : '',
      summary && summary.status ? summary.status : '',
      summary && summary.errorCode ? summary.errorCode : (diagnostics.errorCode || ''),
      summary && summary.errorMessage ? normalizeBikeMarketDisplayError_(summary.errorMessage) : '',
      firstFetch.url || '',
      firstFetch.statusCode || '',
      firstFetch.contentLength || '',
      (summary && summary.extractedCount) || diagnostics.parsedCount || (summary && summary.listingCount) || 0,
      (summary && summary.yearMatchedCount) || diagnostics.matchedCount || (summary && summary.listingCount) || 0,
      summary && summary.validPriceCount ? summary.validPriceCount : 0,
      summary && summary.minTotalPriceYen ? summary.minTotalPriceYen : '',
      summary && summary.maxTotalPriceYen ? summary.maxTotalPriceYen : '',
      summary && summary.averageTotalPriceYen ? summary.averageTotalPriceYen : '',
      summary && summary.stack ? summary.stack : (firstFetch.stack || '')
    ];
    getOrCreateBikeMarketLogSheet_().appendRow(row);
  } catch (error) {
    console.warn('Bike market log write failed: ' + (error && error.message ? error.message : String(error)));
  }
}

function appendBikeMarketAutoFetchLog_(entry) {
  try {
    var now = new Date();
    var row = [
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      entry && entry.customerId ? entry.customerId : '',
      entry && entry.customerName ? entry.customerName : '',
      entry && entry.bikeName ? entry.bikeName : '',
      entry && entry.year ? entry.year : '',
      entry && entry.triggerType ? entry.triggerType : '',
      entry && entry.status ? entry.status : '',
      entry && entry.marketStatus ? entry.marketStatus : '',
      entry && entry.referencePrice ? entry.referencePrice : '',
      entry && entry.priceAvailableCount ? entry.priceAvailableCount : '',
      entry && entry.errorCode ? entry.errorCode : '',
      entry && entry.errorMessage ? normalizeBikeMarketDisplayError_(entry.errorMessage) : ''
    ];
    getOrCreateBikeMarketAutoLogSheet_().appendRow(row);
  } catch (error) {
    console.warn('Bike market auto log write failed: ' + (error && error.message ? error.message : String(error)));
  }
}

function getBikeMarketLogsForAdmin(limit, auth) {
  assertMarketAdminPasscode_(auth);
  var sheet = getOrCreateBikeMarketLogSheet_();
  var maxRows = Math.max(1, Math.min(Number(limit || 80), 300));
  if (sheet.getLastRow() <= 1) {
    return { columns: WEBAPP_BIKE_MARKET_LOG_COLUMNS, rows: [] };
  }
  var rowCount = Math.min(sheet.getLastRow() - 1, maxRows);
  var startRow = sheet.getLastRow() - rowCount + 1;
  var rows = sheet.getRange(startRow, 1, rowCount, WEBAPP_BIKE_MARKET_LOG_COLUMNS.length).getDisplayValues();
  rows.reverse();
  return {
    columns: WEBAPP_BIKE_MARKET_LOG_COLUMNS,
    rows: rows.map(function(row, index) {
      var object = { rowNumber: startRow + rowCount - index - 1 };
      WEBAPP_BIKE_MARKET_LOG_COLUMNS.forEach(function(columnName, columnIndex) {
        object[columnName] = row[columnIndex] || '';
      });
      return object;
    })
  };
}

function safeParseJson_(jsonText) {
  try {
    return JSON.parse(jsonText || '{}');
  } catch (error) {
    return {};
  }
}

function setupCallHistorySheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_CALL_HISTORY_SHEET_NAME);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(WEBAPP_CALL_HISTORY_SHEET_NAME);
    created = true;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(WEBAPP_CALL_HISTORY_COLUMNS);
    sheet.getRange(1, 1, 1, WEBAPP_CALL_HISTORY_COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return {
    sheet: sheet,
    created: created
  };
}

function getOrCreateCallHistorySheet_() {
  return setupCallHistorySheet_().sheet;
}

function getCallHistoryMap_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_CALL_HISTORY_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) {
    return {};
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WEBAPP_CALL_HISTORY_COLUMNS.length).getDisplayValues();
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowKey = row[1];
    if (!rowKey) {
      continue;
    }

    if (!map[rowKey]) {
      map[rowKey] = [];
    }

    map[rowKey].push({
      recordedAt: row[0],
      rowNumber: row[2],
      name: row[3],
      callAt: row[4],
      callNumber: row[5],
      result: row[6],
      staffName: row[7],
      memo: row[8],
      recordedBy: row[9]
    });
  }

  return map;
}

function deleteCallHistoryByRowKey_(rowKey) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(WEBAPP_CALL_HISTORY_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) {
    return;
  }

  var values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === rowKey) {
      sheet.deleteRow(i + 2);
    }
  }
}

function updateLatestCallSummary_(sheet, rowNumber, payload, headerMap, result, staffName, callAt, memo, recorder) {
  var managementMap = getManagementColumnMap_(headerMap);
  var updates = {
    '対応状況': result === '出た' ? '電話がつながりプレミア審査前' : '架電中（不在・再架電待ち）',
    '担当者': staffName,
    '対応メモ': memo,
    '最終更新日時': Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    '最終更新者': recorder
  };

  Object.keys(updates).forEach(function(columnName) {
    var columnNumber = managementMap[columnName] || headerMap[columnName];
    if (columnNumber) {
      sheet.getRange(rowNumber, columnNumber).setValue(updates[columnName]);
    }
  });
}

function normalizeNumberInput_(value) {
  var normalized = trimFullWidth(String(value || ''))
    .replace(/[０-９]/g, function(char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[，,円回％%]/g, '');

  return normalized;
}

function normalizeCustomerRate_(value) {
  var normalized = normalizeNumberInput_(value);
  return normalized || '13.9';
}

function ensureLoanInputColumns_(sheet, headerMap) {
  for (var i = 0; i < WEBAPP_LOAN_INPUT_COLUMNS.length; i++) {
    var columnName = WEBAPP_LOAN_INPUT_COLUMNS[i];
    if (!headerMap[columnName]) {
      var nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(columnName).setFontWeight('bold');
      headerMap[columnName] = nextColumn;
    }
  }
}

function ensureFormulaColumns_(sheet, headerMap) {
  for (var i = 0; i < WEBAPP_LOAN_FORMULA_COLUMNS.length; i++) {
    var columnName = WEBAPP_LOAN_FORMULA_COLUMNS[i];
    if (!headerMap[columnName]) {
      var nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(columnName).setFontWeight('bold');
      headerMap[columnName] = nextColumn;
    }
  }
}

function columnToLetter_(columnNumber) {
  var letter = '';
  while (columnNumber > 0) {
    var remainder = (columnNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnNumber = Math.floor((columnNumber - remainder - 1) / 26);
  }
  return letter;
}

function setLoanCalculationFormulas_(sheet, rowNumber, headerMap) {
  ensureLoanInputColumns_(sheet, headerMap);
  ensureFormulaColumns_(sheet, headerMap);

  var row = rowNumber;
  var amountCell = columnToLetter_(headerMap['審査申込金額']) + row;
  var countCell = columnToLetter_(headerMap['支払い回数']) + row;
  var customerRateCell = columnToLetter_(headerMap['お客様提示金利(%)']) + row;
  var actualRateCell = columnToLetter_(headerMap['実際の金利(%)']) + row;
  var monthlyPaymentCell = columnToLetter_(headerMap['2回目〜毎月']) + row;
  var totalPaymentCell = columnToLetter_(headerMap['総支払額']) + row;
  var actualCostTotalCell = columnToLetter_(headerMap['実コスト総額']) + row;
  var customerRateFormula = 'IF(' + customerRateCell + '="",13.9,' + customerRateCell + ')/100/12';
  var actualRateFormula = actualRateCell + '/100/12';
  var formulas = {};
  formulas['1回目支払額'] = '=IF(OR(' + amountCell + '="",' + countCell + '=""),"",' + totalPaymentCell + '-' + monthlyPaymentCell + '*(' + countCell + '-1))';
  formulas['2回目〜毎月'] = '=IF(OR(' + amountCell + '="",' + countCell + '=""),"",CEILING(' + amountCell + '*(' + customerRateFormula + ')/(1-(1+(' + customerRateFormula + '))^-' + countCell + '),10))';
  formulas['総支払額'] = '=IF(OR(' + amountCell + '="",' + countCell + '=""),"",ROUND(' + amountCell + '*(' + customerRateFormula + ')/(1-(1+(' + customerRateFormula + '))^-' + countCell + '),0)*' + countCell + ')';
  formulas['実コスト総額'] = '=IF(OR(' + amountCell + '="",' + countCell + '="",' + actualRateCell + '=""),"",ROUND(' + amountCell + '*(' + actualRateFormula + ')/(1-(1+(' + actualRateFormula + '))^-' + countCell + '),0)*' + countCell + ')';
  formulas['キックバック差額'] = '=IF(OR(' + totalPaymentCell + '="",' + actualCostTotalCell + '=""),"",' + totalPaymentCell + '-' + actualCostTotalCell + ')';

  Object.keys(formulas).forEach(function(columnName) {
    sheet.getRange(rowNumber, headerMap[columnName]).setFormula(formulas[columnName]);
  });
}
