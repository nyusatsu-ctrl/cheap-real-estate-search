// ============================================================
// 自社ローン仮審査申込メール → スプレッドシート自動取り込み
// ステップ1
// ============================================================

// ★★★ ここにスプレッドシートのIDを貼り付けてください ★★★
// TODO: 公開リポジトリで運用する場合は PropertiesService 管理へ移し、コード上に固定IDを置かない。
var SPREADSHEET_ID = '1mHHZj52sdonTvhqTHv2mYrjFumdnGwltzg9-t6XXvpw';

// シート名
var SHEET_NAME = 'シート1';

// 処理済みラベル名（自動で作成されます）
var LABEL_NAME = '仮審査_処理済み';

// 取り込み・整理対象にする最初の日付（2026年5月1日以降だけ残します）
var IMPORT_START_DATE = new Date(2026, 4, 1, 0, 0, 0);
var IMPORT_RECENT_QUERY_WINDOW = 'newer_than:14d';
var IMPORT_GMAIL_SEARCH_LIMIT_PER_QUERY = 10;
var IMPORT_MAX_THREADS_PER_RUN = 10;
var IMPORT_MAX_MESSAGES_PER_RUN = 10;
var IMPORT_MAX_NEW_ROWS_PER_RUN = 5;
var IMPORT_SAFE_RUNTIME_MS = 280000;
var IMPORT_PROCESSED_MESSAGE_IDS_PROPERTY = 'IMPORT_PROCESSED_MESSAGE_IDS';
var IMPORT_PROCESSED_MESSAGE_IDS_MAX = 300;

// メール検索条件
// Gmailの検索式は複雑にまとめず、仮審査とお問い合わせを別々に検索して取りこぼしを防ぎます。
var SEARCH_QUERIES = [
  'subject:"自社ローン仮審査申し込み" ' + IMPORT_RECENT_QUERY_WINDOW + ' -label:' + LABEL_NAME,
  'subject:お問い合わせ ' + IMPORT_RECENT_QUERY_WINDOW + ' -label:' + LABEL_NAME,
  '"お問い合わせ内容" ' + IMPORT_RECENT_QUERY_WINDOW + ' -label:' + LABEL_NAME
];

var PHONE_COLUMNS = [
  '電話番号',
  '勤務先電話番号',
  '電話番号(独り暮らしの場合)'
];

var EXTRA_APPLICATION_COLUMNS = [
  'お問い合わせ内容'
];

var FIELD_ALIASES = {
  'お問い合わせ': 'お問い合わせ内容',
  'お問い合わせ内容': 'お問い合わせ内容',
  'お問い合わせの内容': 'お問い合わせ内容',
  'お問合せ内容': 'お問い合わせ内容',
  '問合せ内容': 'お問い合わせ内容',
  '内容': 'お問い合わせ内容',
  'メッセージ': 'お問い合わせ内容',
  'メッセージ本文': 'お問い合わせ内容',
  '住所（カナ）': '住所(カナ)',
  '住所(かな)': '住所(カナ)',
  '住所（かな）': '住所(カナ)',
  '住所カナ': '住所(カナ)',
  '住所フリガナ': '住所(カナ)',
  '勤務先名（フリガナ）': '勤務先名(フリガナ)'
};

// スプレッドシートに書き込む項目名（メールの項目名と同じ順番）
var COLUMNS = [
  '受信日時',           // ← これはメールの受信日時を自動で入れます
  'ご希望',
  'お名前',
  'フリガナ',
  '性別',
  '生年月日',
  '年齢',
  '郵便番号',
  '住所',
  '住所(カナ)',
  'お住まい',
  '居住年数',
  'ご家族(配偶者)',
  '奥様のメールアドレス',
  '奥様は仕事はされていますか?',
  '配偶者以外の同居のご家族（子◯人・その他◯人）',
  '電話番号',
  'メールアドレス',
  '勤務先名',
  '勤務先名(フリガナ)',
  '勤務先住所',
  '勤務先電話番号',
  '業務内容',
  '職業',
  '税込年収',
  '税込月収',
  '勤続年数',
  '従業員数',
  '保険証の種類',
  'お名前(独り暮らしの場合)',
  'フリガナ(独り暮らしの場合)',
  '住所(独り暮らしの場合)',
  '間柄(独り暮らしの場合)',
  '電話番号(独り暮らしの場合)',
  '車種(処分・廃車手配車両)',
  '年式(処分・廃車手配車両)',
  '走行距離(処分・廃車手配車両)',
  '希望車種(希望車種)',
  '年式(希望車種)',
  'グレード(希望車種)',
  '色(希望車種)',
  '毎月の支払い金額は最高ではいくら払えますか',
  '給料日',
  '勤務時間'
];

