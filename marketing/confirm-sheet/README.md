# サイト公開までにやること（A4 1枚）

オーナー様にお渡しする、やることの一覧です。読んで「これをやればいいのか」が
すぐ分かることを優先して、記入欄や補足は最小限にしています。

## 成果物

| ファイル | 用途 |
| --- | --- |
| `サイト公開までにやること.pdf` | 印刷して手渡す用（A4 / 1ページ） |
| `サイト公開までにやること.png` | 画面で共有する用（約300dpi） |

## 掲載項目

オーナー様（5件）

1. さくらインターネットのアカウントが残っているか確認
2. 残っていた場合、ID・パスワードのご共有（紙には書かない運用）
3. サンプル協力者様のビフォーアフター写真
4. サイト名をどうするか
5. サイトにロゴが必要かどうか

制作側（2件）

6. お客様の感想コメントを、ご自身で投稿・編集できるように調整
   - WordPress版は `bp_testimonial` カスタム投稿タイプで実装済み
   - React版（Netlify）は `src/components/CommonSections.tsx` に直書きのため未対応
7. ボタンのイラスト8点をデザイン作成
   - サービス一覧のアイコン。現在は絵文字（`src/pages/Home.tsx` の `SERVICES`）

診断アプリと結果用紙は料金をいただかないため、この用紙には載せていません。

## 作り直し方

```bash
python3 build.py    # body.html を先に作る
python3 fonts.py    # 使用文字だけ Google Fonts からサブセット取得 → fonts.css
python3 build.py    # fonts.css を取り込んで sheet.html を生成
node tools/flyercheck.mjs "$PWD/sheet.html"   # A4 1枚に収まるか検証（over が負なら OK）
node tools/topdf.mjs "$PWD/sheet.html" "$PWD/サイト公開までにやること.pdf"
node tools/flyerpng.mjs "$PWD/sheet.html" "$PWD/サイト公開までにやること.png"
```

`tools/*.mjs` は Playwright（Chromium）を使います。未インストールなら `npm i -D playwright` を先に。
項目の追加・文言の変更は `build.py` の `OWNER` / `STUDIO`、体裁は `style.css` を触ってください。
