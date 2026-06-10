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
    var authorizeAuth = getMarketAdminAuthState_(e);
    if (!authorizeAuth.authorized) {
      return renderMarketAdminPasscodeForm_(authorizeAuth);
    }
    var authorizeResult = authorizeMarketExternalRequest(authorizeAuth.input);
    return HtmlService
      .createHtmlOutput('<p>相場取得の外部アクセス確認が完了しました。</p><pre>' + escapeHtmlForDebug_(authorizeResult) + '</pre>')
      .setTitle('相場取得確認');
  }
  if (e && e.parameter && e.parameter.action === 'marketDebug') {
    var debugAuth = getMarketAdminAuthState_(e);
    if (!debugAuth.authorized) {
      return renderMarketAdminPasscodeForm_(debugAuth);
    }
    var bikeName = String(e.parameter.bike || 'BMW S1000R');
    var yearInput = String(e.parameter.year || '2017');
    var debugResult = debugBikeMarketFetchForWeb_(bikeName, yearInput, debugAuth.input);
    return HtmlService
      .createHtmlOutput('<pre>' + escapeHtmlForDebug_(JSON.stringify(debugResult, null, 2)) + '</pre>')
      .setTitle('相場取得診断');
  }
  if (e && e.parameter && e.parameter.action === 'marketLogs') {
    var logsAuth = getMarketAdminAuthState_(e);
    if (!logsAuth.authorized) {
      return renderMarketAdminPasscodeForm_(logsAuth);
    }
    return renderPlainTextResult_('取得ログ', function() {
      return getBikeMarketLogsForAdmin(80, logsAuth.input);
    });
  }
  if (e && e.parameter && e.parameter.action === 'marketMaster') {
    var masterAuth = getMarketAdminAuthState_(e);
    if (!masterAuth.authorized) {
      return renderMarketAdminPasscodeForm_(masterAuth);
    }
    return renderPlainTextResult_('GooBike車種マスタ', function() {
      return getGoobikeModelMasterAdminData(300, masterAuth.input);
    });
  }
  if (e && e.parameter && e.parameter.action === 'marketMasterRefresh') {
    var masterRefreshAuth = getMarketAdminAuthState_(e);
    if (!masterRefreshAuth.authorized) {
      return renderMarketAdminPasscodeForm_(masterRefreshAuth);
    }
    return renderPlainTextResult_('GooBike車種マスタ更新', function() {
      return refreshGoobikeModelMasterForAdmin(masterRefreshAuth.input);
    });
  }
  var isMarketAdminRequest = Boolean(e && e.parameter && e.parameter.admin === 'market');
  var marketAdminAuth = getMarketAdminAuthState_(e);
  if (isMarketAdminRequest && e && e.parameter && e.parameter.debug === 'plain') {
    return renderMarketAdminPlainDebug_(e, marketAdminAuth);
  }
  if (isMarketAdminRequest && !marketAdminAuth.authorized) {
    return renderMarketAdminPasscodeForm_(marketAdminAuth);
  }
  if (isMarketAdminRequest) {
    return renderMarketAdminSimpleApp_(marketAdminAuth.input);
  }
  var template = HtmlService.createTemplateFromFile('Index');
  template.isMarketAdmin = isMarketAdminRequest;
  template.marketAdminPasscode = isMarketAdminRequest ? marketAdminAuth.input : '';
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

function getMarketAdminAuthState_(e) {
  var configured = getMarketAdminConfiguredPasscode_();
  var input = getMarketAdminPasscodeFromRequest_(e);
  return {
    configured: configured,
    input: input,
    hasConfiguredPasscode: Boolean(configured),
    hasInputPasscode: Boolean(input),
    authorized: Boolean(configured && input && input === configured)
  };
}

function isMarketAdminAuthorized_(e) {
  return getMarketAdminAuthState_(e).authorized;
}

function renderMarketAdminAccessDenied_() {
  return renderMarketAdminPasscodeForm_();
}

