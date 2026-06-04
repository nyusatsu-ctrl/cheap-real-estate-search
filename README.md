# 格安不動産サーチ MVP

0円から300万円以下の土地、古家付き土地、戸建て、倉庫、店舗などを検索できる会員制WebアプリのMVPです。

## 技術構成

- Next.js App Router
- TypeScript
- Supabase
- Tailwind CSS
- Vercel デプロイ対応

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase を使う場合は `.env.local` に以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase

1. `supabase/schema.sql` を SQL Editor で実行
2. `supabase/seed.sql` を SQL Editor で実行
3. Supabase Auth で管理者ユーザーを作成
4. `profiles` に `role = 'admin'` の行を追加

詳しい手順は `docs/development-steps.md` を参照してください。
実運用の Supabase / Stripe / Vercel 設定は `docs/production-app-setup.md` を参照してください。

## 画面

- `/`: トップページ
- `/signup`: 14日間無料トライアル登録
- `/login`: 会員ログイン
- `/dashboard`: 会員ダッシュボード
- `/billing`: Stripe 課金設定
- `/properties`: 物件一覧、検索、絞り込み
- `/properties/[id]`: 物件詳細
- `/admin/login`: 運営者ログイン
- `/admin/properties`: 運営者向け物件一覧
- `/admin/properties/new`: 物件登録
- `/admin/properties/[id]/edit`: 物件編集
- `/plans`: 14日間無料、月額2,980円の料金ページ
- `/estimate`: 名義変更、解体、リフォーム、土木工事の見積もり相談
- `/partners/register`: 提携業者登録
- `/partners/quotes/new`: 業者用の見積もり入力
- `/admin/estimates`: 運営者向けの見積もり依頼、業者、手数料管理
