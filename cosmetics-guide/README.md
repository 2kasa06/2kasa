# サロン施術用化粧品のつくり方（資料）

サロンの施術で使う化粧品を用意するための手引き（A4横・6ページ）。

| ファイル | 内容 |
|---|---|
| `salon-cosmetics-guide.pdf` | 配布用のPDF |
| `salon-cosmetics-guide.html` | PDFの元データ。図・グラフはすべてインラインSVG |

## 構成

1. 表紙 — 要点3つと目次
2. 薬機法の線引き — サロンの中（使い切る）と外（販売・授与）
3. 3つのルートと選び方 — 判断フローチャート
4. 完成までの工程 — ルートAのステップ図、ルートBのガントチャート
5. メリット・デメリット — 3ルートの比較と4軸の相対評価
6. 費用の目安と着手前チェックリスト

## 作り直し方

日本語フォントは IPAPGothic、レンダリングは Chromium のヘッドレス印刷を使っています。

```bash
chromium --headless --disable-gpu --no-sandbox \
  --font-render-hinting=none --virtual-time-budget=8000 \
  --no-pdf-header-footer \
  --print-to-pdf=cosmetics-guide/salon-cosmetics-guide.pdf \
  cosmetics-guide/salon-cosmetics-guide.html
```

各ページは `297mm × 210mm` の固定高。SVGは `viewBox` の縦横比どおりの高さを指定しないと
上下に余白が生まれるため、高さを変える際は比率も合わせて調整してください。

## 注意

記載の金額・期間はすべて一般的な目安であり、実際の見積りではありません。
法令の解釈と運用は自治体および時期によって異なります。