function renderMarketAdminPlainDebug_(e, authState) {
  var lines = [];
  try {
    var state = authState || getMarketAdminAuthState_(e);
    lines.push('MV/GooBike market admin plain debug');
    lines.push('timestamp=' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'));
    lines.push('admin=' + String(e && e.parameter ? e.parameter.admin : ''));
    lines.push('debug=' + String(e && e.parameter ? e.parameter.debug : ''));
    lines.push('has_market_passcode=' + String(Boolean(getMarketAdminPasscodeFromRequest_(e))));
    lines.push('has_configured_MARKET_ADMIN_PASSCODE=' + String(Boolean(state.hasConfiguredPasscode)));
    lines.push('auth_authorized=' + String(Boolean(state.authorized)));
    lines.push('will_render_simple_market_admin_html=' + String(Boolean(state.authorized)));
    try {
      if (state.authorized) {
        var output = renderMarketAdminSimpleApp_(state.input);
        lines.push('renderMarketAdminSimpleApp_reached=true');
        lines.push('renderMarketAdminSimpleApp_returned=' + Object.prototype.toString.call(output));
      } else {
        lines.push('renderMarketAdminSimpleApp_reached=false');
      }
    } catch (renderError) {
      lines.push('renderMarketAdminSimpleApp_reached=true');
      lines.push('renderMarketAdminSimpleApp_exception=' + (renderError && renderError.message ? renderError.message : String(renderError)));
      lines.push('renderMarketAdminSimpleApp_stack=' + (renderError && renderError.stack ? renderError.stack : ''));
    }
  } catch (error) {
    lines.push('plain_debug_exception=' + (error && error.message ? error.message : String(error)));
    lines.push('plain_debug_stack=' + (error && error.stack ? error.stack : ''));
  }
  return ContentService
    .createTextOutput(lines.join('\n'))
    .setMimeType(ContentService.MimeType.TEXT);
}

function renderPlainTextResult_(title, runner) {
  var lines = [];
  try {
    lines.push(title);
    lines.push('timestamp=' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'));
    lines.push('');
    var result = runner();
    lines.push(JSON.stringify(result, null, 2));
  } catch (error) {
    lines.push('ERROR=' + (error && error.message ? error.message : String(error)));
    lines.push('STACK=' + (error && error.stack ? error.stack : ''));
  }
  return ContentService
    .createTextOutput(lines.join('\n'))
    .setMimeType(ContentService.MimeType.TEXT);
}

function renderMarketAdminPasscodeForm_(authState) {
  var state = authState || getMarketAdminAuthState_();
  var setupMessage = state.hasConfiguredPasscode
    ? ''
    : '<p style="color:#b42318;font-weight:700;">管理パスコードが未設定です。Script Properties に MARKET_ADMIN_PASSCODE を設定してください。</p>';
  var errorMessage = state.hasConfiguredPasscode && state.hasInputPasscode
    ? '<p style="color:#b42318;">管理用パスコードが一致しません。</p>'
    : '';
  var formHtml = state.hasConfiguredPasscode
    ? '<form method="get"><input type="hidden" name="admin" value="market">' +
      '<label for="market_passcode">管理用パスコード</label>' +
      '<input id="market_passcode" name="market_passcode" type="password" autocomplete="current-password" autofocus>' +
      '<button type="submit">管理画面を開く</button></form>'
    : '';
  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><head><base target="_top"><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>body{font-family:Arial,\"Hiragino Sans\",\"Yu Gothic\",sans-serif;background:#f4f6f8;margin:0;padding:32px;color:#20242a}.panel{max-width:420px;margin:0 auto;background:#fff;border:1px solid #d9dee5;border-radius:8px;padding:20px}label{display:block;font-weight:700;margin-bottom:8px}input{width:100%;box-sizing:border-box;border:1px solid #d9dee5;border-radius:6px;padding:10px}button{margin-top:14px;border:0;border-radius:6px;background:#2563eb;color:#fff;padding:10px 14px;cursor:pointer}.muted{color:#667085}</style>' +
      '</head><body><div class="panel"><h1>相場管理ログイン</h1>' +
      '<p class="muted">相場データ管理画面を開くには管理用パスコードが必要です。</p>' +
      setupMessage +
      errorMessage +
      formHtml +
      '</div></body></html>'
    )
    .setTitle('相場管理ログイン');
}

function renderMarketAdminSimpleApp_(passcode) {
  var actionUrl = getWebAppUrlForMarketAdmin_();
  var actionAttr = actionUrl ? ' action="' + escapeHtmlForDebug_(actionUrl) + '"' : '';
  var escapedPasscode = escapeHtmlForDebug_(passcode);
  var html = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<base target="_top">',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>',
    'body{margin:0;background:#f4f6f8;color:#20242a;font-family:Arial,"Hiragino Sans","Yu Gothic",sans-serif;font-size:14px;}',
    'header{background:#fff;border-bottom:1px solid #d9dee5;padding:16px 18px;}',
    'h1{margin:0;font-size:22px;}',
    'main{padding:16px 18px;max-width:1100px;margin:0 auto;}',
    '.panel{background:#fff;border:1px solid #d9dee5;border-radius:8px;padding:14px;margin-bottom:14px;}',
    '.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;}',
    'button{border:1px solid #d9dee5;background:#fff;border-radius:6px;padding:9px 12px;cursor:pointer;}',
    'button.primary{background:#2563eb;border-color:#2563eb;color:#fff;}',
    'button:disabled{opacity:.65;cursor:wait;}',
    'label{display:block;font-weight:700;margin-bottom:6px;}',
    'input{border:1px solid #d9dee5;border-radius:6px;padding:9px 10px;min-width:220px;}',
    '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
    '.muted{color:#667085;}',
    'pre{min-height:220px;max-height:520px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#0f172a;color:#e5e7eb;border-radius:8px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;}',
    '.error{border-color:#f3b4ad;background:#fff7f6;color:#b42318;}',
    '@media(max-width:700px){.grid{grid-template-columns:1fr;}main{padding:12px;}}',
    '</style>',
    '</head>',
    '<body>',
    '<header><h1>相場データ管理</h1><p class="muted">JavaScriptを使わない安全版です。各操作はプレーンテキスト結果として開きます。</p></header>',
    '<main>',
    '<section class="panel">',
    '<form method="get"' + actionAttr + ' style="display:inline-block;margin:0 8px 8px 0;">',
    '<button type="submit">スタッフ画面へ戻る</button>',
    '</form>',
    '<form method="get"' + actionAttr + ' style="display:inline-block;margin:0 8px 8px 0;">',
    '<input type="hidden" name="admin" value="market">',
    '<input type="hidden" name="market_passcode" value="' + escapedPasscode + '">',
    '<button type="submit">相場管理トップ</button>',
    '</form>',
    '</section>',
    '<section class="panel">',
    '<h2 style="margin:0 0 10px;font-size:18px;">GooBike取得診断</h2>',
    '<form method="get"' + actionAttr + '>',
    '<input type="hidden" name="action" value="marketDebug">',
    '<input type="hidden" name="market_passcode" value="' + escapedPasscode + '">',
    '<div class="grid">',
    '<div><label for="bike">診断車種名</label><input id="bike" name="bike" type="text" value="BMW S1000R"></div>',
    '<div><label for="year">年式</label><input id="year" name="year" type="text" value="2017"></div>',
    '</div>',
    '<div class="actions"><button class="primary" type="submit">GooBike取得診断</button></div>',
    '</form>',
    '</section>',
    '<section class="panel">',
    '<h2 style="margin:0 0 10px;font-size:18px;">管理操作</h2>',
    '<div class="actions">',
    '<form method="get"' + actionAttr + '><input type="hidden" name="action" value="marketLogs"><input type="hidden" name="market_passcode" value="' + escapedPasscode + '"><button type="submit">取得ログを再読み込み</button></form>',
    '<form method="get"' + actionAttr + '><input type="hidden" name="action" value="marketMaster"><input type="hidden" name="market_passcode" value="' + escapedPasscode + '"><button type="submit">GooBike車種マスタを見る</button></form>',
    '<form method="get"' + actionAttr + '><input type="hidden" name="action" value="marketMasterRefresh"><input type="hidden" name="market_passcode" value="' + escapedPasscode + '"><button type="submit">GooBike車種マスタ更新</button></form>',
    '</div>',
    '<p class="muted">ボタンを押すと別ページでプレーンテキスト結果を表示します。戻る場合はブラウザの戻るボタンを使ってください。</p>',
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
  return HtmlService
    .createHtmlOutput(html)
    .setTitle('相場データ管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getWebAppUrlForMarketAdmin_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (error) {
    return '';
  }
}
