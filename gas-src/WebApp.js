// ============================================================
// 社内向けWebアプリ入口
// 既存のGmail取り込み処理とは分離して管理画面だけを担当します
// ============================================================

var WEBAPP_ALLOWED_USERS = [
  'moukarukurumaya@gmail.com',
  'ecoloop8682@gmail.com'
];

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

  return HtmlService
    .createTemplateFromFile('Index')
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
