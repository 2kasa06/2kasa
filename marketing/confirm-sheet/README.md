# 確認・ご依頼事項シート（A4 1枚）

オーナー様との打ち合わせで渡す、記入式の確認シートです。
サイト制作を進めるうえで、オーナー様に決めていただく／ご用意いただく項目と、
制作側で対応する項目を1枚にまとめています。

## 成果物

| ファイル | 用途 |
| --- | --- |
| `確認ご依頼事項_BeautyProduce.pdf` | 印刷して手渡し・記入してもらう用（A4 / 1ページ） |
| `確認ご依頼事項_BeautyProduce.png` | 画面で共有する用（約300dpi） |

## 掲載項目

オーナー様（7件）

1. さくらインターネットのアカウントが残っているか
2. 残っていた場合のログイン情報のお渡し方法（**用紙には書かない**運用）
3. サンプル協力者様のビフォーアフター写真（掲載許諾つき）
4. サイト名をどうするか
5. ロゴが必要か
6. 診断アプリが本当に必要か
7. 診断アプリを元にした結果用紙が必要か

制作側（1件）

8. お客様の感想コメントをオーナー様が投稿・編集できるようにする
   - WordPress版は `bp_testimonial` カスタム投稿タイプで**対応済み**
   - React版（Netlify）は `src/components/CommonSections.tsx` に直書きのため未対応

## 作り直し方

```bash
python3 build.py    # body.html を先に作る
python3 fonts.py    # 使用文字だけ Google Fonts からサブセット取得 → fonts.css
python3 build.py    # fonts.css を取り込んで sheet.html を生成
node tools/flyercheck.mjs "$PWD/sheet.html"   # A4 1枚に収まるか検証（over が負なら OK）
node tools/topdf.mjs "$PWD/sheet.html" "$PWD/確認ご依頼事項_BeautyProduce.pdf"
node tools/flyerpng.mjs "$PWD/sheet.html" "$PWD/確認ご依頼事項_BeautyProduce.png"
```

`tools/*.mjs` は Playwright（Chromium）を使います。未インストールなら `npm i -D playwright` を先に。
項目の追加・文言の変更は `build.py` の `ITEMS`、体裁は `style.css` を触ってください。
