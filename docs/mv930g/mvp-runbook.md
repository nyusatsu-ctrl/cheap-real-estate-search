# MV930G MVP実行手順

## DB適用

このリポジトリは現状 `supabase/*.sql` をSupabase SQL Editorで適用する運用になっているため、MV930G用DDLも同じ方式で適用する。

1. Supabase管理画面を開く
2. SQL Editorで `supabase/mv930g-schema.sql` を実行する
3. 管理者ユーザーの `profiles.role` が `admin` になっていることを確認する

`psql` と `supabase` CLI がローカルに無い環境でも、SQL Editorから適用できる。

## 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
MV930G_TCP_HOST=0.0.0.0
MV930G_TCP_PORT=9300
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

## モックデータ投入

管理者ログイン後に `/admin/gps/mock` を開き、「基本データ投入」を押す。

APIで投入する場合:

```bash
curl -X POST http://localhost:3000/api/admin/gps/mock/seed
```

raw受信データだけを追加投入する場合:

```bash
curl -X POST http://localhost:3000/api/admin/gps/mock/ingest
```

## TCP受信サーバー

Next.jsとは別プロセスで起動する。

```bash
npm run gps:tcp
```

テスト送信:

```bash
npm run gps:test-send
```

別のhexを送る場合:

```bash
node server/mv930g/send-test.mjs 7e00020000013912345678000200
```

## 遠隔制御

MVP初期状態では実機へコマンドを送信しない。画面上の「燃料カット ログのみ」「復旧 ログのみ」は確認ダイアログを表示し、`operation_logs` にキャンセル済みのテスト操作として保存する。

燃料カットは将来 `RELAY,2#` 相当の安全カットを基本にし、端末プロトコル資料でコマンド形式を確認するまで送信処理を有効化しない。
