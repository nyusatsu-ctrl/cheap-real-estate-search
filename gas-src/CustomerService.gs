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
  '電話つながった',
  '相談のみで終了',
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
var WEBAPP_REVIEW_OPTIONS = ['未依頼', '審査中', '可決', '否決'];
var WEBAPP_CALL_RESULT_OPTIONS = ['出た', '不在', '留守電', '折返し待ち', 'その他'];
var WEBAPP_LOAN_INPUT_COLUMNS = [
  '審査申込金額',
  '支払い回数',
  '実際の金利(%)'
];
var WEBAPP_LOAN_FORMULA_COLUMNS = [
  '1回目支払額',
  '2回目〜毎月',
  '総支払額',
  '実コスト総額',
  'キックバック差額'
];
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

function getDashboardData() {
  var sheet = getMainSheet_();
  var headerMap = getHeaderMap_(sheet);
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
      callResultOptions: WEBAPP_CALL_RESULT_OPTIONS,
      needsSetup: hasMissingManagementColumns_(managementMap)
    };
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  var customers = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isEmptyDisplayRow_(row)) {
      continue;
    }

    var rowNumber = i + 2;
    var customer = buildCustomerSummary_(row, rowNumber, headerMap, managementMap, callHistoryMap);
    customers.push(customer);
  }

  return {
    customers: customers,
    applicationTypeOptions: WEBAPP_APPLICATION_TYPE_OPTIONS,
    assigneeOptions: WEBAPP_ASSIGNEE_OPTIONS,
    statusOptions: WEBAPP_STATUS_OPTIONS,
    reviewOptions: WEBAPP_REVIEW_OPTIONS,
    callResultOptions: WEBAPP_CALL_RESULT_OPTIONS,
    needsSetup: hasMissingManagementColumns_(managementMap)
  };
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

function buildCustomerSummary_(row, rowNumber, headerMap, managementMap, callHistoryMap) {
  var rowKey = buildApplicationRowKey_(row, headerMap);
  var callHistory = callHistoryMap[rowKey] || [];
  var latestCall = callHistory.length > 0 ? callHistory[callHistory.length - 1] : null;
  var applicationType = getManagedCell_(row, managementMap, '申込種別') || '仮審査申込';
  var status = normalizeStatusLabel_(getManagedCell_(row, managementMap, '対応状況') || getManagedCell_(row, managementMap, '対応ステータス') || '新規受付');

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
    address: getCellByHeader_(row, headerMap, '住所'),
    addressKana: normalizeAddressKana_(getCellByHeader_(row, headerMap, '住所(カナ)')),
    prefecture: extractPrefecture_(getCellByHeader_(row, headerMap, '住所'), getCellByHeader_(row, headerMap, '郵便番号')),
    workplace: getCellByHeader_(row, headerMap, '勤務先名'),
    workplaceKana: getCellByHeader_(row, headerMap, '勤務先名(フリガナ)'),
    annualIncome: getCellByHeader_(row, headerMap, '税込年収'),
    desiredCar: getCellByHeader_(row, headerMap, '希望車種(希望車種)'),
    maxMonthlyPayment: getCellByHeader_(row, headerMap, '毎月の支払い金額は最高ではいくら払えますか'),
    applicationAmount: getCellByHeader_(row, headerMap, '審査申込金額'),
    paymentCount: getCellByHeader_(row, headerMap, '支払い回数'),
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
  for (var i = 0; i < COLUMNS.length; i++) {
    var columnName = COLUMNS[i];
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
  Object.keys(fieldValues).forEach(function(columnName) {
    if (COLUMNS.indexOf(columnName) === -1 || columnName === '受信日時' || WEBAPP_HIDDEN_APPLICATION_FIELDS.indexOf(columnName) !== -1) {
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

function updateLatestCallSummary_(sheet, rowNumber, payload, headerMap, result, staffName, callAt, memo, recorder) {
  var managementMap = getManagementColumnMap_(headerMap);
  var updates = {
    '対応状況': result === '出た' ? '電話つながった' : '架電中（不在・再架電待ち）',
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

function setLoanCalculationFormulas_(sheet, rowNumber, headerMap) {
  var requiredColumns = WEBAPP_LOAN_INPUT_COLUMNS.concat(WEBAPP_LOAN_FORMULA_COLUMNS);
  for (var i = 0; i < requiredColumns.length; i++) {
    if (!headerMap[requiredColumns[i]]) {
      return;
    }
  }

  var row = rowNumber;
  var formulas = {};
  formulas['1回目支払額'] = '=IF(OR(AS' + row + '="",AT' + row + '=""),"",AW' + row + '-AV' + row + '*(AT' + row + '-1))';
  formulas['2回目〜毎月'] = '=IF(OR(AS' + row + '="",AT' + row + '=""),"",CEILING(AS' + row + '*0.139/12/(1-(1+0.139/12)^-AT' + row + '),10))';
  formulas['総支払額'] = '=IF(OR(AS' + row + '="",AT' + row + '=""),"",ROUND(AS' + row + '*0.139/12/(1-(1+0.139/12)^-AT' + row + '),0)*AT' + row + ')';
  formulas['実コスト総額'] = '=IF(OR(AS' + row + '="",AT' + row + '="",AX' + row + '=""),"",ROUND(AS' + row + '*AX' + row + '/100/12/(1-(1+AX' + row + '/100/12)^-AT' + row + '),0)*AT' + row + ')';
  formulas['キックバック差額'] = '=IF(OR(AW' + row + '="",AY' + row + '=""),"",AW' + row + '-AY' + row + ')';

  Object.keys(formulas).forEach(function(columnName) {
    sheet.getRange(rowNumber, headerMap[columnName]).setFormula(formulas[columnName]);
  });
}
