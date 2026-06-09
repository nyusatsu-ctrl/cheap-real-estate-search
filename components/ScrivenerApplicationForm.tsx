"use client";

import { useState } from "react";
import { submitScrivenerInquiryAction } from "@/app/scrivener/actions";
import { PREFECTURES, QUALIFICATION_STATUS_LABELS } from "@/lib/constants";

export function ScrivenerApplicationForm() {
  const [businessType, setBusinessType] = useState<"sole_proprietor" | "corporation">("sole_proprietor");

  return (
    <form action={submitScrivenerInquiryAction} className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="request_type" value="全省庁統一資格の取得代行依頼" />
      <input type="hidden" name="business_type" value={businessType} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-slate-700">申請区分</p>
          <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBusinessType("sole_proprietor")}
              className={`rounded px-4 py-3 text-sm font-black focus-ring ${
                businessType === "sole_proprietor" ? "bg-brand-700 text-white" : "bg-white text-slate-700"
              }`}
            >
              個人事業主（個人）
            </button>
            <button
              type="button"
              onClick={() => setBusinessType("corporation")}
              className={`rounded px-4 py-3 text-sm font-black focus-ring ${
                businessType === "corporation" ? "bg-brand-700 text-white" : "bg-white text-slate-700"
              }`}
            >
              法人
            </button>
          </div>
        </div>
        <Field label={businessType === "corporation" ? "法人名" : "屋号または氏名"} name="company_name" required />
        <Field label="担当者名" name="contact_name" required />
        <Field label="メールアドレス" name="email" type="email" required />
        <Field label="電話番号" name="phone" type="tel" required />
        <Select label="所在地" name="prefecture" options={PREFECTURES.map((name) => [name, name])} />
        <Select label="現在の資格取得状況" name="qualification_status" options={Object.entries(QUALIFICATION_STATUS_LABELS)} />
        <Select
          label="希望する資格区分"
          name="desired_qualification_type"
          options={[
            ["goods_sales", "物品の販売"],
            ["services", "役務の提供等"],
            ["goods_manufacturing", "物品の製造"],
            ["goods_purchase", "物品の買受け"],
            ["unknown", "相談して決めたい"]
          ]}
        />
        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          競争参加を希望する地域
          <input name="desired_regions" placeholder="例: 関東、近畿、全国など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-950 md:col-span-2">
          <input name="newly_established" type="checkbox" className="mt-1" />
          開業または法人設立したばかりで、まだ決算・申告が終わっていない
        </label>

        {businessType === "sole_proprietor" ? <SoleProprietorFields /> : <CorporationFields />}

        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          相談・補足事項
          <textarea name="message" rows={5} placeholder="取得したい案件、急ぎの期限、不安な点など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="flex items-start gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 text-slate-700 md:col-span-2">
          <input name="consent_privacy" type="checkbox" required className="mt-1" />
          個人情報の取扱いに同意します。
        </label>
        <label className="flex items-start gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 text-slate-700 md:col-span-2">
          <input name="consent_share_to_scrivener" type="checkbox" required className="mt-1" />
          取得代行の見積・対応のため、入力情報と添付書類を提携行政書士へ共有することに同意します。
        </label>
      </div>
      <button className="mt-5 rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">取得代行を依頼する</button>
    </form>
  );
}

function SoleProprietorFields() {
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4 md:col-span-2">
      <h2 className="text-lg font-black text-slate-950">個人事業主（個人）の必要情報・添付書類</h2>
      <div className="mt-3 rounded border border-amber-200 bg-white p-3 text-sm leading-7 text-amber-950">
        開業したばかりで確定申告がまだ終わっていない場合、財務諸表・収支内訳書、納税証明書その2は提出できない場合があります。その場合は、開業届や申告に関する申出書などで代替できるかを行政書士が確認します。
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="氏名（申請者）" name="individual_name" />
        <Field label="生年月日" name="individual_birthdate" type="date" />
        <Field label="事業所住所" name="individual_business_address" className="md:col-span-2" />
        <FileField label="本人確認書類" name="individual_identity_file" />
        <FileField label="納税証明書その2（個人）※開業直後は不要/代替の場合あり" name="individual_tax_2_file" />
        <FileField label="納税証明書その3の2" name="individual_tax_3_2_file" />
        <FileField label="財務諸表または収支内訳書 ※申告前は不要/代替の場合あり" name="individual_financial_file" />
        <FileField label="開業届 ※開業直後は添付推奨" name="individual_opening_notice_file" />
      </div>
    </section>
  );
}

function CorporationFields() {
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4 md:col-span-2">
      <h2 className="text-lg font-black text-slate-950">法人の必要情報・添付書類</h2>
      <div className="mt-3 rounded border border-amber-200 bg-white p-3 text-sm leading-7 text-amber-950">
        設立したばかりで決算・法人税申告がまだ終わっていない場合、直近2期分の財務諸表、納税証明書その2は提出できない場合があります。その場合は、履歴事項全部証明書や申告に関する申出書などで代替できるかを行政書士が確認します。
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="法人番号" name="corporate_number" />
        <Field label="代表者名" name="representative_name" />
        <Field label="本店所在地" name="head_office_address" className="md:col-span-2" />
        <FileField label="履歴事項全部証明書" name="corporation_registry_file" />
        <FileField label="納税証明書その2（法人）※設立直後は不要/代替の場合あり" name="corporation_tax_2_file" />
        <FileField label="納税証明書その3の3" name="corporation_tax_3_3_file" />
        <FileField label="直近2期分の財務諸表 ※決算前は不要/代替の場合あり" name="corporation_financial_file" />
        <FileField label="委任状（必要な場合）" name="corporation_power_of_attorney_file" />
      </div>
    </section>
  );
}

function Field({ label, name, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; className?: string }) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props} />
    </label>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input name={name} type="file" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal focus-ring" />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
