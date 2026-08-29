import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

type AstClientSandbox = {
  buildAstApplicationSeed(customer: unknown): Record<string, string>;
  buildAstPrintHtml(form: Record<string, string>, templateDataUrl: string, autoPrint: boolean, warnings: string[]): string;
  validateAstApplication(form: Record<string, string>): string[];
};

type AstServerSandbox = {
  saveAstApplicationCustomerFields(payload: Record<string, unknown>): unknown;
};

async function read(relativePath: string) {
  return readFile(new URL(relativePath, root), "utf8");
}

function createElementStub() {
  return {
    addEventListener() {},
    classList: { add() {}, remove() {} },
    style: {} as Record<string, string>,
    hidden: true,
    innerHTML: "",
    textContent: "",
    checked: false,
    disabled: false,
  };
}

async function loadAstClient() {
  const html = await read("gas-src/AstApplicationEditor.html");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "AST editor client script must exist");
  const elements = new Map<string, ReturnType<typeof createElementStub>>();
  const getElement = (id: string) => {
    if (!elements.has(id)) elements.set(id, createElementStub());
    return elements.get(id)!;
  };
  const sandbox = {
    console,
    Date,
    Promise,
    setTimeout,
    document: {
      getElementById: getElement,
      body: { style: {} as Record<string, string> },
    },
    window: { confirm: () => true },
    state: { selected: null, saving: false },
    getApplicationFieldValue(customer: { applicationFields?: Array<{ name: string; value: string }> }, name: string) {
      return customer.applicationFields?.find((field) => field.name === name)?.value || "";
    },
    formatPrintPhone(value: string) {
      const digits = String(value || "").replace(/\D/g, "");
      if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      return value;
    },
    escapeHtml(value: unknown) {
      return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    },
  };
  vm.runInNewContext(script, sandbox, { filename: "AstApplicationEditor.html" });
  return { sandbox: sandbox as unknown as AstClientSandbox, html };
}

async function loadAstServer(overrides: Record<string, unknown> = {}) {
  const source = await read("gas-src/AstApplication.js");
  const sandbox = {
    console,
    isFinite,
    normalizePhoneNumber_: (value: string) => String(value || "").replace(/\D/g, ""),
    ...overrides,
  };
  vm.runInNewContext(source, sandbox, { filename: "AstApplication.js" });
  return { sandbox: sandbox as unknown as AstServerSandbox, source };
}

test("顧客ごとにアスト申込書の自動入力値を作り、推測対象は空欄にする", async () => {
  const { sandbox } = await loadAstClient();
  const fields = (values: Record<string, string>) => Object.entries(values).map(([name, value]) => ({ name, value }));
  const customerA = {
    rowKey: "row-a",
    name: "山田 太郎",
    kana: "ヤマダ タロウ",
    phone: "09012345678",
    address: "熊本県熊本市東区長嶺東1-2-3",
    birthDate: "昭和55年4月5日",
    age: "46",
    workplace: "株式会社テスト",
    workplaceKana: "カブシキガイシャテスト",
    workPostalCode: "8600001",
    workAddress: "熊本県熊本市中央区1-1",
    workPhone: "0961234567",
    yearsEmployed: "5年3ヶ月",
    annualIncome: "320万円",
    desiredCar: "テストカーA",
    desiredYear: "2022",
    applicationAmount: "1200000",
    assignee: "高山",
    applicationFields: fields({
      性別: "男",
      郵便番号: "8618038",
      お住まい: "賃貸マンション",
      "ご家族(配偶者)": "有",
      "配偶者以外の同居のご家族（子◯人・その他◯人）": "子2人・その他1人",
      "グレード(希望車種)": "G",
      "色(希望車種)": "黒",
      "走行距離(処分・廃車手配車両)": "98000",
      税込月収: "27万円",
      職業: "正社員",
      "保険証の種類": "社会保険",
    }),
  };
  const customerB = { ...customerA, rowKey: "row-b", name: "佐藤 花子", kana: "サトウ ハナコ", desiredCar: "テストカーB" };

  const seedA = sandbox.buildAstApplicationSeed(customerA);
  const seedB = sandbox.buildAstApplicationSeed(customerB);

  assert.equal(seedA.sourceRowKey, "row-a");
  assert.equal(seedA.applicantName, "山田 太郎");
  assert.equal(seedA.annualIncomeManYen, "320");
  ["applicationDate", "applicationRole", "vehicleName", "vehicleYear", "vehicleGrade", "vehicleColor", "salesStaff", "loanAmountManYen", "preferredContactDate", "existingLoanLenderCount"].forEach((key) => {
    assert.equal(key in seedA, false, `原本上段の${key}を自動入力対象にしない`);
  });
  assert.equal(seedB.sourceRowKey, "row-b");
  assert.equal(seedB.applicantName, "佐藤 花子");
  assert.notEqual(seedA.applicantName, seedB.applicantName, "顧客Aの氏名が顧客Bへ混入しない");
});

