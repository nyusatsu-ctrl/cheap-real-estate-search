// ============================================================
// 社内向けWebアプリ入口
// 既存のGmail取り込み処理とは分離して管理画面だけを担当します
// ============================================================

var WEBAPP_ALLOWED_USERS = [
  'moukarukurumaya@gmail.com',
  'ecoloop8682@gmail.com'
];
var MARKET_ADMIN_PASSCODE_PROPERTY_KEY = 'MARKET_ADMIN_PASSCODE';

function doGet(e) {
  var activeUserEmail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (activeUserEmail && WEBAPP_ALLOWED_USERS.indexOf(activeUserEmail) === -1) {
    return HtmlService
      .createHtmlOutput('<p>このアカウントでは利用できません。</p>')
      .setTitle('アクセス不可');
  }

  if (e && e.parameter && e.parameter.action === 'normalizeSheet') {
    var result = normalizeApplicationSheetForCurrentPolicy();
    return HtmlService
      .createHtmlOutput('<p>シート整理が完了しました。</p><pre>' + JSON.stringify(result, null, 2) + '</pre>')
      .setTitle('シート整理完了');
  }
  if (e && e.parameter && e.parameter.action === 'backfillInquiryContent') {
    var backfillResult = backfillInquiryContentFromGmail();
    var normalizeResult = normalizeApplicationSheetForCurrentPolicy();
    return HtmlService
      .createHtmlOutput('<p>お問い合わせ内容の補完とシート整理が完了しました。</p><pre>' + JSON.stringify({
        backfill: backfillResult,
        normalize: normalizeResult
      }, null, 2) + '</pre>')
      .setTitle('お問い合わせ内容補完完了');
  }
  if (e && e.parameter && e.parameter.action === 'backfillAddressKana') {
    var addressKanaResult = backfillAddressKanaFromGmail();
    return HtmlService
      .createHtmlOutput('<p>住所(カナ)の補完が完了しました。</p><pre>' + JSON.stringify(addressKanaResult, null, 2) + '</pre>')
      .setTitle('住所カナ補完完了');
  }
  if (e && e.parameter && e.parameter.action === 'authorizeMarket') {
    if (!isMarketAdminAuthorized_(e)) {
      return renderMarketAdminAccessDenied_();
    }
    var authorizeResult = authorizeMarketExternalRequest(getMarketAdminPasscodeFromRequest_(e));
    return HtmlService
      .createHtmlOutput('<p>相場取得の外部アクセス確認が完了しました。</p><pre>' + escapeHtmlForDebug_(authorizeResult) + '</pre>')
      .setTitle('相場取得確認');
  }
  if (e && e.parameter && e.parameter.action === 'marketDebug') {
    if (!isMarketAdminAuthorized_(e)) {
      return renderMarketAdminAccessDenied_();
    }
    var bikeName = String(e.parameter.bike || 'BMW S1000R');
    var yearInput = String(e.parameter.year || '2017');
    var debugResult = debugBikeMarketFetchForWeb_(bikeName, yearInput, getMarketAdminPasscodeFromRequest_(e));
    return HtmlService
      .createHtmlOutput('<pre>' + escapeHtmlForDebug_(JSON.stringify(debugResult, null, 2)) + '</pre>')
      .setTitle('相場取得診断');
  }
  var isMarketAdminRequest = Boolean(e && e.parameter && e.parameter.admin === 'market');
  if (isMarketAdminRequest && !isMarketAdminAuthorized_(e)) {
    return renderMarketAdminPasscodeForm_();
  }
  var template = HtmlService.createTemplateFromFile('Index');
  template.isMarketAdmin = isMarketAdminRequest;
  template.marketAdminPasscode = isMarketAdminRequest ? getMarketAdminPasscodeFromRequest_(e) : '';
  template.marketAdminPasscodeJson = jsonForInlineScript_(template.marketAdminPasscode);

  // The web app is published for WordPress/staff access and runs as USER_DEPLOYING.
  // Market admin pages/actions must stay guarded by MARKET_ADMIN_PASSCODE.
  return template
    .evaluate()
    .setTitle('自社ローン審査管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function backfillAddressKanaFromWeb() {
  return backfillAddressKanaFromGmail();
}

function getPremiumTemplateDataUrl() {
  return HtmlService.createHtmlOutputFromFile('PremiumPrintTemplate').getContent();
}

function escapeHtmlForDebug_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForInlineScript_(value) {
  return JSON.stringify(value || '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function getMarketAdminConfiguredPasscode_() {
  try {
    return String(PropertiesService.getScriptProperties().getProperty(MARKET_ADMIN_PASSCODE_PROPERTY_KEY) || '').trim();
  } catch (error) {
    return '';
  }
}

function getMarketAdminPasscodeFromRequest_(e) {
  if (!e || !e.parameter) {
    return '';
  }
  return String(e.parameter.market_passcode || e.parameter.passcode || '').trim();
}

function isMarketAdminPasscodeValid_(passcode) {
  var configured = getMarketAdminConfiguredPasscode_();
  var input = String(passcode || '').trim();
  return Boolean(configured && input && input === configured);
}

function isMarketAdminAuthorized_(e) {
  return isMarketAdminPasscodeValid_(getMarketAdminPasscodeFromRequest_(e));
}

function renderMarketAdminAccessDenied_() {
  return HtmlService
    .createHtmlOutput('<p>相場管理の認証が必要です。MARKET_ADMIN_PASSCODE を確認してください。</p>')
    .setTitle('相場管理アクセス不可');
}

function renderMarketAdminPasscodeForm_() {
  var configured = getMarketAdminConfiguredPasscode_();
  var setupMessage = configured
    ? ''
    : '<p style="color:#b42318;">Script Properties に MARKET_ADMIN_PASSCODE が未設定です。</p>';
  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><head><base target="_top"><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>body{font-family:Arial,\"Hiragino Sans\",\"Yu Gothic\",sans-serif;background:#f4f6f8;margin:0;padding:32px;color:#20242a}.panel{max-width:420px;margin:0 auto;background:#fff;border:1px solid #d9dee5;border-radius:8px;padding:20px}label{display:block;font-weight:700;margin-bottom:8px}input{width:100%;box-sizing:border-box;border:1px solid #d9dee5;border-radius:6px;padding:10px}button{margin-top:14px;border:0;border-radius:6px;background:#2563eb;color:#fff;padding:10px 14px;cursor:pointer}.muted{color:#667085}</style>' +
      '</head><body><div class="panel"><h1>相場管理ログイン</h1>' +
      '<p class="muted">相場データ管理画面を開くには管理用パスコードが必要です。</p>' +
      setupMessage +
      '<form method="get"><input type="hidden" name="admin" value="market">' +
      '<label for="market_passcode">管理用パスコード</label>' +
      '<input id="market_passcode" name="market_passcode" type="password" autocomplete="current-password" autofocus>' +
      '<button type="submit">管理画面を開く</button></form></div></body></html>'
    )
    .setTitle('相場管理ログイン');
}
