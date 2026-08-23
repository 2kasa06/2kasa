# タコスシリーズ LINEスタンプ 分割素材

`ChatGPT Image ...png`（4×4 の1枚絵）を 1 スタンプずつ 16 分割したもの。

- `タコスシリーズ/1` 〜 `3` … 元々手作業で分割済みだったもの（規定サイズに調整済み）
- `タコスシリーズ/4` 〜 `11筋トレ` … `scripts/split_line_stamps.py` で分割

## LINE Creators Market の規定

| 画像 | サイズ |
| --- | --- |
| スタンプ画像 | 横 80〜370px / 縦 80〜320px |
| main.png | 240 × 240px |
| tab.png | 96 × 74px |

いずれも縦横とも**偶数ピクセル**の透過 PNG。全ファイルこの規定を満たしている。

## スクリプト

```sh
# 1枚絵を16分割する
python3 scripts/split_line_stamps.py "<1枚絵.png>" "<出力ディレクトリ>"

# 既存の画像を規定サイズ・偶数pxに揃え、main.png / tab.png を生成する
python3 scripts/normalize_line_stamps.py line-stamps/タコスシリーズ/*/

# 「ZIPファイル アップロード」用の ZIP を作る
python3 scripts/pack_line_stamps.py line-stamps/upload line-stamps/タコスシリーズ/*/
```

`line-stamps/upload/` の ZIP は直下に `main.png` `tab.png` `01.png`〜`16.png` を並べた形式で、
マイページの「ZIPファイル アップロード」にそのまま投げられる（スタンプ個数は **16個** を選択）。
生成物のためリポジトリには含めていない。スクリプトで作り直せる。

## 分割の仕様

- アルファチャンネルの行/列投影から格子の区切りを自動検出し、4×4 に分割
- 各セルはセリフを含めて余白なしで切り出し
- 規定サイズに収まるよう縮小し、周囲に 10px の透過余白を付与
- 縦横が奇数になる場合は透過ピクセルを 1px 足して偶数に揃える（絵柄は再サンプリングしない）

`main.png` / `tab.png` は各シリーズの `1.png` から自動生成しているので、
別の絵にしたい場合は差し替えること。
