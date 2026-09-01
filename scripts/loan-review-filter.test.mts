import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function extractFunction(source: string, name: string) {
  const marker = `      function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\n      function ", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test("進行中の仮審査だけを選べるクイック絞り込みを表示する", async () => {
  const html = await readFile(new URL("gas-src/Index.html", root), "utf8");
  assert.match(html, /value: 'activePreScreening', label: '進行中の仮審査'/);
  assert.match(html, /case 'activePreScreening':\s*return isActivePreScreeningApplication\(customer\);/);
});

test("お問い合わせ・対応不可・終了・否決を進行中の仮審査から除外する", async () => {
  const html = await readFile(new URL("gas-src/Index.html", root), "utf8");
  const source = [
    extractFunction(html, "isActivePreScreeningApplication"),
    extractFunction(html, "isWorkflowClosed"),
    extractFunction(html, "reviewIncludes"),
    extractFunction(html, "isAnyDenied"),
  ].join("\n");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "Index.html" });
  const isActive = (context as { isActivePreScreeningApplication(customer: unknown): boolean })
    .isActivePreScreeningApplication;

  assert.equal(isActive({ applicationType: "仮審査申込", status: "新規受付" }), true);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "プレミア可決" }), true);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "アスト契約待ち" }), true);
  assert.equal(isActive({ applicationType: "お問い合わせ", status: "新規受付" }), false);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "対応不可" }), false);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "相談のみで終了" }), false);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "納車完了" }), false);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "プレミア否決" }), false);
  assert.equal(isActive({ applicationType: "仮審査申込", status: "新規受付", review1: "否決" }), false);
});
