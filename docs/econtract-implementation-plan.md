# 二段階電子契約 実装計画

## 目的と対象

株式会社エコループの自社ローン審査可決後フローに、車・バイク共通の二段階電子契約を追加する。

1. 第1段階: `自社ローン審査可決後 購入手続継続確認契約書`
2. 第2段階: `個別車両購入確認書`

既存の `sales_contracts.status` は販売・納車・返済管理で使用中のため変更しない。電子契約の進行状態は `sales_econtracts.status` に分離し、既存データと既存画面の互換性を維持する。

## 現状確認

- Git remote: `nyusatsu-ctrl/cheap-real-estate-search`
- default branch: `origin/main`
- 実装基点: 2026-08-28 時点の `origin/main` (`dfa7fcc`、PR #5 merge後)
- 作業 branch: `feature/econtract-purchase-flow`
- 既存管理画面: `/admin/sales-contracts`、`/admin/sales-contracts/[id]`
- 既存 DB baseline: `supabase/migrations/20260828080000_sales_contracts_baseline.sql`
- ローカル `.env.local` の汎用 Supabase URL が指す project ref: `<diagnosis-project-ref>`
- Vercel project: `cheap-real-estate-search`
- メール送信実装: Resend HTTP API を使う診断通知が既存。ただし診断専用環境変数と電子契約を分離する。

2026-08-28 の読み取り専用ライブ確認では、Supabase 組織内に次の2 project がある。

- `<production-project-ref>`: `cheap-real-estate-search` / `ACTIVE_HEALTHY`
- `<diagnosis-project-ref>`: `ecoloop-construction-diagnosis` / `INACTIVE`

初回確認では、ACTIVE_HEALTHY 側の public schema に対象の `sales_*` テーブルがなく、remote migration history は `202607280001` と `202607280002` の2件だった。その後、認証済みProduction runtimeの `/admin/system-check` で、汎用・sales接続先が `<production-project-ref>`、診断専用接続先が `<diagnosis-project-ref>` であることを確認した。

2026-08-28 の再確認時点では、本番に `20260828080000_sales_contracts_baseline` と `20260828083618_create_sales_econtracts` が適用済みで、電子契約4テーブルはいずれも0件だった。適用済み版では `service_role` に不要な `TRUNCATE`、`REFERENCES`、`TRIGGER` が残っていたため、既存migration履歴を書き換えずに `20260828140700_restrict_sales_econtract_service_role_privileges` を追加した。その後の本番適用承認時には同migrationがすでにremote historyへ記録されていたため重複実行せず、読み取り専用で4テーブルの権限が設計どおりに是正済みであることを確認した。機能有効化は引き続き別工程とする。

ACTIVE_HEALTHY 側の Security Advisor は、電子契約4テーブルについて「RLS有効・policyなし」を `INFO` で報告している。これはブラウザロールの表権限を剥がし、server-onlyの `service_role` だけを使う設計上の意図どおりである。電子契約以外には既存の `WARN` があり、Performance Advisor の電子契約関連指摘は利用開始前の未使用index `INFO` である。是正migration適用後の再実行でも、電子契約由来の `WARN` / `ERROR` は0件だった。

## 法令を踏まえた文言方針

- 消費者契約法第3条を踏まえ、重要事項を契約本文の前に平易に表示し、個別チェックを求める。
- キャンセル費用は一律・無条件の3万円とせず、同法第9条の「平均的な損害」を超えない範囲、実費、二重請求禁止、会社側事情等の除外を明記する。
- 電子署名法第2条・第3条を踏まえ、本人性と非改変性の証跡として氏名確認、メール OTP、本文 hash、同意 snapshot、時刻、IP、user agent、イベント履歴を保存する。
- この機能が特定認証業務の認定を受けた電子署名サービスであるとは表示しない。
- 文言は実装上のたたき台であり、公開前に日本法の資格を持つ専門家による最終確認を推奨する。

参照:

- [消費者契約法](https://laws.e-gov.go.jp/law/412AC0000000061)
- [電子署名及び認証業務に関する法律](https://laws.e-gov.go.jp/law/412AC0000000102)

## DB 設計

### `sales_econtracts`

既存ローン申込、顧客、販売契約への FK、ローン申込番号 snapshot、契約種別、revision、管理番号、独立 status、送信・開封・氏名確認・本人確認・署名日時、取消情報を保持する。作成時に以下を固定保存する。

- 契約本文 HTML / text snapshot
- 契約本文 SHA-256 hash
- 顧客 snapshot
- 車両・価格・支払条件 snapshot
- 重要事項 snapshot
- 署名時の全チェック結果
- OTP 方式と masked 宛先
- IP、user agent、合理的に取得できる端末情報
- 証跡全体の SHA-256 hash

### `sales_econtract_access_sessions`

氏名一致後の短時間セッションを管理する。cookie にはランダム値だけを保存し、DB には SHA-256 hash のみを保存する。再送世代に固定し、旧URLで作成したセッションを新URLへ引き継がない。

### `sales_econtract_verifications`

メール OTP の keyed hash、有効期限、試行回数、再送間隔、1時間の再送上限、本人確認日時を保存する。OTP 平文は保存・ログ出力しない。OTPは再送世代と氏名確認 access session の両方に FK 固定し、別ブラウザ・別セッションによる認証済み状態への便乗を防ぐ。

### `sales_econtract_events`

管理者送信、開封、氏名確認、OTP 送信・失敗・成功、署名、取消等を追記専用で保存する。

### RLS と不変性

- 全テーブルで RLS と FORCE RLS を有効化する。
- `anon` / `authenticated` の表アクセスを revoke し、ブラウザから Data API へ直接アクセスさせない。
- 管理者 session または token + access session + OTP を検証した Next.js server code だけが `service_role` で操作する。
- event は UPDATE / DELETE 禁止。
- 電子契約は DELETE 禁止。作成時点から本文・顧客・ローン申込・条件 snapshot を変更禁止、署名後は行全体を変更禁止とする。
- 本人確認済み OTP 証跡も変更・削除を禁止し、service role に不要な証跡 DELETE / UPDATE 権限を与えない。

## URL と認可

- 管理者: 既存 `requireAdmin()` で `profiles.role = 'admin'` を確認する。
- 顧客: 256-bit の専用 URL token を発行し、DB には SHA-256 hash のみ保存する。
- URL token だけでは全文表示・OTP・署名を行えない。まず申込者氏名を照合し、HttpOnly / Secure / SameSite=Strict の短時間 access session を作る。
- 署名には access session とメール OTP の両方を要求する。
- service role key は server-only client 以外から参照しない。

## メール adapter

追加費用の契約を行わず、既存と同じ Resend HTTP API に対応する adapter を実装する。電子契約専用の環境変数を使用する。

- `ECONTRACT_ENABLED`
- `ECONTRACT_BASE_URL`
- `ECONTRACT_RESEND_API_KEY`
- `ECONTRACT_EMAIL_FROM`
- `ECONTRACT_OTP_PEPPER`

`ECONTRACT_ENABLED` が文字列 `true` の場合に限り有効化を要求し、さらに `ECONTRACT_BASE_URL`、`ECONTRACT_RESEND_API_KEY`、`ECONTRACT_EMAIL_FROM`、`ECONTRACT_OTP_PEPPER` の4項目がすべて設定済みの場合だけ機能を有効にする。未設定、`false`、大文字表記、または4項目の不足時は fail closed とし、公開URLは404相当、管理画面は無効表示にする。既存の `NEXT_PUBLIC_APP_URL`、Vercel URL、`DIAGNOSIS_*`、`SUPABASE_SERVICE_ROLE_KEY` への fallback は行わず、URL、OTP、secret をログや画面へ露出しない。Preview は `ECONTRACT_ENABLED` を未設定のままとし、Production もDB migrationと運用準備が完了してから明示的に `true` を設定する。SMS は将来 adapter を追加できる境界を残し、今回勝手に有料契約しない。

## 画面

### 管理者

既存契約詳細に電子契約カードを追加する。

- 第1契約送信、再送、取消
- 送信済、開封済、氏名確認済、本人確認済、署名済の表示
- 第2契約条件入力・送信、再送、取消
- 契約本文・同意・本人確認・イベント証跡の閲覧
- 署名済契約の印刷 / PDF 保存

二重送信は同一種別の active 契約と一意制約で防止し、再発行時は旧契約を取消して revision を増やす。

### 顧客

スマートフォン優先で次の順に表示する。

1. 氏名確認
2. 重要事項
3. 契約全文
4. 個別チェック
5. メール OTP
6. 最終確認と署名
7. 締結時点の契約控え・証跡・印刷 / PDF 保存

## PDF / 契約控え

Vercel 上で安定した日本語 PDF を生成するには日本語フォントの同梱・保守が必要であり、既存の PDF 実装は macOS 固有フォントパスに依存している。今回の安全な完成範囲は、署名時点の immutable HTML / text snapshot、hash、証跡、専用印刷レイアウト、ブラウザの「PDFとして保存」とする。将来サーバー生成 PDF を追加する場合も同じ snapshot から生成し、署名済み DB 行は変更しない。

## migration と rollback

追加専用 migration とし、既存テーブル・status・データを変更しない。rollback が必要な場合は、まず送信停止、バックアップ、電子契約テーブルの件数・署名有無確認を行う。署名済み証跡がある状態でテーブルを drop してはならず、アプリから機能を無効化してデータを保持する。

## 本番反映ゲート

1. repo の project ref と対象 Supabase project ref が一致
2. `sales_customers`、`sales_contracts`、`sales_vehicles`、`sales_loans`、`sales_leases`、`sales_contact_histories`、`sales_audit_logs` の存在と主要列が一致
3. remote migration history とローカル migration の不整合がない
4. migration dry-run の新規候補が今回の migration だけ
5. RLS / grants / security advisor に重大指摘がない
6. 必須環境変数を Production に値非表示で確認（既存 Resend / Supabase secret の安全な fallback を含む）
7. typecheck、lint、unit tests、build が成功

このゲートを満たさない場合、本番 DB 適用と Production 公開は行わない。
