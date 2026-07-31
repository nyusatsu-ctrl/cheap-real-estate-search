import { CircleHelp } from "lucide-react";

export function QuestionHelp({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-3 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-black focus-ring">
        <CircleHelp className="h-4 w-4 shrink-0" />
        この質問の意味
      </summary>
      <p className="mt-2 leading-7">{children}</p>
    </details>
  );
}
