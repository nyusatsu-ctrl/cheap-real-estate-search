"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { loanFormFieldOrder, type LoanFormConfig, type LoanFormFieldKey } from "@/lib/loan-forms/types";

const sampleValues: Record<LoanFormFieldKey, string> = {
  addressPrefecture: "東京都",
  addressDetail: "新宿区西新宿1-1-1",
  addressKana: "トウキョウトシンジュククニシシンジュク",
  phone: "03-1234-5678",
  mobile: "090-1234-5678",
  email: "sample@example.com",
  birthDate: "平成3年1月1日",
  age: "35",
  workplace: "株式会社エコループ",
  workplaceKana: "カブシキガイシャエコループ",
  workAddressPrefecture: "東京都",
  workAddressCity: "渋谷区道玄坂",
  workAddressStreet: "1-2-3",
  workPhone: "03-5555-1111",
  businessContent: "運転手",
  yearsEmployed: "5年",
  payday: "25日",
  annualIncome: "420万円",
  companyName: "株式会社エコループ",
  companyRepresentative: "代表取締役　嶋本耕力",
  companyAddress: "熊本県熊本市東区長嶺東５丁目8-8",
  companyPhone: "096-201-7191",
  companyFax: "096-202-6933",
  salesStaff: "高山　康則"
};

