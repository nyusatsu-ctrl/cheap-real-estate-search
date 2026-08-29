// ============================================================
// アスト申込書
// 申込書作成は印刷専用です。送信・審査依頼・契約作成は行いません。
// 顧客管理への保存は、画面で明示的に選択された場合だけ、この許可リストを使います。
// ============================================================

var AST_CUSTOMER_SAVE_FIELD_MAP = {
  applicantName: 'お名前',
  applicantKana: 'フリガナ',
  gender: '性別',
  age: '年齢',
  postalCode: '郵便番号',
  address: '住所',
  housingType: 'お住まい',
  spouseStatus: 'ご家族(配偶者)',
  mobilePhone: '電話番号',
  workplaceName: '勤務先名',
  workplaceKana: '勤務先名(フリガナ)',
  workPostalCode: '勤務先郵便番号',
  workAddress: '勤務先住所',
  workPhone: '勤務先電話番号',
  businessContent: '業務内容',
  occupationType: '職業',
  annualIncomeManYen: '税込年収',
  monthlyIncomeManYen: '税込月収',
  employeeCount: '従業員数',
  insuranceType: '保険証の種類',
  emergencyName: 'お名前(独り暮らしの場合)',
  emergencyKana: 'フリガナ(独り暮らしの場合)',
  emergencyAddress: '住所(独り暮らしの場合)',
  emergencyRelationship: '間柄(独り暮らしの場合)',
  emergencyPhone: '電話番号(独り暮らしの場合)',
  vehicleName: '希望車種(希望車種)',
  vehicleYear: '年式(希望車種)',
  vehicleGrade: 'グレード(希望車種)',
  vehicleColor: '色(希望車種)'
};

var AST_CUSTOMER_PHONE_FIELDS = {
  mobilePhone: true,
  workPhone: true,
  emergencyPhone: true
};

function saveAstApplicationCustomerFields(payload) {
  if (!payload || payload.saveToCustomer !== true) {
    throw new Error('顧客情報への保存が明示的に選択されていません。');
  }

  var rowKey = astString_(payload.rowKey);
  var form = payload.form && typeof payload.form === 'object' ? payload.form : {};
  if (!rowKey || astString_(form.sourceRowKey) !== rowKey) {
    throw new Error('対象顧客を確認できません。画面を閉じて顧客を選び直してください。');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('ほかの更新処理が実行中です。少し待ってから再度お試しください。');
  }

  try {
    var sheet = getMainSheet_();
    var headerMap = getHeaderMap_(sheet);
    var managementMap = getManagementColumnMap_(headerMap);
    var rowNumber = findCurrentRowNumber_(sheet, {
      rowKey: rowKey,
      rowNumber: payload.rowNumber
    });
    if (!rowNumber) {
      throw new Error('対象の申込行が見つかりません。画面を再読み込みしてください。');
    }

    var updates = buildAstCustomerUpdates_(form);
    var savedFields = [];
    Object.keys(updates).forEach(function(columnName) {
      var columnNumber = headerMap[columnName] || managementMap[columnName];
      if (!columnNumber) {
        return;
      }
      var range = sheet.getRange(rowNumber, columnNumber);
      if (isAstPhoneColumn_(columnName)) {
        range.setNumberFormat('@');
      }
      range.setValue(updates[columnName]);
      savedFields.push(columnName);
    });

    return {
      rowNumber: rowNumber,
      savedFieldCount: savedFields.length,
      message: savedFields.length + '項目を顧客情報へ保存しました。'
    };
  } finally {
    lock.releaseLock();
  }
}

function buildAstCustomerUpdates_(form) {
  var updates = {};
  Object.keys(AST_CUSTOMER_SAVE_FIELD_MAP).forEach(function(fieldName) {
    var columnName = AST_CUSTOMER_SAVE_FIELD_MAP[fieldName];
    var value = astString_(form[fieldName]);
    if (AST_CUSTOMER_PHONE_FIELDS[fieldName]) {
      value = normalizePhoneNumber_(value);
    }
    updates[columnName] = value;
  });

  updates['生年月日'] = buildAstBirthDateForCustomer_(form);
  updates['居住年数'] = buildAstDurationForCustomer_(form.residenceYears, form.residenceMonths);
  updates['勤続年数'] = buildAstDurationForCustomer_(form.employmentYears, form.employmentMonths);
  updates['配偶者以外の同居のご家族（子◯人・その他◯人）'] = buildAstFamilyForCustomer_(form);
  updates['審査申込金額'] = astManYenToYen_(form.loanAmountManYen);
  updates['担当者'] = astString_(form.salesStaff);

  return updates;
}

function buildAstBirthDateForCustomer_(form) {
  var era = astString_(form.birthEra);
  var year = astDigits_(form.birthYear);
  var month = astDigits_(form.birthMonth);
  var day = astDigits_(form.birthDay);
  if (!era && !year && !month && !day) {
    return '';
  }
  if (!era || !year || !month || !day) {
    return [era, year ? year + '年' : '', month ? month + '月' : '', day ? day + '日' : ''].join('');
  }
  return era + year + '年' + month + '月' + day + '日';
}

function buildAstDurationForCustomer_(years, months) {
  var yearValue = astDigits_(years);
  var monthValue = astDigits_(months);
  if (!yearValue && !monthValue) {
    return '';
  }
  return (yearValue ? yearValue + '年' : '') + (monthValue ? monthValue + 'ヶ月' : '');
}

function buildAstFamilyForCustomer_(form) {
  var children = astDigits_(form.childrenCount);
  var others = astDigits_(form.parentsSiblingsCount);
  if (!children && !others) {
    return '';
  }
  return '子' + (children || '0') + '人・その他' + (others || '0') + '人';
}

function astManYenToYen_(value) {
  var text = astString_(value).replace(/,/g, '').replace(/万円/g, '');
  if (!text) {
    return '';
  }
  var amount = Number(text);
  if (!isFinite(amount) || amount < 0) {
    return '';
  }
  return Math.round(amount * 10000);
}

function isAstPhoneColumn_(columnName) {
  return columnName === '電話番号'
    || columnName === '勤務先電話番号'
    || columnName === '電話番号(独り暮らしの場合)';
}

function astDigits_(value) {
  return astString_(value).replace(/[^0-9]/g, '');
}

function astString_(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value).replace(/^\s+|\s+$/g, '');
}
