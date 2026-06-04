// ============================================================
// 自社ローン仮審査申込メール → スプレッドシート自動取り込み
// ステップ1
// ============================================================

// ★★★ ここにスプレッドシートのIDを貼り付けてください ★★★
var SPREADSHEET_ID = 'ここにスプレッドシートのIDを貼り付け';

// シート名
var SHEET_NAME = '申込データ';

// 処理済みラベル名（自動で作成されます）
var LABEL_NAME = '仮審査_処理済み';

// メール検索条件
var SEARCH_QUERY = 'subject:"自社ローン仮審査申し込み" -label:' + LABEL_NAME;

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

  // 処理済みラベルを取得（なければ作成）
  var label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(LABEL_NAME);
  }

  // 未処理のメールを検索
  var threads = GmailApp.search(SEARCH_QUERY, 0, 50);

  if (threads.length === 0) {
    Logger.log('新しい仮審査メールはありませんでした。');
    return;
  }

  Logger.log(threads.length + ' 件の新しいメールが見つかりました。');

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var subject = message.getSubject();

      // 件名に「自社ローン仮審査申し込み」が含まれているか確認
      if (subject.indexOf('自社ローン仮審査申し込み') === -1) {
        continue;
      }

      var receivedDate = message.getDate();
      var body = message.getPlainBody();

      // メール本文をパース（解析）する
      var parsed = parseEmailBody(body);

      // 1行分のデータを作成
      var row = [];
      for (var c = 0; c < COLUMNS.length; c++) {
        if (COLUMNS[c] === '受信日時') {
          // 受信日時をフォーマットして入れる
          row.push(Utilities.formatDate(receivedDate, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'));
        } else {
          // メール本文から該当する値を取得（なければ空欄）
          row.push(parsed[COLUMNS[c]] || '');
        }
      }

      // スプレッドシートの2行目に挿入（新しい申込が常に一番上に来る）
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, row.length).setValues([row]);
      Logger.log('取り込み完了: ' + (parsed['お名前'] || '名前なし'));
    }

    // スレッドに処理済みラベルを付ける
    threads[t].addLabel(label);
  }

  Logger.log('全件の取り込みが完了しました。');
}

// ============================================================
// メール本文を解析して {項目名: 値} のオブジェクトに変換する
// ============================================================
function parseEmailBody(body) {
  var result = {};

  // 末尾の定型文（「このメールは～」）を除去
  var cutIndex = body.indexOf('このメールは');
  if (cutIndex !== -1) {
    body = body.substring(0, cutIndex);
  }

  // 行ごとに分割
  var lines = body.split('\n');

  for (var i = 0; i < lines.length; i++) {
    var line = trimFullWidth(lines[i]);

    // 空行はスキップ
    if (line === '') continue;

    // コロン（全角：半角：その他類似文字）で分割
    var colonMatch = line.match(/[：:\u2236\uA789]/);
    if (!colonMatch) continue;

    var colonIndex = colonMatch.index;
    var key = trimFullWidth(line.substring(0, colonIndex));
    var value = trimFullWidth(line.substring(colonIndex + colonMatch[0].length));

    // 項目名がCOLUMNSに含まれている場合のみ保存
    if (COLUMNS.indexOf(key) !== -1) {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================
// 全角スペース・半角スペース・タブなどをまとめて除去するtrim
// ============================================================
function trimFullWidth(str) {
  return str.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
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
