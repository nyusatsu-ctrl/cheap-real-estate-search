export function EcontractDocument({ html }: { html: string }) {
  return (
    <div
      className="econtract-snapshot rounded-lg border border-slate-200 bg-white p-5 text-base leading-8 text-slate-800 shadow-sm sm:p-8 [&_dd]:m-0 [&_dd]:font-semibold [&_dl>div]:grid [&_dl>div]:gap-1 [&_dl>div]:border-b [&_dl>div]:border-slate-100 [&_dl>div]:py-2 sm:[&_dl>div]:grid-cols-[12rem_1fr] [&_dt]:font-bold [&_dt]:text-slate-600 [&_h1]:mb-2 [&_h1]:text-center [&_h1]:text-2xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:text-slate-950 sm:[&_h1]:text-3xl [&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-slate-950 [&_p]:whitespace-pre-wrap [&_p]:break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
