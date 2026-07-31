"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring print:hidden">
      <Printer className="h-4 w-4" />
      印刷する
    </button>
  );
}
