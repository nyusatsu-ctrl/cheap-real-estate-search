"use client";

export function GpsDeactivateButton({
  id,
  label,
  action
}: {
  id: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`${label}を無効化します。履歴データは削除されません。続行しますか？`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 focus-ring">
        {label}を無効化
      </button>
    </form>
  );
}