export default function PremiumAdjustClient() {
  const [config, setConfig] = useState<LoanFormConfig | null>(null);
  const [selected, setSelected] = useState<LoanFormFieldKey>("addressPrefecture");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{
    key: LoanFormFieldKey;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/loan-forms/premium/config")
      .then((response) => response.json())
      .then((data) => setConfig(data))
      .catch(() => setMessage("座標設定を読み込めませんでした。"));
  }, []);

  const previewWidth = 620;
  const previewScale = useMemo(() => (config ? previewWidth / config.page.widthPx : 1), [config]);

  useEffect(() => {
    if (!dragging || !config) return;
    const activeDragging = dragging;

    function onMove(event: MouseEvent) {
      const dx = Math.round((event.clientX - activeDragging.startMouseX) / previewScale);
      const dy = Math.round((event.clientY - activeDragging.startMouseY) / previewScale);
      setFieldPosition(activeDragging.key, activeDragging.startX + dx, activeDragging.startY + dy);
    }

    function onUp() {
      setDragging(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, previewScale, config]);

  function updatePage(key: "offsetX" | "offsetY", value: string) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        page: {
          ...current.page,
          [key]: Number(value)
        }
      };
    });
  }

  function updateField(fieldKey: LoanFormFieldKey, key: "x" | "y" | "fontSize" | "maxWidth", value: string) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        fields: {
          ...current.fields,
          [fieldKey]: {
            ...current.fields[fieldKey],
            [key]: Number(value)
          }
        }
      };
    });
  }

  function setFieldPosition(fieldKey: LoanFormFieldKey, x: number, y: number) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        fields: {
          ...current.fields,
          [fieldKey]: {
            ...current.fields[fieldKey],
            x,
            y
          }
        }
      };
    });
  }

  function moveSelected(dx: number, dy: number) {
    if (!config) return;
    const field = config.fields[selected];
    setFieldPosition(selected, field.x + dx, field.y + dy);
  }

  function startDrag(key: LoanFormFieldKey, field: LoanFormConfig["fields"][LoanFormFieldKey], event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setSelected(key);
    setDragging({
      key,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: field.x,
      startY: field.y
    });
  }

  function handleFieldKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelected(-step, 0);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelected(step, 0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelected(0, -step);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelected(0, step);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/loan-forms/premium/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        throw new Error("保存できませんでした。");
      }
      setMessage("座標設定を保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function openTestPdf() {
    const response = await fetch("/api/loan-forms/premium/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleValues)
    });
    const blob = await response.blob();
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  }

  if (!config) {
    return <div className="mx-auto max-w-6xl px-4 py-6 text-sm font-bold text-slate-600">読み込み中...</div>;
  }

  const visibleFieldKeys = loanFormFieldOrder.filter((key) => config.fields[key]);
  const activeSelected = config.fields[selected] ? selected : visibleFieldKeys[0];
  const selectedField = config.fields[activeSelected];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">プレミア申込書</p>
          <h1 className="text-2xl font-black text-slate-950">印字位置調整</h1>
          <p className="mt-1 text-sm text-slate-600">ドラッグ、矢印キー、±1pxボタンで位置調整できます。座標は300dpi画像の左上基準です。</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openTestPdf} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
            テストPDF
          </button>
          <button type="button" onClick={saveConfig} disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {saving ? "保存中..." : "座標を保存"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-auto rounded-lg border border-slate-200 bg-white p-3">
          <div
            className="relative bg-white"
            style={{
              width: previewWidth,
              height: config.page.heightPx * previewScale
            }}
          >
            <img src={config.templateImage} alt="プレミア申込書テンプレート" className="absolute inset-0 h-full w-full select-none" />
            {visibleFieldKeys.map((key) => {
              const field = config.fields[key];
              const fontSize = field.fontSize || config.defaults.fontSize;
              const previewText = sampleValues[key];
              return (
	                <button
	                  type="button"
	                  key={key}
	                  onClick={() => setSelected(key)}
                    onMouseDown={(event) => startDrag(key, field, event)}
                    onKeyDown={handleFieldKeyDown}
	                  className={`absolute cursor-move border px-1 text-left font-bold shadow-sm ${selected === key ? "border-blue-700 bg-blue-100 text-blue-900" : "border-red-500 bg-white/80 text-red-700"}`}
	                  style={{
	                    left: (field.x + config.page.offsetX) * previewScale,
	                    top: (field.y + config.page.offsetY) * previewScale,
                      transform: "translateY(-100%)",
	                    fontSize: Math.max(3, fontSize * previewScale),
                      lineHeight: 1,
                      minWidth: Math.max(24, (field.maxWidth || 120) * previewScale),
                      minHeight: Math.max(10, fontSize * previewScale)
	                  }}
                    title={`${config.fields[key].label}: ドラッグまたは矢印キーで移動`}
	                >
	                  {previewText}
	                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">offsetX</span>
              <input type="number" value={config.page.offsetX} onChange={(event) => updatePage("offsetX", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">offsetY</span>
              <input type="number" value={config.page.offsetY} onChange={(event) => updatePage("offsetY", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
            </label>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">項目</span>
              <select value={activeSelected} onChange={(event) => setSelected(event.target.value as LoanFormFieldKey)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2">
                {visibleFieldKeys.map((key) => (
                  <option key={key} value={key}>{config.fields[key].label}</option>
                ))}
              </select>
            </label>

	            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-600">x</span>
                <input type="number" value={selectedField.x} onChange={(event) => updateField(activeSelected, "x", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">y</span>
                <input type="number" value={selectedField.y} onChange={(event) => updateField(activeSelected, "y", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">fontSize</span>
                <input type="number" value={selectedField.fontSize || config.defaults.fontSize} onChange={(event) => updateField(activeSelected, "fontSize", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">maxWidth</span>
                <input type="number" value={selectedField.maxWidth || 0} onChange={(event) => updateField(activeSelected, "maxWidth", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" />
              </label>
	            </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <span />
                <button type="button" onClick={() => moveSelected(0, -1)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold">↑ 1px</button>
                <span />
                <button type="button" onClick={() => moveSelected(-1, 0)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold">← 1px</button>
                <button type="button" onClick={() => moveSelected(0, 1)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold">↓ 1px</button>
                <button type="button" onClick={() => moveSelected(1, 0)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold">→ 1px</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                矢印キーは1px、Shift+矢印キーは10px移動します。調整後は「座標を保存」を押してください。
              </p>
	          </div>

          {message ? <p className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
        </aside>
      </div>
    </div>
  );
}
