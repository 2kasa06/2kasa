# A4 チラシ（Beauty Produce）

公式サイト（`src/pages/Home.tsx` / `src/components/CommonSections.tsx`）の内容をそのまま
使って組んだ、A4 片面 1 枚のチラシです。

## 成果物

| ファイル | 用途 |
| --- | --- |
| `チラシ_BeautyProduce_A4.pdf` | 入稿・印刷用（A4 / 210×297mm / 1ページ / 塗り足しなし） |
| `チラシ_BeautyProduce_A4.png` | SNS・LINE 共有用（約 300dpi） |

## 掲載内容と出典

| チラシの面 | サイト側の出典 |
| --- | --- |
| キャッチコピー・リード文 | `Home.tsx` ヒーロー |
| ブランドメッセージ | `Home.tsx` `BrandMessageSection` |
| ライフステージ 4区分 | `Home.tsx` `AGE_CARDS`（見出しはサイトの「あなたのステージを選んでください」＝クリック前提の文言のため、紙面用に「ライフステージ別プロデュース」へ変更） |
| 提供サービス 8項目 | `Home.tsx` `SERVICES` |
| ご利用の流れ 5ステップ | `CommonSections.tsx` `flowSteps`（紙面用に説明文を短縮） |
| お客様の声 2件 | `CommonSections.tsx` `testimonials` |
| 料金（トータルプロデュース ¥33,000） | 別途指定。サイト側 FAQ の「¥50,000〜」とは不一致 |

サイトのヒーローにある実績数値（1,200+ / 98% / 10年+）は**意図的に載せていません**。
根拠資料のない数値を印刷物に載せると景品表示法（優良誤認）に触れるおそれがあるためです。
実績が確定したら `content.py` に追記してください。

連絡先（TEL / MAIL / INSTA / WEB）は仮の値です。`content.py` の `CONTACT_*` を差し替えてください。

## 作り直し方

`tools/*.mjs` は Playwright（Chromium）を使います。未インストールなら `npm i -D playwright` を先に。

```bash
node tools/resize.mjs img     # public/images/*.webp を印刷解像度の JPEG に変換
python3 fonts.py              # 使用文字だけ Google Fonts からサブセット取得 → fonts.css
python3 build.py              # content.py + style.css → flyer.html
node tools/flyercheck.mjs "$PWD/flyer.html"                       # A4 1枚に収まるか検証（over が負なら OK）
node tools/topdf.mjs "$PWD/flyer.html" "$PWD/チラシ_BeautyProduce_A4.pdf"
node tools/flyerpng.mjs "$PWD/flyer.html" "$PWD/チラシ_BeautyProduce_A4.png"
```

文言・価格・連絡先の変更は `content.py`、体裁の変更は `style.css` だけを触れば済みます。
フォント（Zen Maru Gothic / Cormorant Garamond）は使用文字のみ base64 で PDF に埋め込むため、
印刷所側にフォント環境は不要です。
