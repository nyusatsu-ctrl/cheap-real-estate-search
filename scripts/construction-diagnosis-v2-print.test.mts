import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createDiagnosisPrintToken,
  getDiagnosisPrintExpiry,
  hashDiagnosisPrintToken,
  isDiagnosisPrintToken,
  isDiagnosisPrintTokenExpired
} from "../lib/construction-diagnosis-v2/print-token.ts";
import { isInAppPrintBrowser } from "../lib/construction-diagnosis-v2/print-client.ts";

test("print tokens are opaque, unique, hashable, and expire after 30 days", () => {
  const first = createDiagnosisPrintToken();
  const second = createDiagnosisPrintToken();
  assert.equal(isDiagnosisPrintToken(first), true);
  assert.equal(isDiagnosisPrintToken(second), true);
  assert.notEqual(first, second);
  assert.match(hashDiagnosisPrintToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashDiagnosisPrintToken(first), first);
  assert.notEqual(hashDiagnosisPrintToken(first), hashDiagnosisPrintToken(second));
  assert.equal(isDiagnosisPrintToken(`${first.slice(0, -1)}!`), false);

  const base = new Date("2026-08-01T00:00:00.000Z");
  assert.equal(getDiagnosisPrintExpiry(base).toISOString(), "2026-08-31T00:00:00.000Z");
  assert.equal(isDiagnosisPrintTokenExpired("2026-07-31T23:59:59.000Z", base), true);
  assert.equal(isDiagnosisPrintTokenExpired("2026-08-01T00:00:01.000Z", base), false);
  assert.equal(isDiagnosisPrintTokenExpired(null, base), true);
});

test("LINE and other in-app browsers are detected without excluding Safari or Chrome", () => {
  assert.equal(isInAppPrintBrowser("Mozilla/5.0 iPhone Line/14.0.0"), true);
  assert.equal(isInAppPrintBrowser("Mozilla/5.0 iPhone Instagram 320.0"), true);
  assert.equal(isInAppPrintBrowser("Mozilla/5.0 iPhone Version/17.0 Mobile Safari/604.1"), false);
  assert.equal(isInAppPrintBrowser("Mozilla/5.0 Linux Android Chrome/126.0"), false);
});

test("result actions use one print destination and the print view has a visible fallback", async () => {
  const resultView = await readFile(new URL("../components/diagnoses/v2/DiagnosisV2ResultView.tsx", import.meta.url), "utf8");
  const controls = await readFile(new URL("../components/diagnoses/v2/DiagnosisPrintControls.tsx", import.meta.url), "utf8");
  const launchers = resultView.match(/<DiagnosisPrintLauncher/g) ?? [];
  assert.equal(launchers.length, 2);
  assert.match(controls, /window\.print\(\)/);
  assert.match(controls, /3000/);
  assert.match(controls, /このブラウザでは印刷画面を開けませんでした/);
  assert.match(controls, /iPhoneでPDFとして保存する方法/);
});

test("print CSS defines A4 pages, avoids content breaks, and hides controls", async () => {
  const css = await readFile(new URL("../app/diagnosis/diagnosis-print.css", import.meta.url), "utf8");
  assert.match(css, /size:\s*A4/);
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /page-break-inside:\s*avoid/);
  assert.match(css, /diagnosis-print-controls/);
  assert.match(css, /display:\s*none/);
});