test("編集項目はreadonlyにせず、編集後の値をB5プレビューへ反映する", async () => {
  const { sandbox, html } = await loadAstClient();
  assert.doesNotMatch(html, /\sreadonly(?:\s|=|>)/i);
  assert.match(html, /顧客管理の内容に戻す/);
  assert.match(html, />プレビュー</);
  assert.match(html, />PDF作成</);

  const output = sandbox.buildAstPrintHtml({
    vehicleName: "上段印字禁止車両",
    sellerName: "上段印字禁止販売店",
    sellerAddress: "上段印字禁止住所",
    sellerPhone: "000-0000-0000",
    salesStaff: "上段印字禁止担当者",
    loanAmountManYen: "9876543",
    applicantName: "編集後のとても長い申込者氏名テスト",
    address: "熊本県熊本市東区とても長い住所一丁目二番三号テストマンション101号室",
    annualIncomeManYen: "320",
    inspectionStatus: "yes",
    tradeInStatus: "yes",
    purchaseMethod: "auction",
    applicationRole: "applicant",
    preferredContactPeriod: "PM",
    gender: "女",
    birthEra: "昭和",
    housingType: "賃貸マンション・アパート",
    spouseStatus: "有",
    occupationType: "正社員・公務員・役員",
    insuranceType: "社会保険、共済・組合保険",
  }, "data:image/jpeg;base64,fixture", false, []);

  assert.match(output, /@page \{ size: 515\.905pt 728\.504pt; margin: 0; \}/);
  assert.match(output, /編集後のとても長い申込者氏名テスト/);
  assert.match(output, /320/);
  assert.match(output, /株式会社エコループ/);
  assert.match(output, /熊本県熊本市東区長嶺東5丁目8-8/);
  assert.match(output, /096-201-7191/);
  assert.match(output, />高山<\/div>/);
  assert.doesNotMatch(output, /上段印字禁止車両|上段印字禁止販売店|上段印字禁止住所|000-0000-0000|上段印字禁止担当者|9876543/);
  assert.doesNotMatch(output, />✓</);
  assert.match(output, /ast-print-choice-circle/);
  assert.match(output, /border:\s*\.34mm solid/);
  assert.equal((output.match(/class="ast-print-choice-circle"/g) || []).length, 7, "氏名欄以降の選択グループと保険2件だけを丸で囲む");
  assert.match(html, /'男': \{ x: 197, y: 1042, width: 50, height: 52/);
  assert.match(html, /'自己所有': \{ x: 1200, y: 900, width: 110, height: 52/);
  assert.match(html, /'正社員・公務員・役員': \{ x: 1215, y: 1342, width: 265, height: 52/);
  assert.match(html, /'社会保険': \{ x: 1270, y: 1605, width: 150, height: 52/);
  assert.match(output, /data:image\/jpeg;base64,fixture/);
  assert.doesNotMatch(html, /車両・販売店情報|借入情報|既往借入・他社借入/);
  assert.doesNotMatch(html, /印字位置調整|微調整モード/);
  assert.match(html, /加入保険（複数選択可）/);
  assert.match(html, /type="checkbox"/);
});

test("未入力・電話・郵便番号・生年月日・金額を警告するがPDF作成を禁止しない", async () => {
  const { sandbox, html } = await loadAstClient();
  const warnings = sandbox.validateAstApplication({
    applicationDate: "",
    vehicleName: "",
    loanAmountManYen: "12万円x",
    applicantName: "",
    postalCode: "123",
    mobilePhone: "09012",
    birthEra: "平成",
    birthYear: "40",
    birthMonth: "13",
    birthDay: "40",
    annualIncomeManYen: "320万円x",
  });
  assert.ok(warnings.some((warning: string) => warning.includes("申込者氏名")));
  assert.ok(warnings.some((warning: string) => warning.includes("郵便番号")));
  assert.ok(warnings.some((warning: string) => warning.includes("携帯電話")));
  assert.ok(warnings.some((warning: string) => warning.includes("生年月日")));
  assert.ok(warnings.some((warning: string) => warning.includes("年収")));
  assert.ok(!warnings.some((warning: string) => /申込日|車種名|借入申込金額/.test(warning)));
  assert.match(html, /このままPDF作成へ進みますか/);
});

test("顧客情報保存は明示的なONが必須で、許可列だけを更新する", async () => {
  const writes: Array<{ row: number; column: number; value: unknown }> = [];
  const sheet = {
    getRange(row: number, column: number) {
      return {
        setNumberFormat() { return this; },
        setValue(value: unknown) { writes.push({ row, column, value }); return this; },
      };
    },
  };
  const lock = { tryLock: () => true, releaseLock() {} };
  const { sandbox, source } = await loadAstServer({
    LockService: { getScriptLock: () => lock },
    getMainSheet_: () => sheet,
    getHeaderMap_: () => ({ お名前: 1, 電話番号: 2, 審査申込金額: 3, '希望車種(希望車種)': 4, 対応状況: 5, アスト審査結果: 6 }),
    getManagementColumnMap_: () => ({ 担当者: 6 }),
    findCurrentRowNumber_: () => 7,
  });
  const form = { sourceRowKey: "row-a", applicantName: "編集後氏名", mobilePhone: "090-1234-5678", loanAmountManYen: "150", salesStaff: "高山", vehicleName: "保存禁止車両" };

  assert.throws(() => sandbox.saveAstApplicationCustomerFields({ rowKey: "row-a", saveToCustomer: false, form }));
  assert.equal(writes.length, 0, "保存OFFでは既存顧客情報を変更しない");

  sandbox.saveAstApplicationCustomerFields({ rowKey: "row-a", rowNumber: 7, saveToCustomer: true, form });
  assert.deepEqual(writes.map((item) => item.column).sort((a, b) => a - b), [1, 2]);
  assert.ok(!writes.some((item) => item.column >= 3), "上段項目、対応状況、アスト審査結果を変更しない");
  assert.doesNotMatch(source, /GmailApp|MailApp|UrlFetchApp.*FAX|sales_econtracts|署名証跡/);
});

test("アスト機械印字を正式運用で維持し、プレミア機械印字だけを全入口で停止する", async () => {
  const [index, webApp, template, policy, premiumPage, premiumAdjustPage, premiumPdfRoute, premiumConfigRoute, nextPolicy] = await Promise.all([
    read("gas-src/Index.html"),
    read("gas-src/WebApp.js"),
    read("gas-src/PremiumPrintTemplate.html"),
    read("docs/application-form-printing-policy.md"),
    read("app/loan/forms/premium/page.tsx"),
    read("app/loan/forms/premium/adjust/page.tsx"),
    read("app/api/loan-forms/[company]/pdf/route.ts"),
    read("app/api/loan-forms/[company]/config/route.ts"),
    read("lib/loan-forms/policy.ts"),
  ]);
  assert.match(index, /astMachinePrintingAllowed:\s*true/);
  assert.match(index, /premiumMachinePrintingAllowed:\s*false/);
  assert.match(index, /id="premiumPdfButton"[^>]*disabled/);
  assert.match(index, /if \(!APPLICATION_FORM_PRINT_POLICY\.premiumMachinePrintingAllowed\)/);
  assert.match(index, /id="astPdfButton" class="primary">アスト申込書を作成/);
  assert.match(index, /id="premiumRequestButton"/);
  assert.match(index, /id="premiumDenialEmailButton"/);
  assert.match(index, /function createPremiumApplicationPdf\(\)/);
  assert.match(index, /function buildPremiumPrintHtml\(/);
  assert.match(webApp, /premium:\s*false/);
  assert.match(webApp, /function getPremiumTemplateDataUrl\(\)[\s\S]*?if \(!APPLICATION_FORM_MACHINE_PRINT_POLICY\.premium\)/);
  assert.match(webApp, /ast:\s*true/);
  assert.match(webApp, /function getAstTemplateDataUrl\(\)[\s\S]*?if \(!APPLICATION_FORM_MACHINE_PRINT_POLICY\.ast\)/);
  assert.match(template, /^data:image\/jpeg;base64,/);
  assert.match(policy, /アスト申込書作成.*正式運用対象/);
  assert.match(policy, /プレミア申込書は手書き運用/);
  assert.match(policy, /プレミアの審査依頼、審査結果管理、否決メール/);
  assert.match(premiumPage, /手書き運用です/);
  assert.doesNotMatch(premiumPage, /印字位置調整を開く/);
  assert.match(premiumAdjustPage, /redirect\("\/loan\/forms\/premium"\)/);
  assert.match(nextPolicy, /premium:[\s\S]*?allowed:\s*false/);
  assert.match(premiumPdfRoute, /if \(!policy\.allowed\)[\s\S]*?status:\s*403/);
  assert.match(premiumConfigRoute, /if \(!getLoanFormMachinePrintingPolicy\(company\)\.allowed\)/);
});

test("公式原本とGAS背景テンプレートをリポジトリ内に保持する", async () => {
  const template = await read("gas-src/AstApplicationTemplate.html");
  assert.match(template, /^data:image\/jpeg;base64,/);
  assert.ok(template.length > 2_000_000, "スキャン原本の背景画像を保持する");
  const webApp = await read("gas-src/WebApp.js");
  assert.match(webApp, /function getAstTemplateDataUrl\(\)/);
});
