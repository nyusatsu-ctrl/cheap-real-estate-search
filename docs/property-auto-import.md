# 物件情報の自動収集

## 方針

取り込みコマンドを実行した物件は、標準で `published` として登録します。
管理画面で1件ずつ公開に切り替える作業を減らすためです。

ただし、確認してから公開したい場合だけ `--draft` を付けると `draft` として登録できます。

## 対象

全国収集は、国土交通省が案内している全国版空き家・空き地バンクのうち、Node.jsから安定取得できるアットホーム版を主な対象にします。
補助的に、設定ファイルに登録した自治体・県単位の空き家バンクも対象にします。
対象は `data/property-import-sources.json` で管理します。

- 現在の情報元: アットホーム 空き家バンク、熊本県空き家バンク、留萌市空き家情報バンク
- 対象価格: 0円から3000万円以下
- 通常の登録状態: 公開中
- 確認用の登録状態: `--draft` を付けた場合だけ非公開
- 掲載許諾状態: 不明

## 実行コマンド

まずは登録せず、全国の登録済み情報元から取得できる物件だけ確認します。

```bash
npm run import:nationwide
```

アットホーム全国版だけ確認する場合:

```bash
npm run import:athome
```

問題なければSupabaseへ登録します。このコマンドでは最初から公開中になります。

```bash
npm run import:nationwide -- --commit
```

確認してから公開したい場合だけ、非公開で登録します。

```bash
npm run import:nationwide -- --commit --draft
```

熊本県だけ確認する場合:

```bash
npm run import:kumamoto
```

都道府県で絞る場合:

```bash
npm run import:properties -- --prefecture=北海道
```

登録済みの収集元を確認する場合:

```bash
npm run import:properties -- --list-sources
```

価格超過などのスキップ詳細まで見たい場合:

```bash
npm run import:nationwide -- --verbose
```

`permission denied for table property_sources` と表示された場合は、Supabase SQL Editorで次のファイルの内容を実行してください。

```bash
supabase/service-role-grants.sql
```

これは自動収集コマンドがSupabaseへ物件を登録できるようにするための権限設定です。

取得ページ数や上限件数を変える場合:

```bash
npm run import:nationwide -- --pages=5 --limit=100 --commit
```

## すでに非公開で入っている物件を公開する

過去に取り込んだ熊本県空き家バンクの非公開物件をまとめて公開する場合は、Supabase SQL Editorで次のファイルの内容を1回だけ実行してください。

```bash
supabase/publish-imported-properties.sql
```

## 確認方法

1. `/admin/properties` を開く
2. 取り込まれた物件が `公開中` で増えているか確認する
3. `/properties` を開く
4. 一般公開画面にも物件が表示されるか確認する
5. 成約済みや掲載不可の物件だけ管理画面で `非公開` または `成約済み` に変更する

## 注意点

このスクリプトは、取り込み時点で物件を一般公開します。掲載許諾を確認していない情報源で使う場合は、`--draft` を付けて非公開登録してください。

## 毎日決まった時間に自動更新する

GitHub Actionsで、毎日6:00（日本時間）に全国収集を自動実行します。
設定ファイルは `.github/workflows/import-properties-daily.yml` です。

自動実行するコマンド:

```bash
npm run import:nationwide -- --max-price=30000000 --commit
```

GitHubのリポジトリに次のSecretsを登録してください。

```bash
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

GitHub Actionsの `Daily property import` から `Run workflow` を押すと、毎日実行を待たずに手動でも確認できます。

アットホーム全国版は47都道府県の売買一覧ページを巡回します。現在は各都道府県の一覧1ページ目を最大100件ずつ取得します。

LIFULL HOME'S 空き家バンクも国土交通省が案内する全国版ですが、通常のNode.js取得ではAWS WAFのチャレンジページになるため、自動収集元としては無効化しています。

外部サイトごとに利用規約、転載可否、問い合わせ先が異なります。情報元ごとに掲載許諾状態を管理し、許諾が取れた情報から公開してください。

## 他サイトを増やす順番

1. 自治体の空き家バンク
2. 掲載許諾が取りやすい地域サイト
3. 業者や個人からの直接登録
4. 利用規約上問題ない外部データ連携

スクレイピング禁止、転載禁止、商用利用禁止のサイトは対象外にしてください。

新しい情報元を増やす場合は、まず `data/property-import-sources.json` に次の項目を追加します。

- `id`: コマンドで指定する短い名前
- `name`: 管理画面に表示する情報元名
- `websiteUrl`: 情報元サイト
- `listUrl`: 物件一覧ページ
- `prefecture`: 都道府県
- `cityFallback`: 市区町村を抽出できない場合の表示
- `detailUrlPattern`: 物件詳細URLのパスに一致する正規表現
- `pagination`: `{"type":"none"}` または `{"type":"path","pathTemplate":"page/{page}/"}`