// ============================================================
// メイン処理：メールを読み取ってスプレッドシートに書き込む
// ============================================================
function importLoanApplications() {
  var startedAt = new Date().getTime();
  var processedMessageIds = getImportProcessedMessageIdMap_();
  var processedMessageIdsChanged = false;
  var checkedMessageCount = 0;
  var importedCount = 0;
  var duplicateCount = 0;
  var skippedCount = 0;
  var reachedLimit = false;

  // スプレッドシートとシートを取得
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // シートが見つからない場合はエラー
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。シート名を確認してください。');
  }

  // ヘッダー行がなければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    // ヘッダー行を太字にする
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    // ヘッダー行を固定する
    sheet.setFrozenRows(1);
  }
  ensureBaseColumns_(sheet);

  // 処理済みラベルを取得（なければ作成）
  var label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(LABEL_NAME);
  }

  // 未処理のメールを検索
  var threads = searchTargetThreads_();

  if (threads.length === 0) {
    Logger.log('新しい仮審査メール・お問い合わせメールはありませんでした。');
    return;
  }

  Logger.log(threads.length + ' 件の未処理スレッドが見つかりました。');

  for (var t = 0; t < threads.length; t++) {
    if (shouldStopImportRun_(startedAt)) {
      reachedLimit = true;
      Logger.log('実行時間上限が近いため、残りのスレッドは次回に回します。');
      break;
    }

    var messages = threads[t].getMessages();
    messages.sort(function(a, b) {
      return b.getDate().getTime() - a.getDate().getTime();
    });
    var threadFullyHandled = true;

    for (var m = 0; m < messages.length; m++) {
      if (shouldStopImportRun_(startedAt) || checkedMessageCount >= IMPORT_MAX_MESSAGES_PER_RUN || importedCount >= IMPORT_MAX_NEW_ROWS_PER_RUN) {
        threadFullyHandled = false;
        reachedLimit = true;
        Logger.log('今回の処理上限に達したため、残りのメールは次回に回します。');
        break;
      }

      var message = messages[m];
      var messageId = getGmailMessageId_(message);
      if (messageId && processedMessageIds[messageId]) {
        continue;
      }
      checkedMessageCount++;

      var subject = message.getSubject();
      var applicationType = getApplicationTypeFromSubject_(subject);
      var body = message.getPlainBody();
      if (applicationType === '' && isInquiryMessage_(message, body)) {
        applicationType = 'お問い合わせ';
      }

      // 仮審査・お問い合わせ以外のメールは取り込まない
      if (applicationType === '') {
        if (messageId) {
          processedMessageIds[messageId] = true;
          processedMessageIdsChanged = true;
        }
        skippedCount++;
        continue;
      }

      var receivedDate = message.getDate();
      if (receivedDate < IMPORT_START_DATE) {
        Logger.log('2026/05/01より前のため取り込みスキップ: ' + subject);
        if (messageId) {
          processedMessageIds[messageId] = true;
          processedMessageIdsChanged = true;
        }
        skippedCount++;
        continue;
      }

      // メール本文をパース（解析）する
      var parsed = parseEmailBody(body);
      if (applicationType === 'お問い合わせ' && !parsed['お問い合わせ内容']) {
        parsed['お問い合わせ内容'] = extractInquiryContent_(body);
      }

      // 1行分のデータを作成
      var row = [];
      for (var c = 0; c < COLUMNS.length; c++) {
        if (COLUMNS[c] === '受信日時') {
          // 受信日時をフォーマットして入れる
          row.push(Utilities.formatDate(receivedDate, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'));
        } else {
          // メール本文から該当する値を取得（なければ空欄）
          row.push(normalizeImportedValue_(COLUMNS[c], parsed[COLUMNS[c]] || ''));
        }
      }

      // 既に同じ申込がある場合は、二重取り込みしない
      if (isDuplicateApplication(sheet, row)) {
        Logger.log('重複のため取り込みスキップ: ' + (parsed['お名前'] || '名前なし'));
        if (messageId) {
          processedMessageIds[messageId] = true;
          processedMessageIdsChanged = true;
        }
        duplicateCount++;
        continue;
      }

      // スプレッドシートの2行目に挿入（新しい申込が常に一番上に来る）
      sheet.insertRowAfter(1);
      formatPhoneColumns_(sheet, 2);
      sheet.getRange(2, 1, 1, row.length).setValues([row]);
      setApplicationTypeIfColumnExists_(sheet, 2, applicationType);
      setExtraApplicationColumns_(sheet, 2, parsed);
      var autoMarketCustomerId = '';
      try {
        var autoMarketHeaderMap = getHeaderMap_(sheet);
        var autoMarketRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
        autoMarketCustomerId = buildApplicationRowKey_(autoMarketRow, autoMarketHeaderMap);
        queueBikeMarketLookupForNewCustomer(autoMarketCustomerId);
      } catch (autoMarketError) {
        try {
          saveBikeMarketAutoFetchError(autoMarketCustomerId || 2, autoMarketError);
        } catch (saveAutoMarketError) {
          Logger.log('相場自動取得エラー保存失敗: ' + (saveAutoMarketError && saveAutoMarketError.message ? saveAutoMarketError.message : saveAutoMarketError));
        }
        Logger.log('相場自動取得は失敗しましたが、申込取込は継続します: ' + (autoMarketError && autoMarketError.message ? autoMarketError.message : autoMarketError));
      }
      if (messageId) {
        processedMessageIds[messageId] = true;
        processedMessageIdsChanged = true;
      }
      importedCount++;
      Logger.log('取り込み完了: ' + (parsed['お名前'] || '名前なし'));
    }

    // スレッドに処理済みラベルを付ける
    if (threadFullyHandled) {
      threads[t].addLabel(label);
    }
    if (processedMessageIdsChanged) {
      saveImportProcessedMessageIdMap_(processedMessageIds);
      processedMessageIdsChanged = false;
    }
  }

  if (processedMessageIdsChanged) {
    saveImportProcessedMessageIdMap_(processedMessageIds);
  }

  if (!shouldStopImportRun_(startedAt)) {
    normalizeApplicationSheetForCurrentPolicy();
  } else {
    Logger.log('実行時間上限が近いため、シート整理処理は次回以降に回します。');
  }

  Logger.log('取り込み処理終了: 確認メール数=' + checkedMessageCount + ', 新規取り込み=' + importedCount + ', 重複スキップ=' + duplicateCount + ', その他スキップ=' + skippedCount + ', 上限到達=' + reachedLimit);
}

function searchTargetThreads_() {
  var threadMap = {};
  var threads = [];

  for (var i = 0; i < SEARCH_QUERIES.length; i++) {
    var foundThreads = GmailApp.search(SEARCH_QUERIES[i], 0, IMPORT_GMAIL_SEARCH_LIMIT_PER_QUERY);
    for (var t = 0; t < foundThreads.length; t++) {
      var threadId = foundThreads[t].getId();
      if (!threadMap[threadId]) {
        threadMap[threadId] = true;
        threads.push(foundThreads[t]);
        if (threads.length >= IMPORT_MAX_THREADS_PER_RUN) {
          return threads;
        }
      }
    }
  }

  return threads;
}

function shouldStopImportRun_(startedAt) {
  return new Date().getTime() - startedAt >= IMPORT_SAFE_RUNTIME_MS;
}

function getGmailMessageId_(message) {
  try {
    return message && message.getId ? String(message.getId()) : '';
  } catch (error) {
    return '';
  }
}

function getImportProcessedMessageIdMap_() {
  var raw = '';
  try {
    raw = PropertiesService.getScriptProperties().getProperty(IMPORT_PROCESSED_MESSAGE_IDS_PROPERTY) || '';
  } catch (error) {
    return {};
  }
  if (!raw) {
    return {};
  }
  try {
    var ids = JSON.parse(raw);
    var map = {};
    (Array.isArray(ids) ? ids : []).forEach(function(id) {
      if (id) {
        map[String(id)] = true;
      }
    });
    return map;
  } catch (error) {
    return {};
  }
}

function saveImportProcessedMessageIdMap_(messageIdMap) {
  var ids = Object.keys(messageIdMap || {});
  if (ids.length > IMPORT_PROCESSED_MESSAGE_IDS_MAX) {
    ids = ids.slice(ids.length - IMPORT_PROCESSED_MESSAGE_IDS_MAX);
  }
  PropertiesService.getScriptProperties().setProperty(IMPORT_PROCESSED_MESSAGE_IDS_PROPERTY, JSON.stringify(ids));
}

function getApplicationTypeFromSubject_(subject) {
  var text = String(subject || '');
  if (text.indexOf('自社ローン仮審査申し込み') !== -1) {
    return '仮審査申込';
  }
  if (text.indexOf('お問い合わせ') !== -1) {
    return 'お問い合わせ';
  }
  return '';
}

function setApplicationTypeIfColumnExists_(sheet, rowNumber, applicationType) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (trimFullWidth(String(headers[i] || '')) === '申込種別') {
      sheet.getRange(rowNumber, i + 1).setValue(applicationType);
      return;
    }
  }
}

