"use client";

import Link from "next/link";
import { ExternalLink, Printer } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { isInAppPrintBrowser } from "@/lib/construction-diagnosis-v2/print-client";

const subscribeToBrowserIdentity = () => () => undefined;

export function DiagnosisPrintControls() {
  const [showFallback, setShowFallback] = useState(false);
  const [showSafariHelp, setShowSafariHelp] = useState(false);
  const isInAppBrowser = useSyncExternalStore(
    subscribeToBrowserIdentity,
    () => isInAppPrintBrowser(window.navigator.userAgent),
    () => false
  );

  function handlePrint() {
    setShowFallback(false);
    let printStarted = false;
    const markStarted = () => {
      printStarted = true;
      setShowFallback(false);
    };
    const media = window.matchMedia?.("print");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) markStarted();
    };
    window.addEventListener("beforeprint", markStarted, { once: true });
    media?.addEventListener?.("change", handleMediaChange);

    window.setTimeout(() => {
      media?.removeEventListener?.("change", handleMediaChange);
      if (!printStarted) setShowFallback(true);
    }, 3000);

    try {
      window.print();
    } catch {
      setShowFallback(true);
    }
  }

  return (
    <section className="diagnosis-print-controls mx-auto max-w-5xl px-4 pt-6 print:hidden">
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 text-sm font-black text-white focus-ring">
            <Printer className="h-4 w-4" />
            印刷・PDF保存
          </button>
          <Link href="/diagnosis/print/back" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 focus-ring">
            診断結果へ戻る
          </Link>
        </div>
        <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">
          {isInAppBrowser ? "LINEなどのアプリ内ブラウザでは、印刷できない場合があります。SafariまたはChromeで開いてください。" : "印刷できない場合は、SafariまたはChromeで開いてください。"}
        </p>

        {showFallback ? (
          <div role="alert" className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <h2 className="font-black">このブラウザでは印刷画面を開けませんでした</h2>
            <p className="mt-2 text-sm font-semibold leading-7">LINEなどのアプリ内ブラウザでは、印刷機能が動かない場合があります。右上または右下のメニューから「Safariで開く」を選び、もう一度「印刷・PDF保存」を押してください。</p>
            <button type="button" onClick={() => setShowSafariHelp((current) => !current)} className="mt-3 inline-flex items-center gap-2 rounded border border-amber-400 bg-white px-4 py-2 text-sm font-black focus-ring">
              <ExternalLink className="h-4 w-4" />
              Safariで開く方法を見る
            </button>
            {showSafariHelp ? <p className="mt-3 text-sm font-semibold leading-7">LINE画面の右上または右下にあるメニューを押し、「Safariで開く」または「デフォルトのブラウザで開く」を選んでください。</p> : null}
          </div>
        ) : null}

        <details className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-black text-slate-900">iPhoneでPDFとして保存する方法</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-700">
            <li>「印刷・PDF保存」を押します。</li>
            <li>印刷プレビューを2本指で広げます。</li>
            <li>共有ボタンを押します。</li>
            <li>「ファイルに保存」を選びます。</li>
          </ol>
        </details>
      </div>
    </section>
  );
}
