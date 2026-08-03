export default function PropertiesLoading() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true" aria-live="polite">
      <span className="sr-only">物件情報を読み込み中です</span>
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-4 sm:py-8">
        <div className="h-28 rounded-lg bg-slate-200 sm:h-40" />
        <div className="mt-5 h-44 rounded-lg bg-white ring-1 ring-slate-200" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-52 rounded-lg bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
