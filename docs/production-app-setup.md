# 実運用セットアップ

## 必要な外部サービス

- Supabase
- Stripe
- Vercel

## 環境変数

`.env.local` と Vercel に以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-domain.example
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

## Supabase

1. `supabase/schema.sql` を Supabase SQL Editor で実行
2. `supabase/real-seed.sql` を必要に応じて実行
3. Auth の Email/Password を有効化
4. 管理者ユーザーを作成し、`profiles.role = 'admin'` にする

## Stripe

1. Stripe側で月額4,980円の recurring price を作成
2. その4,980円の Price ID を `STRIPE_PRICE_ID` に設定
3. Webhook Endpoint を作成
4. Endpoint URL は `/api/stripe/webhook`
5. Webhook secret を `STRIPE_WEBHOOK_SECRET` に設定

注意: アプリ上の料金表示とDB記録は月額4,980円に統一するが、実際の課金額は `STRIPE_PRICE_ID` が指すStripe側Priceで決まる。既存の2,980円Price IDを使い回すと、画面表示4,980円・実課金2,980円の不一致が起きる。

主に処理するイベント:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## アプリの主要画面

- `/signup`: 14日間無料トライアル登録
- `/login`: 会員ログイン
- `/dashboard`: 会員ダッシュボード
- `/billing`: 有料プラン申込用の Stripe Checkout
- `/tenders`: 官公庁案件一覧
- `/favorites`: お気に入り案件
- `/notifications`: 通知設定
- `/qualification`: 全省庁統一資格とは
- `/qualification/how-to-apply`: 全省庁統一資格の取得方法
- `/scrivener`: 提携行政書士への相談フォーム
- `/support-product`: 全省庁統一資格 申請準備サポート
- `/estimate`: お客様の見積もり依頼
- `/partners/register`: 業者登録申請
- `/partners/quotes/new`: 業者見積入力
- `/admin/tenders`: 運営者の案件管理
- `/admin/tender-sources`: 運営者の取得元サイト管理
- `/admin/scrivener-inquiries`: 運営者の行政書士相談管理
- `/admin/estimates`: 運営者の見積管理
- `/admin/properties`: 運営者の物件管理

## 現在の実装状態

- Supabase 接続時は会員登録、ログイン、案件、お気に入り、通知条件、行政書士相談、見積依頼、業者登録、業者見積をDB保存
- Stripe 環境変数設定時は有料プラン申込用の Checkout セッション作成
- Stripe Webhook で契約状態を `profiles` に反映
- Supabase/Stripe 未設定時はローカルプレビュー用のデモ表示

## 次に必要な実装

- Stripe Customer Portal による解約・カード変更
- 見積依頼を業者に割り当てる管理操作
- お客様が自分の見積結果だけ見られる画面
- 業者ログインと業者ごとの見積一覧
- 定期実行ジョブによる案件収集
- サイト別クローラー実装
- メール通知またはLINE通知