function normalizeApplicationSheetForCurrentPolicy() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      deletedCount: 0,
      sorted: false,
      message: '整理対象のデータがありません。'
    };
  }

  var applicationTypeColumn = ensureColumnByHeader_(sheet, '申込種別');
  var inquiryContentColumn = ensureColumnByHeader_(sheet, 'お問い合わせ内容');
  var lastColumn = sheet.getLastColumn();
  var receivedAtColumn = getColumnByHeader_(sheet, '受信日時');
  if (!receivedAtColumn) {
    throw new Error('受信日時列が見つかりません。');
  }

  var deletedCount = 0;
  for (var row = sheet.getLastRow(); row >= 2; row--) {
    var receivedAt = sheet.getRange(row, receivedAtColumn).getDisplayValue();
    var receivedTime = parseSheetReceivedAtTime_(receivedAt);
    if (receivedTime > 0 && receivedTime < IMPORT_START_DATE.getTime()) {
      sheet.deleteRow(row);
      deletedCount++;
    }
  }

  lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      deletedCount: deletedCount,
      sorted: false,
      message: deletedCount + '行を削除しました。残ったデータはありません。'
    };
  }

  var typeRange = sheet.getRange(2, applicationTypeColumn, lastRow - 1, 1);
  var typeValues = typeRange.getDisplayValues();
  var inquiryContentValues = sheet.getRange(2, inquiryContentColumn, lastRow - 1, 1).getDisplayValues();
  var updatedTypeCount = 0;
  for (var i = 0; i < typeValues.length; i++) {
    var currentType = trimFullWidth(String(typeValues[i][0] || ''));
    if (currentType === '') {
      typeValues[i][0] = trimFullWidth(String(inquiryContentValues[i][0] || '')) !== '' ? 'お問い合わせ' : '仮審査申込';
      updatedTypeCount++;
    }
  }
  if (updatedTypeCount > 0) {
    typeRange.setValues(typeValues);
  }

  var inquiryBackfillCount = backfillInquiryContentBySheetRows_(sheet, sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues(), {
    applicationTypeColumn: applicationTypeColumn,
    inquiryContentColumn: inquiryContentColumn,
    nameColumn: getColumnByHeader_(sheet, 'お名前'),
    phoneColumn: getColumnByHeader_(sheet, '電話番号'),
    emailColumn: getColumnByHeader_(sheet, 'メールアドレス')
  });
  var duplicateDeletedCount = deleteDuplicateApplicationRows_(sheet);
  lastRow = sheet.getLastRow();
  lastColumn = sheet.getLastColumn();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).sort({
      column: receivedAtColumn,
      ascending: false
    });
  }

  Logger.log(deletedCount + '行を削除し、' + duplicateDeletedCount + '行の重複を削除し、' + updatedTypeCount + '行の申込種別を補完し、' + inquiryBackfillCount + '件のお問い合わせ内容を補完し、受信日時の新しい順に並べました。');
  return {
    deletedCount: deletedCount,
    duplicateDeletedCount: duplicateDeletedCount,
    updatedTypeCount: updatedTypeCount,
    inquiryBackfillCount: inquiryBackfillCount,
    sorted: true,
    message: deletedCount + '行を削除し、' + duplicateDeletedCount + '行の重複を削除し、' + updatedTypeCount + '行の申込種別を補完し、' + inquiryBackfillCount + '件のお問い合わせ内容を補完し、受信日時の新しい順に並べました。'
  };
}

