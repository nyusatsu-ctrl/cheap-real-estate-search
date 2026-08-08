# MV930G-G公開TCP受信点の安全な構築案

この文書は設定例であり、VPS作成、課金、公開、DNS変更、端末設定を実行するものではない。

## 通信境界

1. MV930G-G V2.0はTLS非対応のため、端末から受信点のTCP 9300へ通常TCPで接続する。
2. 受信点はフレームを所有者限定（ディレクトリ`0700`、ファイル`0600`）スプールへ保存する。
3. 受信点は時刻・nonceを含むHMAC-SHA256署名を付け、HTTPSの`/api/gps/ingest`へ転送する。
4. アプリはnonceを一度だけ受理し、raw-firstで保存後、登録済みかつ有効な端末を認証する。
5. 受信点はアプリが返したACKだけを端末へ返す。受信点自身は成功ACKを作らない。

受信点へ置く秘密は専用HMAC secretだけとし、Supabase URL・anon key・service-role keyは置かない。HMAC secretは32バイト以上のランダム値を、VPSとアプリへ別々の安全な秘密管理手段で設定する。

## 公開前ゲート

- GPSの2 migrationがレビュー済みかつ承認済みの方法で適用されている
- `GPS_RELAY_CONTROL_ENABLED=false`と空のコマンド許可リストを再確認している
- ingest URLが有効なHTTPSで、HTTPへのフォールバックがない
- TCP 9300だけを外部公開し、health portは`127.0.0.1`に限定する
- SSHは管理元IPなど別の安全な運用規則で制限する
- 1NCE送信元IP範囲は公式に確認できるまで固定値を設定例へ書かない
- 最大同時接続10、idle timeout 300秒、接続単位30フレーム/分、認証後の端末単位30フレーム/分を維持する
- 1NCE NATを考慮して送信元IP単位は300フレーム/分、4KiBフレーム、16KiB接続バッファを維持する
- スプールは64MiBまたは10,000ファイルでfail-closedとし、上限到達時はACKを返さない
- 標準ログへraw、位置、端末ID、IMEI、ICCID、secretを出さない

## 起動設定

`deploy/mv930g/mv930g.env.example`を秘密管理対象の実ファイルへ転記する。例のままでは受信サービスは無効でloopback bindとなる。公開bindへの変更と`MV930G_RECEIVER_ENABLED=true`は、公開承認後にVPS上だけで行う。

systemd例はDynamicUser、書込先限定、権限昇格禁止を使用する。Dockerの`EXPOSE 9300`はポート公開を実行しないため、実際のpublish規則は別途レビューする。

専用VPSではsystemd/journaldを使用し、serviceのログレートを30秒100件へ制限する。`deploy/mv930g/90-mv930g-journald.conf`を専用VPSの`/etc/systemd/journald.conf.d/`へ配置し、永続ログ64MiB、実行時ログ32MiB、保持7日を上限とする。raw payloadをファイルログへ複製しない。IPv6はreceiverとLightsail firewallの両方で公開しない。

Lightsail firewallはSSHを作業時点の管理元IPv4/32だけへ制限する。TCP 9300は、公開直前に1NCE公式Internet Breakout資料を再取得し、契約中SIMのbreakout modeがManual Asia-Pacific (Tokyo)であることを読み取り確認してから、その時点の公式送信元IPv4だけを個別/32で許可する。Automatic modeは全regionのIP許可が必要で、現在の公式IP件数はLightsail IPv4 firewallの60-rule上限を超えるため、この構成では公開しない。modeまたは公式範囲を取得・照合できなければ9300を公開しない。

## スプール障害

HTTPS失敗時はACKを返さずTCP接続を閉じ、スプールファイルを残す。現段階では自動再送workerを実装していない。残存ファイルは内容を標準出力へ出さず、原因解消後に専用の再送設計をレビューする。今回の実装では受信成功後だけ当該ファイルを削除する。

## 実機前の順序

1. migration適用を別タスクで承認・実施し、スキーマを読み取り検証する。
2. loopbackの合成フレームでTCP分割・連結、HMAC、raw-first、ACKを検証する。
3. 公開受信点を構築し、端末を接続しない状態でhealthとHTTPS転送だけを検証する。
4. 管理者画面で受信端末IDを既存GPS端末へ明示的に紐付ける手順を確認する。
5. APNは変更せず、SERVER設定は別の送信前承認後に限る。

リレー、燃料・電源制御、`0x8500`、SMS、APN、SERVER、再起動、初期化コマンドはこの構成に含めない。
