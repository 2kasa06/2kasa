# 美容プロデュースサービス公式サイト

「BEAUTY PRODUCE」の公式サイトを、**React版**と**WordPressテーマ版**の2通りで実装したリポジトリです。
どちらも同じデザインシステム（Soft Luminism）を共有し、見た目・構成・文章は揃えてあります。

| | React版 | WordPressテーマ版 |
|---|---|---|
| 場所 | リポジトリ直下（`src/`） | `beauty-produce-wordpress-theme/` |
| 技術 | Vite + React 18 + React Router + Tailwind CSS v4 | WordPress 6.4+ / PHP 8.0+（プラグイン不要） |
| 用途 | デザイン確認、静的ホスティング（Vercel / Netlify など） | クライアントが管理画面から更新する本番サイト |
| 文章の管理 | `src/data/content.js` を編集 | WordPress管理画面（カスタマイザー・カスタム投稿タイプ） |

## ページ構成

- **トップ** — ヒーロー / コンセプト / 8つのサービス / 年代から選ぶ / ご利用の流れ / ビフォーアフター / お客様の声 / FAQ / お問い合わせ / CTA
- **年代別ページ ×4** — 10代〜20代・30代・40代・50代〜60代
  ヒーロー / よくあるお悩み / おすすめメニュー / 活躍するシーン / 流れ / ビフォーアフター / お客様の声 / FAQ / 他の年代 / お問い合わせ / CTA

## React版の使い方

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に出力
npm run preview  # ビルド結果の確認
```

文章・料金・お客様の声などは、すべて `src/data/content.js` にまとまっています。ここを書き換えれば全ページに反映されます。

React Router を使っているため、静的ホスティングに載せる場合は
`/teens` `/thirties` `/forties` `/fifties` を `index.html` にフォールバックさせる設定（SPAリライト）を有効にしてください。

### ディレクトリ

```
src/
├── main.jsx                 エントリーポイント
├── App.jsx                  ルーティング
├── index.css                デザインシステム（Tailwind v4）
├── data/content.js          サイト全体の文章データ
├── hooks/useScrollAnimation.js  スクロール表示・ヘッダー・パララックス
├── components/
│   ├── Navigation.jsx       固定ヘッダーとモバイルメニュー
│   ├── Footer.jsx           フッター
│   ├── ScrollToTop.jsx      ページ遷移時のスクロール制御
│   └── CommonSections.jsx   流れ / ビフォーアフター / お客様の声 / FAQ / フォーム / CTA
└── pages/
    ├── Home.jsx             トップページ
    ├── AgePageTemplate.jsx  年代別ページの共通レイアウト
    └── {Teens,Thirties,Forties,Fifties}Page.jsx
```

## WordPressテーマ版の使い方

`beauty-produce-wordpress-theme/` をZIP圧縮して、**外観 → テーマ → 新しいテーマを追加 → テーマのアップロード** からインストールします。
有効化すると、トップページと4つの年代別ページ、サンプルのサービス・FAQ・お客様の声・ビフォーアフターが自動で作成されます。

詳しい編集方法は [`beauty-produce-wordpress-theme/README-ja.md`](beauty-produce-wordpress-theme/README-ja.md) を参照してください。

```bash
# ZIPを作る場合
cd beauty-produce-wordpress-theme
zip -r ../beauty-produce-wordpress-theme.zip . -x '*.DS_Store'
```

## デザインシステム

| トークン | 値 | 用途 |
|---|---|---|
| `--rose-beige` | `hsl(8, 40%, 65%)` | ブランドカラー。ボタン、見出しラベル、下線 |
| `--pale-pink` | `hsl(8, 50%, 92%)` | CTA背景、装飾シェイプ |
| `--ivory` | `hsl(42, 40%, 95%)` | セクション背景（交互に使用） |
| `--warm-white` | `hsl(40, 30%, 98%)` | ベース背景 |
| `--greige` | `hsl(38, 20%, 86%)` | 罫線、区切り |
| `--warm-brown` | `hsl(30, 25%, 22%)` | 本文の主要色 |
| `--gold-accent` | `hsl(45, 55%, 60%)` | 差し色 |

- 見出しは `Cormorant Garamond` + `Noto Serif JP`、本文は `Noto Sans JP`
- 色はすべて `hsl()` 指定（iOS Safari で `oklch` が正しく表示されない問題への対応）
- イージングは `cubic-bezier(0.23, 1, 0.32, 1)` に統一
- `prefers-reduced-motion: reduce` のときはアニメーションを停止

## イラストについて

`public/images/` と `beauty-produce-wordpress-theme/assets/images/` に、同じ内容のSVGイラストを同梱しています。
これらは構成確認用の仮素材です。本番では、実際のイラストや写真に差し替えてください。

- React版：`public/images/` のファイルを置き換える
- WordPress版：カスタマイザーの「メインイラスト」と、各年代ページの「アイキャッチ画像」を設定する

## 文章について

掲載している文章・料金・お客様の声・ビフォーアフターは、すべて構成確認のための仮の内容です。
公開前に実際の内容へ差し替えてください。お客様の声とビフォーアフターは、**掲載許可を得たもののみ**をご使用ください。