function backfillInquiryContentFromGmail() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      updatedCount: 0,
      message: '補完対象のデータがありません。'
    };
  }

  var receivedAtColumn = getColumnByHeader_(sheet, '受信日時');
  var applicationTypeColumn = ensureColumnByHeader_(sheet, '申込種別');
  var inquiryContentColumn = ensureColumnByHeader_(sheet, 'お問い合わせ内容');
  var nameColumn = getColumnByHeader_(sheet, 'お名前');
  var phoneColumn = getColumnByHeader_(sheet, '電話番号');
  var emailColumn = getColumnByHeader_(sheet, 'メールアドレス');
  var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
  var updatedCount = 0;
  var directUpdatedCount = backfillInquiryContentBySheetRows_(sheet, rows, {
    applicationTypeColumn: applicationTypeColumn,
    inquiryContentColumn: inquiryContentColumn,
    nameColumn: nameColumn,
    phoneColumn: phoneColumn,
    emailColumn: emailColumn
  });
  if (directUpdatedCount > 0) {
    rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    updatedCount += directUpdatedCount;
  }

  var threads = searchInquiryThreadsForBackfill_();
  var inquiryMessageCount = 0;
  var contentFoundCount = 0;

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var plainBody = message.getPlainBody();
      if (!isInquiryMessage_(message, plainBody)) {
        continue;
      }
      inquiryMessageCount++;
      if (message.getDate() < IMPORT_START_DATE) {
        continue;
      }

      var parsed = parseEmailBody(plainBody);
      var inquiryContent = parsed['お問い合わせ内容'] || '';
      if (inquiryContent === '') {
        inquiryContent = extractInquiryContent_(plainBody);
      }
      if (inquiryContent === '') {
        continue;
      }
      contentFoundCount++;

      var receivedAt = Utilities.formatDate(message.getDate(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
      var parsedName = normalizeDuplicateValue(parsed['お名前'] || '');
      var parsedPhone = normalizeDuplicateValue(normalizePhoneNumber_(parsed['電話番号'] || ''));
      var parsedEmail = normalizeDuplicateValue(parsed['メールアドレス'] || '');
      for (var r = 0; r < rows.length; r++) {
        var rowNumber = r + 2;
        var rowReceivedAt = trimFullWidth(String(rows[r][receivedAtColumn - 1] || ''));
        var existingContent = trimFullWidth(String(rows[r][inquiryContentColumn - 1] || ''));
        var rowName = nameColumn ? normalizeDuplicateValue(rows[r][nameColumn - 1] || '') : '';
        var rowPhone = phoneColumn ? normalizeDuplicateValue(normalizePhoneNumber_(rows[r][phoneColumn - 1] || '')) : '';
        var rowEmail = emailColumn ? normalizeDuplicateValue(rows[r][emailColumn - 1] || '') : '';

        if (existingContent !== '') {
          continue;
        }
        if (rowReceivedAt !== receivedAt && !isSameInquiryRow_(rowName, rowPhone, rowEmail, parsedName, parsedPhone, parsedEmail)) {
          continue;
        }

        sheet.getRange(rowNumber, inquiryContentColumn).setValue(inquiryContent);
        sheet.getRange(rowNumber, applicationTypeColumn).setValue('お問い合わせ');
        rows[r][inquiryContentColumn - 1] = inquiryContent;
        rows[r][applicationTypeColumn - 1] = 'お問い合わせ';
        updatedCount++;
        break;
      }
    }
  }

  Logger.log(updatedCount + '件のお問い合わせ内容を補完しました。');
  return {
    updatedCount: updatedCount,
    searchedThreadCount: threads.length,
    inquiryMessageCount: inquiryMessageCount,
    contentFoundCount: contentFoundCount,
    message: updatedCount + '件のお問い合わせ内容を補完しました。'
  };
}

