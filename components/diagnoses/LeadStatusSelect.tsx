"use client";

import { useRef } from "react";
import { updateDiagnosisLeadStatusAction } from "@/app/admin/diagnoses/actions";

type LeadStatusOption = {
  value: string;
  label: string;
};

export function LeadStatusSelect({
  diagnosisId,
  currentStatus,
  options
}: {
  diagnosisId: string;
  currentStatus: string;
  options: LeadStatusOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateDiagnosisLeadStatusAction}>
      <input type="hidden" name="id" value={diagnosisId} />
      <select
        name="lead_status"
        defaultValue={currentStatus}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-40 rounded border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-800 focus-ring"
        aria-label="対応ステータス"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
