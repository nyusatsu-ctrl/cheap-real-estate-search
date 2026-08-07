# MV930G MVP実行手順

## DB適用

実Supabaseへ適用する正規ファイル:

- `supabase/migrations/202607290034_create_mv930g_gps_schema.sql`
- `supabase/migrations/202608060001_add_mv930g_jt808_ingest.sql`（JT/T 808受信とnonceテーブル）
- `supabase/migrations/202608070001_restrict_gps_ingest_nonce_privileges.sql`（nonce直接権限の暫定制限）
- `supabase/migrations/202608070002_reserve_gps_ingest_nonce_rpc.sql`（nonce RPC化、適用は別承認）

`supabase/mv930g-schema.sql` は初期設計資料であり、実Supabaseへ直接実行しない。

### 適用前チェック

1. Supabase Dashboardが `Healthy` であることを確認する。停止中なら先に再開し、DNS・HTTPS・REST接続を再確認する。
2. `supabase/verify-mv930g-gps-preflight.sql` を読み取り専用で実行する。
3. GPS 8テーブル・1ビュー・専用関数の名前が未使用であることを確認する。
4. 表示された `public_non_gps_schema_fingerprint` を保存する。
5. GPSのServer Components、Server Actions、API Routesが、管理者認証後にcookieを継承しないservice-role clientを使う状態へ変更済みか確認する。
6. `.env.local` がGit管理対象外、`GPS_DEMO_MODE=false`、`GPS_RELAY_CONTROL_ENABLED=false`であることを確認する。
7. `supabase migration list` と `supabase db push --dry-run` を確認する。

dry-runにGPS migration以外が表示された場合は停止する。`supabase/migrations/`には別プロジェクト向けの入札migrationもあるため、まとめて本番へ適用してはいけない。`--include-all`も使用しない。

SQL Editorでmigration本文だけを実行すると履歴管理を迂回するため使用しない。適用は別タスクで、承認済みのSupabase CLIまたはCIから行う。

### 適用後チェック

`supabase/verify-mv930g-gps-schema.sql` を読み取り専用で実行する。

- 9テーブル・1ビュー
- 主キー、外部キー、一意制約、CHECK制約、インデックス
- RLS有効・強制、ポリシー0件
- anon・authenticatedの権限なし
- service-roleの `SELECT`, `INSERT`, `UPDATE`
- `gps_ingest_nonces`の直接権限なし、`mv930g_reserve_ingest_nonce(text)`の`EXECUTE`だけ許可
- `gps_latest_positions` の `security_invoker`
- コマンドキューのPhase 1禁止制約
- 適用前後の `public_non_gps_schema_fingerprint` 一致

顧客、車両、IMEI、端末IDなどの行データは検証結果へ表示しない。

### RLSとservice-role

GPSテーブルはポリシーなしのdefault-denyとする。anon・authenticatedから直接アクセスさせず、既存の管理者認証を通したサーバー処理だけがservice-roleを使用する。

GPS管理画面、GPS API、GPS Server Actions、GPSデータ取得は次の順序を守る。

1. Cookie付き一般clientでログインユーザーを確認する。
2. 既存の`profiles.role=admin`判定を行う。
3. 管理者確認後だけ`lib/gps/server-admin-client.ts`のservice-role clientを生成する。
4. GPSテーブルの処理を行う。

専用clientは`server-only`で、セッション永続化、自動トークン更新、URLセッション検出をすべて無効にする。
GPS APIの変更系は同一Originと`application/json`を必須とし、未ログイン401、非管理者403、内部障害500をJSONで返す。
service-role keyはブラウザ、レスポンス、ログ、Gitへ出さない。

nonceはアプリからテーブルへ直接SELECT・INSERT・UPDATE・DELETEしない。
`public.mv930g_reserve_ingest_nonce(text)`だけを呼び、RPC内の同一transactionで期限切れ削除、予約、重複判定を行う。
RPCはboolean以外の行データを返さず、service-roleには関数の`EXECUTE`だけを付与する。

### ロールバック

本番バックアップがないため、自動DROPや破壊的ロールバックSQLは作成しない。

- 適用前はGPSオブジェクト不存在を確認する。
- transaction途中の失敗は全体をロールバックする。
- 適用後・データ投入前の個別削除も、影響確認と明示承認を得た別作業にする。
- データ投入後はDROPで戻さず、次のGPS専用migrationで修正する。
- GPS以外のテーブル、ビュー、RLS、grant、データへ触れない。

## 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
MV930G_TCP_HOST=0.0.0.0
MV930G_TCP_PORT=9300
MV930G_RECEIVER_ENABLED=false
MV930G_INGEST_URL=https://example.invalid/api/gps/ingest
MV930G_INGEST_HMAC_SECRET=
MV930G_SPOOL_DIRECTORY=/var/lib/mv930g/spool
GPS_DEMO_MODE=false
GPS_RELAY_CONTROL_ENABLED=false
```

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が未設定でも画面は落ちず、緯度経度テーブルとGoogle Mapsへの外部リンクを表示する。

## 管理画面

Next.jsを起動する。

```bash
npm run dev
```

GPS管理画面:

- `/admin/gps`
- `/admin/gps/customers`
- `/admin/gps/vehicles`
- `/admin/gps/devices`
- `/admin/gps/positions`
- `/admin/gps/raw-logs`
- `/admin/gps/operations`
- `/admin/gps/mock`

## デモデータ確認

`NODE_ENV=development`かつ`GPS_DEMO_MODE=true`のときだけ利用する。本番は404となり、デモ機能はservice-role clientを生成せず、実DBへ一切保存しない。

管理者ログイン後に `/admin/gps/mock` を開き、「基本データ表示」を押す。表示内容は実データではない。

APIで確認する場合は、ログイン済みブラウザの同一Originリクエストだけを使う。外部curlによるCookie転送例は安全上掲載しない。

`/api/admin/gps/mock/seed`はサンプル表示、`/api/admin/gps/mock/ingest`はサンプル解析だけを行い、DB書き込みはしない。

## TCP受信サーバー

Next.jsとは別プロセスで起動する。公開受信点にはSupabase URL、anon key、service-role keyを置かない。

```bash
npm run gps:tcp
```

TCP受信プロセスは権限制限スプールへ先に保存し、HMAC署名・時刻・nonce付きHTTPSでアプリへ転送する。アプリだけがservice-role clientを使い、raw-first保存、端末認証、位置保存、ACK生成を行う。

CLI起動には`MV930G_RECEIVER_ENABLED=true`の明示指定が必要で、既定bind先はloopbackである。公開bind、ファイアウォール、VPS構築は`docs/mv930g/public-tcp-runbook.md`をレビューし、別の承認を得てから行う。

テスト送信:

```bash
npm run gps:test-send
```

テスト送信はloopback限定の合成heartbeatだけで、任意hexや端末コマンドは受け付けない。

## 遠隔制御

リレーによる燃料・電源・エンジン遮断とGPS端末へのコマンド送信は無効とする。操作ボタン・送信API・コマンド許可リストは提供しない。

`GPS_RELAY_CONTROL_ENABLED` は未設定時も無効で、`true` が指定されてもPhase 1のコードはリレー操作を許可しない。

DB側でも `RELAY,1#`, `RELAY,2#`, `safe_cut`, `restore` をコマンドキューへ登録できない。キューはキャンセル済み監査行しか保持できず、送信ワーカーは存在しない。

実機への通信、1NCE SIMへのSMS、車両配線、実機通電は、別途明示承認と安全設計が完了するまで行わない。
