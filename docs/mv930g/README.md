# MV930G-G V2.0 JT/T 808-2013実装資料

MV930Gのプロトコル資料、マニュアル、実機またはベンダー提供のサンプルデータをこのディレクトリに保存する。

想定ファイル:

- `protocol.md`: TCP/UDPプロトコル仕様
- `manual.md`: 端末マニュアル
- `samples/`: 実機到着前後の受信サンプル

実装根拠はMiCODUS提供の正式JT/T 808資料と追加情報資料である。端末登録、認証、heartbeat、位置、logout、端末共通応答、上り透過伝送を受信対象とする。

- フレーム境界は`0x7E`、復元は`7D 01 -> 7D`と`7D 02 -> 7E`
- ヘッダーから本文末尾までをXOR検査する
- 6バイトBCDのprotocol terminal IDはIMEIと別物として扱う
- 端末時刻は資料どおりGMT+8からUTCへ正規化し、BCD raw時刻もDBへ保持する
- raw保存、検証、端末照合、派生位置保存、ACK生成の順序を守る
- 未登録・無効・未認証端末、チェックサム不正、DB失敗には成功ACKを返さない

端末から公開受信点まではTLS非対応の通常TCP、受信点からアプリまではHMAC付きHTTPSとする。公開受信点にはSupabaseのキーを置かない。

GPS migrationは`202607290034`、`202608060001`、`202608070001`の順で履歴管理する。
`supabase/migrations/202608070002_reserve_gps_ingest_nonce_rpc.sql`はnonceテーブルの直接権限を廃止し、
期限切れ削除・予約・重複判定をbooleanだけ返す`SECURITY DEFINER` RPCへ封じる追加migrationである。
実Supabaseへの適用は別の明示承認を得るまで行わない。

リレー、燃料・電源遮断、`0x8500`、APN、SERVER、再起動、初期化などの端末コマンドは実装・送信しない。