function searchInquiryThreadsForBackfill_() {
  var queries = [
    'subject:お問い合わせ after:2026/4/30',
    '"お問い合わせ内容" after:2026/4/30',
    'from:info@ecoloop-loan.net after:2026/4/30'
  ];
  var threadMap = {};
  var threads = [];

  for (var i = 0; i < queries.length; i++) {
    var foundThreads = GmailApp.search(queries[i], 0, 500);
    for (var t = 0; t < foundThreads.length; t++) {
      var threadId = foundThreads[t].getId();
      if (!threadMap[threadId]) {
        threadMap[threadId] = true;
        threads.push(foundThreads[t]);
      }
    }
  }

  return threads;
}

function backfillInquiryContentBySheetRows_(sheet, rows, columns) {
  var updatedCount = 0;

  for (var r = 0; r < rows.length; r++) {
    var rowNumber = r + 2;
    var existingContent = trimFullWidth(String(rows[r][columns.inquiryContentColumn - 1] || ''));
    if (existingContent !== '') {
      continue;
    }

    var rowApplicationType = trimFullWidth(String(rows[r][columns.applicationTypeColumn - 1] || ''));
    var rowName = columns.nameColumn ? trimFullWidth(String(rows[r][columns.nameColumn - 1] || '')) : '';
    var rowPhone = columns.phoneColumn ? normalizePhoneNumber_(rows[r][columns.phoneColumn - 1] || '') : '';
    var rowEmail = columns.emailColumn ? trimFullWidth(String(rows[r][columns.emailColumn - 1] || '')) : '';

    if (rowApplicationType !== 'お問い合わせ' && rowEmail === '' && rowPhone === '') {
      continue;
    }

    var inquiryContent = findInquiryContentForRow_(rowName, rowPhone, rowEmail);
    if (inquiryContent === '') {
      continue;
    }

    sheet.getRange(rowNumber, columns.inquiryContentColumn).setValue(inquiryContent);
    sheet.getRange(rowNumber, columns.applicationTypeColumn).setValue('お問い合わせ');
    rows[r][columns.inquiryContentColumn - 1] = inquiryContent;
    rows[r][columns.applicationTypeColumn - 1] = 'お問い合わせ';
    updatedCount++;
  }

  return updatedCount;
}

function findInquiryContentForRow_(rowName, rowPhone, rowEmail) {
  var queries = [];
  if (rowEmail !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowEmail) + '" after:2026/4/30');
  }
  if (rowPhone !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowPhone) + '" after:2026/4/30');
    queries.push('"' + escapeGmailQueryValue_(rowPhone.replace(/-/g, '')) + '" after:2026/4/30');
  }
  if (rowName !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowName) + '" subject:お問い合わせ after:2026/4/30');
  }

  var seenThreads = {};
  for (var q = 0; q < queries.length; q++) {
    var threads = GmailApp.search(queries[q], 0, 20);
    for (var t = 0; t < threads.length; t++) {
      var threadId = threads[t].getId();
      if (seenThreads[threadId]) {
        continue;
      }
      seenThreads[threadId] = true;

      var messages = threads[t].getMessages();
      for (var m = 0; m < messages.length; m++) {
        var message = messages[m];
        if (message.getDate() < IMPORT_START_DATE) {
          continue;
        }

        var plainBody = message.getPlainBody();
        if (!isInquiryMessage_(message, plainBody)) {
          continue;
        }

        var parsed = parseEmailBody(plainBody);
        if (!messageMatchesSheetRow_(plainBody, parsed, rowName, rowPhone, rowEmail)) {
          continue;
        }

        var inquiryContent = parsed['お問い合わせ内容'] || extractInquiryContent_(plainBody);
        if (inquiryContent !== '') {
          return inquiryContent;
        }
      }
    }
  }

  return '';
}

function messageMatchesSheetRow_(plainBody, parsed, rowName, rowPhone, rowEmail) {
  var bodyText = normalizeDuplicateValue(plainBody);
  var parsedName = normalizeDuplicateValue(parsed['お名前'] || '');
  var parsedPhone = normalizeDuplicateValue(normalizePhoneNumber_(parsed['電話番号'] || ''));
  var parsedEmail = normalizeDuplicateValue(parsed['メールアドレス'] || '');
  var normalizedRowName = normalizeDuplicateValue(rowName || '');
  var normalizedRowPhone = normalizeDuplicateValue(normalizePhoneNumber_(rowPhone || ''));
  var normalizedRowEmail = normalizeDuplicateValue(rowEmail || '');

  if (normalizedRowEmail !== '' && (parsedEmail === normalizedRowEmail || bodyText.indexOf(normalizedRowEmail) !== -1)) {
    return true;
  }
  if (normalizedRowPhone !== '' && (parsedPhone === normalizedRowPhone || bodyText.indexOf(normalizedRowPhone) !== -1)) {
    return true;
  }
  return normalizedRowName !== '' && (parsedName === normalizedRowName || bodyText.indexOf(normalizedRowName) !== -1);
}

