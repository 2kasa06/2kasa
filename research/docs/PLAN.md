# 投資リサーチ・ダッシュボード 設計メモ

「銘柄コードを入れたら、その銘柄の状態・材料・テクニカル条件・業績・市場環境を一気に確認できる」
サイトの設計と実装順序。投資判断は断定せず、事実・条件・過去データとの比較として示す。

---

## 1. 現在の構成（着手時点の分析）

リポジトリ `2kasa06/2kasa` には独立した4つのものが同居している。

| 場所 | 中身 | 技術 |
|---|---|---|
| `/`（`src/`） | 美容サロンの公式サイト | Vite + React 18 + Tailwind v4 |
| `beauty-produce-wordpress-theme/` | 同サイトのWPテーマ | PHP |
| `news/` → `docs/` | 防衛施設ニュースの自動収集 | Node スクリプト + GitHub Actions |
| `invest/` → `docs/invest/` | 市況とニュースの静的まとめ（前回作成） | Node スクリプト + GitHub Actions |

- DB・認証・API サーバは無い。どれも静的生成。
- 環境変数は `ANTHROPIC_API_KEY`（要約用、Actions の Secrets）のみ。
- `invest/` は「毎日の市況とニュースを読む」静的ページで、銘柄を深掘りする機能は無い。

→ 本件は性質が違う（動的・DB・API・インタラクティブチャート）ので、既存を壊さないよう
**`research/` に独立した Next.js アプリとして新設**する。ルートの `package.json` や
既存ワークフローには手を入れない。

## 2. 不足している機能

指示書の全機能が新規。既存から流用できるのは「RSSの読み方」「Claude要約の型」
（`news/lib`, `invest/lib`）の知見程度で、コードの直接共有はしない（ESM の素の JS と
TypeScript/Next のビルド境界をまたぐと保守しにくいため）。

## 3. 必要なパッケージ

| 用途 | パッケージ |
|---|---|
| フレームワーク | next 16, react 19, typescript |
| スタイル | tailwindcss v4, class-variance-authority, clsx, tailwind-merge, lucide-react（shadcn/ui 方式のコンポーネントを `components/ui` に置く） |
| チャート | lightweight-charts v5（TradingView 製・Apache-2.0） |
| DB | prisma 7 / @prisma/client / @prisma/adapter-pg / pg |
| 検証 | zod（API 入力） |
| テスト | vitest |
| 後続フェーズ | @anthropic-ai/sdk（AI要約）、ioredis（キャッシュ）、next-auth / Auth.js（ウォッチリスト認証） |

テクニカル指標は TA-Lib を使わず TypeScript で自前計算（`src/lib/technical`）。
依存が無く、サーバとテストで同じコードが動く。

## 4. DB 設計（`prisma/schema.prisma`）

指示書 51 の18テーブルをすべて定義済み。主なもの:

- `Stock`（code, name, nameEn, ticker, market, sector, industry）
- `StockPrice`（stockId+date+interval で一意。OHLCV）
- `TechnicalIndicator`（stockId, date, name, params(JSON), value）
- `TechnicalSignal`（stockId, type, date, direction, strength, values(JSON), active）
- `Financial`（stockId, fiscalYear, period(FY/Q1..Q4), 各勘定）
- `Earning`（決算発表: 実績・会社予想・市場予想・発表日）
- `IrDocument`（種別, タイトル, 発表日時, 重要度, 分類根拠, 要約, sourceUrl 必須）
- `News` + `NewsStockRelation`（groupKey で同一ニュースを束ねる）
- `Watchlist` / `WatchlistStock` / `User`
- `MarketIndex`, `MacroData`, `Event`, `Notification`, `AiAnalysis`（入力の出典を JSON で保持）, `BacktestResult`

すべての「データ行」に `source`（提供元）と `fetchedAt` を持たせ、出所と時点を必ず表示できるようにする。

## 5. API 設計

データ取得層は UI から分離する（`src/lib/providers`）。

```
MarketDataProvider   getQuote / getHistory(range) / getIndices / searchStocks
NewsProvider         getStockNews / getMarketNews
IRProvider           getDocuments
FinancialDataProvider getFinancials / getEarnings / getPeers
MacroDataProvider    getIndicators / getEvents
```

`DATA_SOURCE=mock`（既定）でモック実装、実APIは `MARKET_DATA_API_KEY` などを設定した
実装クラスを差し込む。戻り値は必ず `DataResult<T>`（ok / empty / error ＋ source ＋ asOf）。
失敗を 0 や null の正常値として流さない。

HTTP API（Route Handlers）:

| メソッド・パス | 内容 |
|---|---|
| GET `/api/stocks/search?q=` | 銘柄検索（コード・名称・英名・ティッカー） |
| GET `/api/stocks/:code` | 銘柄の概要とステータスサマリー |
| GET `/api/stocks/:code/prices?range=1d..max` | OHLCV＋指標系列＋シグナルマーカー |
| GET `/api/stocks/:code/signals` | 現在のシグナル・履歴・過去検証 |
| GET `/api/market/summary` | 市場サマリー |

共通: zod で入力検証、IP 単位のレート制限、内部エラーはログにだけ出してユーザーには汎用メッセージ。

## 6. 画面構成

- **トップ `/`**: 市場サマリー（13指標のカード）→ 今日の市場環境（事実とAI要約を分けて表示）→ 主な銘柄と検出シグナル
- **ヘッダー**: 銘柄検索（候補ドロップダウン）、テーマ切替
- **銘柄 `/stocks/:code`**（指示書 40 の順）:
  1. 基本情報・株価（時価総額・PER・PBR・配当利回り・EPS）
  2. **現在の状況サマリー**（テクニカル／IR／ニュース／決算の要点）← 最上部
  3. チャート（期間切替、ローソク足＋SMA/EMA/BB/一目/VWAP、出来高・RSI・MACD ペイン、シグナルマーカー）
  4. テクニカルシグナル（現在の条件、複数同時発生、過去検証、履歴）
  5. IR（重要度と分類根拠、3行要約、原文リンク）
  6. ニュース（同一ニュースの束ね、関連報道件数、AI分類の明示）
  7. 決算（前年同期・前四半期・会社予想・市場予想との比較）
  8. 財務（損益・成長率・財務・還元、推移グラフ）
  9〜13. バリュエーション、業界比較、マクロ、イベント、AIリサーチ（後続フェーズ）
- スマホでは チャート → シグナル → ニュース → IR → 決算 の順に並べ替える。

## 7. 実装順序

| フェーズ | 内容 | 状態 |
|---|---|---|
| 1 | Next.js 構築、DB スキーマとシード、トップ、検索、銘柄ページ、チャート、モック | **完了** |
| 2 | テクニカル指標、シグナル検出、表示、履歴（＋簡易バックテスト） | **完了** |
| 3 | IR、ニュース、財務、決算（モックで一通り） | **完了** |
| 4 | 市場情勢、マクロ、業界分析、イベントカレンダー | 未着手 |
| 5 | AI 分析・要約・ニュース分析（出典付き） | 未着手 |
| 6 | ウォッチリスト（DB・認証）、通知、スクリーナー | 未着手 |
| 7 | バックテスト拡充、性能、SEO 仕上げ、セキュリティ、本番対応 | 一部（SEO タイトル、レート制限） |

指示書 59 の完成条件（1銘柄で株価・ローソク足・SMA・EMA・RSI・MACD・BB・出来高・シグナル・
IR・ニュース・財務・決算が動く）は、モックデータで 7203 を含む全モック銘柄について満たす。
