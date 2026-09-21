# ロゴのご提案（Total Beauty School Evea）

オーナー様がサイト名を「TotalBeautyschool Evea（トータルビューティースクール エヴァ）」に
決定され、ロゴをご希望とのことでご用意した提案書です。
「大文字でいくか、小文字でいくか」のお悩みにも答える形にしています。

## 成果物

| ファイル | 内容 |
| --- | --- |
| `Evea_ロゴ提案.pdf` | 提案書（A4 / 2ページ / ベクター） |
| `Evea_ロゴ提案_1.jpg` | 1ページ目・4案（約300dpi） |
| `Evea_ロゴ提案_2.jpg` | 2ページ目・大文字小文字の比較と使い方（約300dpi） |
| `marks/*.svg` | マーク単体のベクターデータ。文字を含まないので環境を選びません |

## 4案

| 案 | 構成 | 書体 |
| --- | --- | --- |
| A（おすすめ） | 四弁の花 ＋ セリフ | Cormorant Garamond Light |
| B | つぼみ ＋ 細字ローマン | Italiana |
| C | マークなし・イタリック | Cormorant Garamond Light Italic |
| D | アーチ（鏡）＋ 幾何学サンセリフ | Jost Light |

書体はすべて SIL Open Font License で、商用利用・ロゴ利用が許可されています。

## 大文字・小文字

`Evea`（頭だけ大文字）を推奨しています。すべて大文字は字面が四角くなって字間調整が要り、
すべて小文字は固有名詞として認識されにくいためです。

## 作り直し方

```bash
python3 build.py        # body.html を先に作る
python3 fonts.py        # 使用文字だけ Google Fonts からサブセット取得 → fonts.css
python3 build.py        # fonts.css を取り込んで logo.html を生成
python3 export_marks.py # マーク単体の SVG を marks/ に書き出す
node tools/pagecheck.mjs "$PWD/logo.html"   # 各ページがA4に収まるか（over が負なら OK）
node tools/topdf.mjs   "$PWD/logo.html" "$PWD/Evea_ロゴ提案.pdf"
node tools/pagejpg.mjs "$PWD/logo.html" "$PWD/Evea_ロゴ提案"
```

`tools/*.mjs` は Playwright（Chromium）を使います。未インストールなら `npm i -D playwright` を先に。
マークの形は `marks.py`（座標と線幅だけ）、組み方は `build.py`、体裁は `style.css` です。

## 案が決まったあと

ロゴ本体（マーク＋文字）は現状ウェブフォントで組んでいます。納品データにするときは
字間を手で詰めたうえで、文字をアウトライン化した SVG / PDF / PNG（背景透過）を
カラー・モノクロ・白抜きの3種類ぶん書き出します。
