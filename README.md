# Beauty Produce 公式サイト

美容プロデュースサービス「Beauty Produce」の公式サイトを、**React版**と**WordPressテーマ版**の2通りで実装したリポジトリです。
どちらも同じデザインシステム（Soft Luminism）・同じ構成・同じ文章で揃えてあります。

| | React版 | WordPressテーマ版 |
|---|---|---|
| 場所 | リポジトリ直下（`src/`） | `beauty-produce-wordpress-theme/` |
| 技術 | Vite + React 18 + TypeScript + wouter + framer-motion + lucide-react + Tailwind CSS v4 | WordPress 6.4+ / PHP 8.0+（プラグイン不要） |
| 用途 | デザイン確認、静的ホスティング（Vercel / Netlify など） | クライアントが管理画面から更新する本番サイト |
| 文章の管理 | 各コンポーネント内の定数 / `src/pages/*Page.tsx` の config | WordPress管理画面（カスタマイザー・カスタム投稿タイプ） |

---

## 同居しているもの: 防衛施設ウォッチ（`news/`）

このリポジトリには、上記の公式サイトとは独立した個人用ニュースサイトも入っています。
自衛隊基地・防衛施設の整備と、防衛に関わる建築土木だけを自動で集めて要約し、`docs/` に
静的サイトとして書き出します。更新は GitHub Actions が1日3回行います。

設定と使い方は [`news/README.md`](news/README.md)、社内向けに公開する手順は
[`server/README.md`](server/README.md) を参照してください。
公式サイト側のビルド（`npm run build`）とは経路が分かれており、互いに影響しません。

---

## 同居しているもの: 施工管理会社サイト（`construction/`）

建築の施工管理会社向けに作った、スクロール連動アニメーション中心のコーポレートサイトです。
ビルド不要・依存ライブラリなしの素の HTML / CSS / JS だけで動きます。

```bash
python3 -m http.server 8000   # → http://localhost:8000/construction/
```

内容はサンプルなので、公開前に会社名・連絡先・実績の差し替えが必要です。
詳細は [`construction/README.md`](construction/README.md) を参照してください。

---

## ページ構成

**トップ**
1. ヒーロー（パララックスするメインビジュアル／実績3項目）
2. ライフステージ選択（`#age-select`）— 4枚のカード
3. 提供サービス（`#services`）— 8種
4. ブランドメッセージ — 「美容サロンではなく、人生をアップデートするブランド」
5. 変化の物語（`#before-after`）— ドラッグで比較するスライダー
6. お客様の声（`#testimonials`）
7. サービスの流れ（`#flow`）— 5ステップのタイムライン
8. よくあるご質問（`#faq`）
9. ご予約・お問い合わせ（`#booking`）

**ライフステージ別ページ ×4**（10代〜20代・30代・40代・50代〜60代）
ヒーロー → こんなお悩みはありませんか？ → 提供サービス → シーン別スタイリング → 以降はトップと共通のセクション

## React版の使い方

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 型チェック + dist/ に出力
npm run typecheck  # 型チェックのみ
npm run preview    # ビルド結果の確認
```

`@/` は `src/` のエイリアスです（`vite.config.ts` と `tsconfig.json` の両方で設定）。

### ディレクトリ

```
src/
├── main.tsx                     エントリーポイント
├── App.tsx                      ルーティング（wouter）
├── index.css                    デザインシステム（Tailwind v4）
├── hooks/useScrollAnimation.ts  useScrollReveal / useStaggerReveal / useScrollPosition
├── components/
│   ├── Navigation.tsx           固定ヘッダーとフルスクリーンのモバイルメニュー
│   ├── Footer.tsx               フッター
│   ├── ScrollToTop.tsx          ページ遷移・ハッシュリンクのスクロール制御
│   └── CommonSections.tsx       変化の物語 / お客様の声 / サービスの流れ / FAQ / 予約フォーム
└── pages/
    ├── Home.tsx                 トップページ
    ├── AgePageTemplate.tsx      ライフステージ別ページの共通レイアウト
    └── {Teens,Thirties,Forties,Fifties}Page.tsx   各ステージの config
```

ルーティングは `wouter` の `BrowserRouter` 相当（履歴API）です。静的ホスティングに載せる場合は
`/teens` `/thirties` `/forties` `/fifties` を `index.html` にフォールバックさせる設定（SPAリライト）を有効にしてください。

## WordPressテーマ版の使い方

`beauty-produce-wordpress-theme/` をZIP圧縮して、**外観 → テーマ → 新しいテーマを追加 → テーマのアップロード** からインストールします。
有効化すると、トップページと4つのステージページ、サンプルのサービス・FAQ・お客様の声・ビフォーアフターが自動で作成されます。

詳しい編集方法は [`beauty-produce-wordpress-theme/README-ja.md`](beauty-produce-wordpress-theme/README-ja.md) を参照してください。

```bash
cd beauty-produce-wordpress-theme
zip -r ../beauty-produce-wordpress-theme.zip . -x '*.DS_Store'
```

## デザインシステム

| トークン | 値 | 用途 |
|---|---|---|
| `--rose-beige` | `hsl(8, 40%, 65%)` | ブランドカラー。ボタン、強調文字、下線 |
| `--pale-pink` | `hsl(8, 50%, 92%)` | 装飾シェイプ、背景のにじみ |
| `--ivory` | `hsl(42, 40%, 95%)` | セクション背景（`hsl(42,35%,96%)` と交互） |
| `--warm-white` | `hsl(40, 30%, 98%)` | ベース背景 |
| `--greige` | `hsl(38, 20%, 86%)` | 罫線、区切り |
| `--warm-brown` | `hsl(30, 25%, 22%)` | 本文の主要色 |
| `--gold-accent` | `hsl(45, 55%, 60%)` | 星の評価、差し色 |

- 見出しは `Cormorant Garamond` + `Noto Serif JP`（`font-weight: 300`）、本文は `Noto Sans JP`
- 色はすべて `hsl()` 指定（iOS Safari で `oklch` が正しく表示されない問題への対応）
- イージングは `cubic-bezier(0.23, 1, 0.32, 1)` に統一
- `prefers-reduced-motion: reduce` のときはアニメーションを停止

## 画像について

`public/images/` と `beauty-produce-wordpress-theme/assets/images/` に、同じ内容のイラストを webp で同梱しています
（元の PNG 約30MB を、幅を調整した webp 約1.1MB に変換したものです）。

| ファイル | 用途 |
|---|---|
| `hero-illustration.webp` | トップページのメインビジュアル |
| `age-teens.webp` / `age-30s.webp` / `age-40s.webp` / `age-50s.webp` | 各ステージのヒーローと選択カード |
| `logo-mark.webp` | ブランドマーク |

差し替える場合は、React版は `public/images/` のファイルを置き換え、WordPress版はカスタマイザーの
「メインイラスト」と各ステージページの「アイキャッチ画像」を設定してください。

## 未確定の項目

以下は元データが手元に無かったため再構成したものです。原本があれば差し替えてください。

- `src/components/Footer.tsx` と `src/hooks/useScrollAnimation.ts` — 元ファイルが無かったため、
  他コンポーネントからの使われ方に合わせて実装しています
- `src/pages/{Teens,Thirties,Forties,Fifties}Page.tsx` の `config` — お悩み・シーン・説明文は再構成した文章です
- 「変化の物語」の Before/After 画像は Unsplash の外部URLを参照しています。
  本番では自社で撮影した、掲載許可済みの画像に差し替えてください
- 電話番号・メールアドレス・Instagram・実績の数値は仮の値です
