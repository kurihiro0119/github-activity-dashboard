# GitHub Activity Dashboard

GitHub Organization のアクティビティを可視化するダッシュボードアプリケーションです。

## 機能

- Organization メトリクス表示（リポジトリ数、メンバー数、Commits、PRs など）
- 時系列メトリクスグラフ
- メンバーランキング（Commits、PRs、コード変更量、Deploys）
- リポジトリランキング
- 期間指定によるデータフィルタリング

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して VITE_ORG_NAME を設定してください

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## 環境変数

| 変数名          | 説明                   | 必須 |
| --------------- | ---------------------- | ---- |
| `VITE_ORG_NAME` | GitHub Organization 名 | 必須 |

`.env.example` をコピーして `.env` を作成し、Organization 名を設定してください。

## 使用方法

1. 環境変数 `VITE_ORG_NAME` に Organization 名を設定
2. アプリを起動すると、ダッシュボードにメトリクスとランキングが表示されます
3. 日付範囲とランキングタイプを変更してデータをフィルタリングできます

## API エンドポイント

このアプリケーションは [github-activity-metrics](https://github.com/kurihiro0119/github-activity-metrics) API を使用します。

アプリは以下の API エンドポイントを使用します（`vite.config.js` でプロキシ設定済み）:

**Organization エンドポイント:**

- `GET /api/v1/orgs/:org/metrics` - Organization メトリクス
- `GET /api/v1/orgs/:org/metrics/timeseries/detailed` - 時系列メトリクス（詳細：全メトリクス含む）
- `GET /api/v1/orgs/:org/rankings/members/:type` - メンバーランキング（期間指定可）
- `GET /api/v1/orgs/:org/rankings/repos/:type` - リポジトリランキング（期間指定可）

**Repository エンドポイント（リポジトリフィルター適用時）:**

- `GET /api/v1/orgs/:org/repos/:repo/metrics` - 特定リポジトリメトリクス
- `GET /api/v1/orgs/:org/repos/:repo/metrics/timeseries` - 特定リポジトリの時系列メトリクス
- `GET /api/v1/orgs/:org/repos/:repo/members/metrics` - 特定リポジトリの全メンバーメトリクス

デフォルトでは `http://localhost:8080` にプロキシされます。必要に応じて `vite.config.ts` を編集してください。

## 技術スタック

### フロントエンド

- **[React](https://react.dev/)** 18.2.0 - UI ライブラリ
- **[TypeScript](https://www.typescriptlang.org/)** 5.3.3 - 型安全性のための言語
- **[Vite](https://vitejs.dev/)** 5.0.8 - ビルドツール・開発サーバー
- **[Recharts](https://recharts.org/)** 2.10.3 - グラフ表示ライブラリ

### 開発ツール

- **@vitejs/plugin-react** - Vite の React プラグイン
- **@types/react** / **@types/react-dom** - TypeScript 型定義

### アーキテクチャ

- **SPA (Single Page Application)** - クライアントサイドレンダリング
- **環境変数ベース設定** - Vite の環境変数システムを使用
- **API プロキシ** - 開発時の CORS 回避のためのプロキシ設定

## 開発

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd github-activity-dashboard

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して VITE_ORG_NAME を設定

# 開発サーバーの起動
npm run dev
```

### ビルド

```bash
# 本番用ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

### プロジェクト構造

```
github-activity-dashboard/
├── src/
│   ├── api/           # API クライアント
│   ├── components/    # React コンポーネント
│   ├── types/         # TypeScript 型定義
│   ├── App.tsx        # メインアプリケーション
│   └── main.tsx       # エントリーポイント
├── public/            # 静的ファイル
├── vite.config.ts     # Vite 設定
├── tsconfig.json      # TypeScript 設定
└── package.json       # 依存関係
```

## 貢献

プルリクエストや Issue の報告を歓迎します。以下の手順で貢献できます:

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトは [Apache License 2.0](LICENSE) の下で公開されています。