function escapeGmailQueryValue_(value) {
  return String(value || '').replace(/"/g, '');
}

function isInquiryMessage_(message, plainBody) {
  if (getApplicationTypeFromSubject_(message.getSubject()) === 'お問い合わせ') {
    return true;
  }
  return /お問い合わせ内容[\s\u3000]*[：:]/.test(String(plainBody || ''));
}

function isSameInquiryRow_(rowName, rowPhone, rowEmail, parsedName, parsedPhone, parsedEmail) {
  if (parsedPhone !== '' && rowPhone !== '' && rowPhone === parsedPhone) {
    return true;
  }
  if (parsedEmail !== '' && rowEmail !== '' && rowEmail === parsedEmail) {
    return true;
  }
  return parsedName !== '' && rowName !== '' && rowName === parsedName;
}

function deleteDuplicateApplicationRows_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow <= 2) {
    return 0;
  }

  var headerMap = buildHeaderMapForSheet_(sheet);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues();
  var keptByKey = {};
  var rowsToDelete = [];

  for (var i = 0; i < rows.length; i++) {
    var duplicateKey = buildSheetDuplicateKey_(rows[i], headerMap);
    if (duplicateKey === '') {
      continue;
    }

    if (!keptByKey[duplicateKey]) {
      keptByKey[duplicateKey] = {
        rowNumber: i + 2,
        values: rows[i]
      };
      continue;
    }

    mergeDuplicateRowValues_(sheet, keptByKey[duplicateKey].rowNumber, keptByKey[duplicateKey].values, rows[i]);
    rowsToDelete.push(i + 2);
  }

  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  return rowsToDelete.length;
}

function buildHeaderMapForSheet_(sheet) {
  repairBaseApplicationHeaders_(sheet);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var headerMap = {};
  for (var i = 0; i < headers.length; i++) {
    var header = trimFullWidth(String(headers[i] || ''));
    if (header !== '') {
      headerMap[header] = i + 1;
    }
  }
  return headerMap;
}

function buildSheetDuplicateKey_(row, headerMap) {
  var receivedAt = getRowValueByHeader_(row, headerMap, '受信日時');
  var name = getRowValueByHeader_(row, headerMap, 'お名前');
  var phone = normalizePhoneNumber_(getRowValueByHeader_(row, headerMap, '電話番号'));
  var email = getRowValueByHeader_(row, headerMap, 'メールアドレス');
  var applicationType = getRowValueByHeader_(row, headerMap, '申込種別') || '仮審査申込';

  var keyParts = [
    applicationType,
    receivedAt,
    name,
    phone,
    email
  ];

  var normalized = keyParts.map(function(value) {
    return normalizeDuplicateValue(value);
  });

  var key = normalized.join('|');
  return key.replace(/\|/g, '') === '' ? '' : key;
}

function getRowValueByHeader_(row, headerMap, headerName) {
  var columnNumber = headerMap[headerName];
  return columnNumber ? row[columnNumber - 1] : '';
}

function mergeDuplicateRowValues_(sheet, keepRowNumber, keepValues, duplicateValues) {
  var updates = [];
  for (var c = 0; c < keepValues.length; c++) {
    var keepValue = trimFullWidth(String(keepValues[c] || ''));
    var duplicateValue = trimFullWidth(String(duplicateValues[c] || ''));
    if (keepValue === '' && duplicateValue !== '') {
      keepValues[c] = duplicateValues[c];
      updates.push({
        columnNumber: c + 1,
        value: duplicateValues[c]
      });
    }
  }

  for (var i = 0; i < updates.length; i++) {
    sheet.getRange(keepRowNumber, updates[i].columnNumber).setValue(updates[i].value);
  }
}

function getColumnByHeader_(sheet, headerName) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    return 0;
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (trimFullWidth(String(headers[i] || '')) === headerName) {
      return i + 1;
    }
  }
  return 0;
}

function ensureColumnByHeader_(sheet, headerName) {
  var existingColumn = getColumnByHeader_(sheet, headerName);
  if (existingColumn) {
    return existingColumn;
  }

  var nextColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextColumn).setValue(headerName).setFontWeight('bold');
  return nextColumn;
}

function parseSheetReceivedAtTime_(receivedAt) {
  if (Object.prototype.toString.call(receivedAt) === '[object Date]' && !isNaN(receivedAt.getTime())) {
    return receivedAt.getTime();
  }

  var text = trimFullWidth(String(receivedAt || ''));
  var match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (!match) {
    return 0;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0
  ).getTime();
}

// ============================================================
// メール本文を解析して {項目名: 値} のオブジェクトに変換する
// ============================================================
function parseEmailBody(body) {
  var result = {};

  // 末尾の定型文・投稿者情報を除去
  var footerMarkers = ['\nこのメールは', '\n--\nこのメールは', '\n■投稿者情報', '\n投稿者情報'];
  var cutIndex = -1;
  for (var markerIndex = 0; markerIndex < footerMarkers.length; markerIndex++) {
    var markerPosition = body.indexOf(footerMarkers[markerIndex]);
    if (markerPosition !== -1 && (cutIndex === -1 || markerPosition < cutIndex)) {
      cutIndex = markerPosition;
    }
  }
  if (cutIndex !== -1) {
    body = body.substring(0, cutIndex);
  }

  // 行ごとに分割
  var lines = body.split('\n');
  var currentKey = '';

  for (var i = 0; i < lines.length; i++) {
    var line = trimFullWidth(lines[i]);

    // 空行はスキップ
    if (line === '') continue;

    // コロン（全角：半角：その他類似文字）で分割
    var colonMatch = line.match(/[：:\u2236\uA789]/);
    if (!colonMatch) {
      if (currentKey !== '') {
        result[currentKey] = trimFullWidth((result[currentKey] || '') + '\n' + line);
      }
      continue;
    }

    var colonIndex = colonMatch.index;
    var key = normalizeFieldName_(trimFullWidth(line.substring(0, colonIndex)));
    var value = trimFullWidth(line.substring(colonIndex + colonMatch[0].length));

    // 項目名がCOLUMNSまたは追加項目に含まれている場合のみ保存
    if (COLUMNS.indexOf(key) !== -1 || EXTRA_APPLICATION_COLUMNS.indexOf(key) !== -1) {
      result[key] = value;
      currentKey = key;
    } else if (currentKey === 'お問い合わせ内容') {
      result[currentKey] = trimFullWidth((result[currentKey] || '') + '\n' + line);
    } else {
      currentKey = '';
    }
  }

  return result;
}

