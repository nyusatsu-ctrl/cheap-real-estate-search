import clsx from "clsx";

export function GpsStatusBadge({ label, tone = "slate" }: { label: string; tone?: "green" | "red" | "yellow" | "slate" | "blue" }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded px-2 py-1 text-xs font-bold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "red" && "bg-rose-50 text-rose-700",
        tone === "yellow" && "bg-amber-50 text-amber-700",
        tone === "blue" && "bg-sky-50 text-sky-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {label}
    </span>
  );
}
