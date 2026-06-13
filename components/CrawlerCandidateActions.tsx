"use client";

import {
  keepCrawlerCandidateDraftAction,
  publishCrawlerCandidateAction,
  rejectCrawlerCandidateAction
} from "@/app/admin/crawler-candidates/actions";

type Props = {
  id: string;
  title: string;
  sourceUrl: string;
  returnTo: string;
};

export function CrawlerCandidateActions({ id, title, sourceUrl, returnTo }: Props) {
  return (
    <div className="flex min-w-[15rem] flex-col gap-2">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-slate-300 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 focus-ring"
      >
        元サイトを開く
      </a>

      <form
        action={publishCrawlerCandidateAction}
        onSubmit={(event) => {
          if (!window.confirm(`この物件を公開しますか？\n\n${title}\n\n公開後は一般の物件一覧に表示されます。`)) {
            event.preventDefault();
          }
        }}
      >
        <HiddenFields id={id} returnTo={returnTo} />
        <button className="w-full rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white focus-ring">
          公開する
        </button>
      </form>

      <form action={keepCrawlerCandidateDraftAction}>
        <HiddenFields id={id} returnTo={returnTo} />
        <button className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
          非公開のまま
        </button>
      </form>

      <form
        action={rejectCrawlerCandidateAction}
        onSubmit={(event) => {
          if (!window.confirm(`この物件を却下しますか？\n\n${title}\n\n物件データは削除せず、公開対象外として残します。`)) {
            event.preventDefault();
          }
        }}
      >
        <HiddenFields id={id} returnTo={returnTo} />
        <button className="w-full rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 focus-ring">
          却下する
        </button>
      </form>
    </div>
  );
}

function HiddenFields({ id, returnTo }: { id: string; returnTo: string }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}