function extractInquiryContent_(body) {
  var text = String(body || '');
  var startMatch = text.match(/(?:お問い合わせ内容|お問い合わせの内容|お問合せ内容|問合せ内容|内容|メッセージ)[\s\u3000]*[：:]/);
  if (!startMatch) {
    return '';
  }

  var content = text.substring(startMatch.index + startMatch[0].length);
  var footerMarkers = ['\nこのメールは', '\n--\nこのメールは', '\n■投稿者情報', '\n投稿者情報'];
  var cutIndex = -1;
  for (var i = 0; i < footerMarkers.length; i++) {
    var markerPosition = content.indexOf(footerMarkers[i]);
    if (markerPosition !== -1 && (cutIndex === -1 || markerPosition < cutIndex)) {
      cutIndex = markerPosition;
    }
  }
  if (cutIndex !== -1) {
    content = content.substring(0, cutIndex);
  }

  return trimFullWidth(content);
}

function normalizeFieldName_(key) {
  var normalized = trimFullWidth(String(key || ''))
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[\s\u3000]+/g, '');
  return FIELD_ALIASES[normalized] || FIELD_ALIASES[key] || normalized;
}

function backfillAddressKanaFromGmail() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      updatedCount: 0,
      message: '補完対象のデータがありません。'
    };
  }

  var headerMap = buildHeaderMapForSheet_(sheet);
  var addressKanaColumn = headerMap['住所(カナ)'];
  if (!addressKanaColumn) {
    throw new Error('住所(カナ)列が見つかりません。');
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
  var updatedCount = 0;
  for (var r = 0; r < rows.length; r++) {
    var existingKana = trimFullWidth(String(rows[r][addressKanaColumn - 1] || ''));
    if (existingKana !== '') {
      continue;
    }

    var rowName = headerMap['お名前'] ? trimFullWidth(String(rows[r][headerMap['お名前'] - 1] || '')) : '';
    var rowPhone = headerMap['電話番号'] ? normalizePhoneNumber_(rows[r][headerMap['電話番号'] - 1] || '') : '';
    var rowEmail = headerMap['メールアドレス'] ? trimFullWidth(String(rows[r][headerMap['メールアドレス'] - 1] || '')) : '';
    var addressKana = findApplicationFieldValueForRow_(rowName, rowPhone, rowEmail, '住所(カナ)');
    if (addressKana === '') {
      continue;
    }

    sheet.getRange(r + 2, addressKanaColumn).setValue(addressKana);
    rows[r][addressKanaColumn - 1] = addressKana;
    updatedCount++;
  }

  Logger.log(updatedCount + '件の住所(カナ)をGmailから補完しました。');
  return {
    updatedCount: updatedCount,
    message: updatedCount + '件の住所(カナ)をGmailから補完しました。'
  };
}

function findApplicationFieldValueForRow_(rowName, rowPhone, rowEmail, fieldName) {
  var queries = [];
  if (rowEmail !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowEmail) + '" after:2026/4/30');
  }
  if (rowPhone !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowPhone) + '" after:2026/4/30');
    queries.push('"' + escapeGmailQueryValue_(rowPhone.replace(/-/g, '')) + '" after:2026/4/30');
  }
  if (rowName !== '') {
    queries.push('"' + escapeGmailQueryValue_(rowName) + '" after:2026/4/30');
  }

  var seenThreads = {};
  for (var q = 0; q < queries.length; q++) {
    var threads = GmailApp.search(queries[q], 0, 20);
    for (var t = 0; t < threads.length; t++) {
      var threadId = threads[t].getId();
      if (seenThreads[threadId]) {
        continue;
      }
      seenThreads[threadId] = true;

      var messages = threads[t].getMessages();
      for (var m = 0; m < messages.length; m++) {
        var message = messages[m];
        if (message.getDate() < IMPORT_START_DATE) {
          continue;
        }

        var plainBody = message.getPlainBody();
        var parsed = parseEmailBody(plainBody);
        if (!messageMatchesSheetRow_(plainBody, parsed, rowName, rowPhone, rowEmail)) {
          continue;
        }

        var value = trimFullWidth(String(parsed[fieldName] || ''));
        if (value !== '') {
          return value;
        }
      }
    }
  }

  return '';
}

function ensureBaseColumns_(sheet) {
  repairBaseApplicationHeaders_(sheet);
  for (var i = 0; i < EXTRA_APPLICATION_COLUMNS.length; i++) {
    ensureColumnByHeader_(sheet, EXTRA_APPLICATION_COLUMNS[i]);
  }
}

