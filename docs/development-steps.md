# 開発手順

## 1. ディレクトリ構成

主な構成は以下です。

- `app/`: Next.js App Router の画面
- `components/`: 物件カード、検索フォーム、管理フォームなどの UI
- `lib/`: 型、定数、Supabase 接続、データ取得関数
- `supabase/schema.sql`: テーブル、RLS、ポリシー
- `supabase/seed.sql`: サンプルデータ20件
- `docs/`: ローカル確認と公開手順

実行コマンド:

```bash
npm install
npm run dev
```

確認方法:

- `http://localhost:3000/`
- `http://localhost:3000/properties`
- `http://localhost:3000/admin/login`

## 2. Supabase SQL

変更ファイル:

- `supabase/schema.sql`

実行コマンド:

```bash
# Supabase SQL Editor で supabase/schema.sql を実行
```

確認方法:

- `properties`
- `property_sources`
- `property_images`
- `profiles`
- `admin_notes`

上記5テーブルが作成され、RLS が有効になっていることを確認します。

## 3. サンプルデータ

変更ファイル:

- `supabase/seed.sql`
- `lib/sample-data.ts`

実行コマンド:

```bash
# Supabase SQL Editor で supabase/seed.sql を実行
```

確認方法:

- `properties` に20件入る
- `status = 'published'` の物件だけが公開画面に表示される
- `sold` と `draft` は一般公開画面に表示されない

## 4. 一般公開画面

変更ファイル:

- `app/page.tsx`
- `app/properties/page.tsx`
- `app/properties/[id]/page.tsx`
- `components/PropertyCard.tsx`
- `components/SearchFilters.tsx`
- `lib/properties.ts`

実行コマンド:

```bash
npm run dev
```

確認方法:

- `/properties` でカード一覧が表示される
- 都道府県、価格上限、物件種別で絞り込みできる
- 0円物件、100万円以下、300万円以下のワンタップ絞り込みができる
- 詳細ページで元ページURLが表示される

## 5. 管理画面

変更ファイル:

- `app/admin/login/page.tsx`
- `app/admin/properties/page.tsx`
- `app/admin/properties/new/page.tsx`
- `app/admin/properties/[id]/edit/page.tsx`
- `app/admin/actions.ts`
- `components/AdminShell.tsx`
- `components/PropertyForm.tsx`
- `lib/admin.ts`

実行コマンド:

```bash
npm run dev
```

確認方法:

- `/admin/login` でログイン画面が表示される
- 管理者ログイン後、`/admin/properties` で物件一覧が表示される
- `/admin/properties/new` で新規登録できる
- `/admin/properties/{id}/edit` で編集、公開、非公開、成約済みの状態変更ができる

## 6. 管理者作成

Supabase Auth でユーザーを作成後、SQL Editor で以下を実行します。

```sql
insert into public.profiles (id, email, role)
values ('AUTH_USER_ID', 'admin@example.com', 'admin')
on conflict (id) do update set role = 'admin';
```

`AUTH_USER_ID` は Supabase Auth のユーザーIDに置き換えます。

## 7. ローカル環境変数

変更ファイル:

- `.env.example`

作成するファイル:

- `.env.local`

```bash
cp .env.example .env.local
```

`.env.local` に設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

環境変数が未設定の場合、公開画面は `lib/sample-data.ts` のサンプルデータで表示されます。管理画面の保存処理は Supabase 接続が必要です。

## 8. Vercel公開

実行コマンド:

```bash
npm run build
```

Vercelで設定する環境変数:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

公開手順:

1. GitHub にこのプロジェクトを push
2. Vercel で GitHub リポジトリを Import
3. Framework Preset は Next.js
4. Environment Variables に Supabase の値を設定
5. Deploy を実行

確認方法:

- Vercel URL の `/properties` で公開物件が表示される
- `/admin/login` から管理者ログインできる
