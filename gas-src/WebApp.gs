// ============================================================
// 社内向けWebアプリ入口
// 既存のGmail取り込み処理とは分離して管理画面だけを担当します
// ============================================================

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('自社ローン審査管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

