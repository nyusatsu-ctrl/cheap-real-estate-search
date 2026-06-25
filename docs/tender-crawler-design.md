# 官公庁案件クローラー設計

官公庁案件サーチは、格安不動産サーチ用Supabase、建設業売上アップ診断用Supabaseとは分けた専用Supabaseプロジェクトで運用する。
自動取得はGitHub Actionsの `Daily government tender crawler` で1日1回実行し、取得候補を `tender_candidates`、承認済み案件を `tenders` に保存する。

## 方針

- 案件の全文や仕様書PDFを無断転載しない。
- 保存するのはメタ情報、概要、元URL、PDFリンクを中心にする。
- 入札・見積参加前に、ユーザーが必ず公式ページを確認できる導線を置く。
- robots.txt、利用規約、アクセス制限に反する取得をしない。
- 巡回頻度は原則1日1回以上だが、サイト負荷を避ける。
- 取得できないサイトは管理画面で手動登録する。

## 追加手順

1. `tender_sources` に取得元サイトを登録する。
2. `source_type` ごとに `lib/tender-crawlers.ts` の `TenderCrawler` を実装する。
3. 取得結果は `TenderCrawlResult` のメタ情報に正規化する。
4. `source_url`、`pdf_url`、`title + agency_name + deadline_at` で重複候補を判定する。
5. 自動公開せず、必要に応じて管理画面で確認してから公開する。

## 新規Supabaseプロジェクトの初期化手順

1. Supabaseで官公庁案件サーチ専用プロジェクトを新規作成する。
2. SQL Editorで `supabase/migrations/202606250001_create_tender_search_schema.sql` を実行する。
3. Table Editorで以下の主要テーブルが作成されたことを確認する。
   - `tender_sources`
   - `tender_candidates`
   - `tenders`
   - `tender_crawl_logs`
   - `tender_attachments`
   - `tender_favorites`
   - `tender_source_errors`
4. Project SettingsのAPI画面で、官公庁案件サーチ専用のURL、publishable/anon key、secret/service role keyを確認する。
5. Vercel Production環境変数に以下を設定する。値は格安不動産サーチ用、診断用とは混ぜない。
   - `TENDER_SUPABASE_URL`
   - `TENDER_SUPABASE_ANON_KEY`
   - `TENDER_SUPABASE_SERVICE_ROLE_KEY`
6. GitHub Actions Secretsにも同じ3つを登録する。
7. Actionsの `Daily government tender crawler` を手動実行し、`tender_crawl_logs` に結果が保存されることを確認する。
8. 管理画面で候補を承認し、`/tenders` に承認済み案件が表示されることを確認する。

## 実装済み

- GitHub Actionsによる1日1回の定期実行
- 調達ポータルのメタ情報取得
- 防衛省・自衛隊系取得元の候補収集
- 管理画面での取得元管理、候補承認、手動登録
- クロールログ保存

## 未実装・今後の改善

- 類似度スコアによる重複候補管理
- メール配信ジョブ
- LINE通知連携