function repairBaseApplicationHeaders_(sheet) {
  if (typeof COLUMNS === 'undefined' || !COLUMNS || COLUMNS.length === 0) {
    return;
  }

  if (sheet.getMaxColumns() < COLUMNS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), COLUMNS.length - sheet.getMaxColumns());
  }

  var currentHeaders = sheet.getRange(1, 1, 1, COLUMNS.length).getDisplayValues()[0];
  var needsRepair = false;
  for (var i = 0; i < COLUMNS.length; i++) {
    if (trimFullWidth(String(currentHeaders[i] || '')) !== COLUMNS[i]) {
      needsRepair = true;
      break;
    }
  }

  if (!needsRepair) {
    return;
  }

  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function setExtraApplicationColumns_(sheet, rowNumber, parsed) {
  for (var i = 0; i < EXTRA_APPLICATION_COLUMNS.length; i++) {
    var columnName = EXTRA_APPLICATION_COLUMNS[i];
    var value = parsed[columnName] || '';
    if (value === '') {
      continue;
    }

    var columnNumber = ensureColumnByHeader_(sheet, columnName);
    sheet.getRange(rowNumber, columnNumber).setValue(value);
  }
}

// ============================================================
// 全角スペース・半角スペース・タブなどをまとめて除去するtrim
// ============================================================
function trimFullWidth(str) {
  return str.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
}

// ============================================================
// 同じ申込がすでにスプレッドシートにあるか確認する
// 受信日時・お名前・電話番号・メールアドレスが同じなら重複と判断します
// ============================================================
function isDuplicateApplication(sheet, row) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return false;
  }

  var checkColumnNames = ['受信日時', 'お名前', '電話番号', 'メールアドレス'];
  var checkIndexes = checkColumnNames.map(function(columnName) {
    return COLUMNS.indexOf(columnName);
  });

  var newKey = buildDuplicateKey(row, checkIndexes);
  if (newKey === '') {
    return false;
  }

  var existingRows = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getDisplayValues();
  for (var i = 0; i < existingRows.length; i++) {
    if (buildDuplicateKey(existingRows[i], checkIndexes) === newKey) {
      return true;
    }
  }

  return false;
}

function buildDuplicateKey(values, indexes) {
  var parts = [];
  for (var i = 0; i < indexes.length; i++) {
    var index = indexes[i];
    if (index === -1) {
      continue;
    }
    parts.push(normalizeDuplicateValue(values[index]));
  }

  var key = parts.join('|');
  return key.replace(/\|/g, '') === '' ? '' : key;
}

function normalizeDuplicateValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return trimFullWidth(String(value)).replace(/[\s\u3000]+/g, '');
}

function normalizeImportedValue_(columnName, value) {
  if (PHONE_COLUMNS.indexOf(columnName) === -1) {
    return value;
  }
  return normalizePhoneNumber_(value);
}

function normalizePhoneNumber_(value) {
  var text = trimFullWidth(String(value || ''));
  if (text === '') {
    return '';
  }

  text = text.replace(/[０-９]/g, function(char) {
    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
  });

  var digitsOnly = text.replace(/\D/g, '');
  if (/^\d{9,10}$/.test(digitsOnly) && digitsOnly.charAt(0) !== '0') {
    return '0' + digitsOnly;
  }

  return text;
}

function formatPhoneColumns_(sheet, rowNumber) {
  for (var i = 0; i < PHONE_COLUMNS.length; i++) {
    var index = COLUMNS.indexOf(PHONE_COLUMNS[i]);
    if (index !== -1) {
      sheet.getRange(rowNumber, index + 1).setNumberFormat('@');
    }
  }
}

function fixExistingPhoneNumbers() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('修正対象のデータがありません。');
    return;
  }

  var updatedCount = 0;
  for (var i = 0; i < PHONE_COLUMNS.length; i++) {
    var columnIndex = COLUMNS.indexOf(PHONE_COLUMNS[i]);
    if (columnIndex === -1) {
      continue;
    }

    var columnNumber = columnIndex + 1;
    var range = sheet.getRange(2, columnNumber, lastRow - 1, 1);
    range.setNumberFormat('@');
    var values = range.getDisplayValues();

    for (var r = 0; r < values.length; r++) {
      var current = values[r][0];
      var normalized = normalizePhoneNumber_(current);
      if (normalized !== '' && normalized !== current) {
        values[r][0] = normalized;
        updatedCount++;
      }
    }

    range.setValues(values);
  }

  Logger.log(updatedCount + '件の電話番号を修正しました。');
  return {
    updatedCount: updatedCount,
    message: updatedCount + '件の電話番号を修正しました。'
  };
}

// ============================================================
// 空白行を削除する（1回だけ手動で実行してください）
// ヘッダー（1行目）とデータの間にある空白行をすべて消します
// ============================================================
function cleanupBlankRows() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    Logger.log('データがありません。空白行の削除は不要です。');
    return;
  }

  // 全データを取得（2行目以降）
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // 削除する行を下から探す（下から消さないと行番号がずれる）
  var rowsToDelete = [];
  for (var i = 0; i < data.length; i++) {
    var isEmpty = data[i].every(function(cell) {
      return cell === '' || cell === null || cell === undefined;
    });
    if (isEmpty) {
      rowsToDelete.push(i + 2); // シート上の行番号（2行目始まり）
    }
  }

  // 下の行から順に削除
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  Logger.log(rowsToDelete.length + ' 行の空白行を削除しました。');
}

// ============================================================
// テスト用：手動で1回実行して動作確認するための関数
// ============================================================
function testImport() {
  importLoanApplications();
  Logger.log('テスト実行が完了しました。スプレッドシートを確認してください。');
}
