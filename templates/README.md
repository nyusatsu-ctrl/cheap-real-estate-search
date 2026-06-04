ローン申込書テンプレート座標設定です。

- `premium.json`: プレミア申込書用です。
- 将来 `ast.json` と `public/templates/ast_template.png` を追加すれば同じPDF生成処理を使えます。

座標は300dpi画像の左上を原点にしたピクセル指定です。

- `page.offsetX`: 全項目の横方向微調整。正の値で右、負の値で左。
- `page.offsetY`: 全項目の縦方向微調整。正の値で下、負の値で上。
- 各フィールドの `x`, `y`, `fontSize` は調整画面から変更できます。
