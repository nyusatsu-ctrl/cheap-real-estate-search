import { mkdir, readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const editorHtml = await readFile(new URL("gas-src/AstApplicationEditor.html", root), "utf8");
const templateDataUrl = await readFile(new URL("gas-src/AstApplicationTemplate.html", root), "utf8");
const script = editorHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];

if (!script) {
  throw new Error("AstApplicationEditor.html のスクリプトを読み込めません。");
}

const element = {
  addEventListener() {},
  classList: { add() {}, remove() {} },
  style: {},
};
const sandbox = {
  Date,
  Promise,
  setTimeout,
  document: { getElementById: () => element, body: { style: {} } },
  window: { confirm: () => true },
  state: { selected: null, saving: false },
  getApplicationFieldValue: () => "",
  formatPrintPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return value;
  },
  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
};

vm.runInNewContext(script, sandbox, { filename: "AstApplicationEditor.html" });

const dummy = {
  sourceRowKey: "dummy-customer-a",
  applicationDate: "2026-08-29",
  applicationRole: "applicant",
  vehicleName: "トヨタ アルファード ハイブリッド",
  vehicleYear: "2022",
  vehicleGrade: "Executive Lounge S",
  vehicleModelCode: "6AA-AYH30W",
  chassisNumber: "AYH30-0123456",
  vehicleColor: "ホワイトパールクリスタルシャイン",
  mileageThousandsKm: "42",
  inspectionStatus: "yes",
  inspectionYear: "2027",
  inspectionMonth: "11",
  tradeInStatus: "yes",
  tradeInPriceManYen: "35",
  salePriceManYen: "385",
  purchaseMethod: "auction",
  sellerName: "株式会社エコループ",
  sellerAddress: "熊本県熊本市東区長嶺東5丁目8-8",
  sellerPhone: "0962017191",
  salesStaff: "高山 康則",
  loanAmountManYen: "350",
  preferredContactDate: "2026-09-03",
  preferredContactPeriod: "PM",
  preferredContactTime: "14:30",
  applicantKana: "テストモウシコミシャ カクニンタロウ",
  applicantName: "確認用 とても長い申込者氏名テスト太郎",
  gender: "男",
  birthEra: "昭和",
  birthYear: "60",
  birthMonth: "12",
  birthDay: "24",
  age: "40",
  postalCode: "8618038",
  address: "熊本県熊本市東区長嶺東一丁目二番三号 とても長い建物名テストレジデンス101号室",
  housingType: "賃貸マンション・アパート",
  residenceYears: "6",
  residenceMonths: "8",
  spouseStatus: "有",
  childrenCount: "2",
  parentsSiblingsCount: "1",
  homePhone: "0961234567",
  mobilePhone: "09012345678",
  emergencyKana: "カクニン ハナコ",
  emergencyName: "確認 花子",
  emergencyRelationship: "配偶者",
  emergencyAddress: "熊本県熊本市中央区水前寺一丁目二番三号",
  emergencyPhone: "08098765432",
  workplaceKana: "カブシキガイシャトテモナガイカイシャメイテスト",
  workplaceName: "株式会社とても長い勤務先名称テスト九州営業本部",
  workPostalCode: "8600801",
  workAddress: "熊本県熊本市中央区安政町一丁目二番三号 業務センタービル十五階",
  workPhone: "0967654321",
  workExtension: "1234",
  businessContent: "自動車販売・整備および顧客サポート業務",
  occupationType: "正社員・公務員・役員",
  department: "九州営業本部 顧客支援部",
  position: "課長代理",
  annualIncomeManYen: "520",
  monthlyIncomeManYen: "36",
  employmentYears: "8",
  employmentMonths: "4",
  employeeCount: "128",
  capitalMillionYen: "50",
  insuranceType: "社会保険",
  existingLoanLenderCount: "1",
  existingLoanLenderAmountManYen: "30",
  existingLoanBankCount: "2",
  existingLoanBankAmountManYen: "180",
};

const completedHtml = sandbox.buildAstPrintHtml(dummy, templateDataUrl.trim(), false, []);
await mkdir(new URL("tmp/pdfs/", root), { recursive: true });
await writeFile(new URL("tmp/pdfs/ast-dummy-preview.html", root), completedHtml, "utf8");
const editorDemo = `<!doctype html>
  <html lang="ja">
    <head><meta charset="utf-8"><title>アスト申込書編集デモ</title></head>
    <body>
      <script>
        const state = { selected: null, saving: false };
        function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
        function getApplicationFieldValue() { return ''; }
        function formatPrintPhone(value) { return String(value || ''); }
        function showToast() {}
      </script>
      ${editorHtml}
      <script>
        astEditorState = { sourceRowKey: 'dummy-customer-a', sourceRowNumber: 2, customerName: '確認用ダミー顧客', initial: ${JSON.stringify(dummy)} };
        renderAstApplicationForm(astEditorState.initial);
        document.getElementById('astApplicationCustomerLabel').textContent = '確認用ダミー顧客 / 顧客管理の値を自動入力済み';
        document.getElementById('astApplicationModal').hidden = false;
      </script>
    </body>
  </html>`;
await writeFile(new URL("tmp/pdfs/ast-editor-demo.html", root), editorDemo, "utf8");
console.log("tmp/pdfs/ast-dummy-preview.html");
console.log("tmp/pdfs/ast-editor-demo.html");
