#!/usr/bin/env python3
"""格子状に並んだ 1 枚絵の LINE スタンプ／絵文字素材を 1 個ずつ切り分ける。

透過アルファのヒストグラム（行/列ごとの投影）から格子の区切り位置を検出し、
各セルの中身を余白なしで切り出したうえで、規定サイズに収めて書き出す。

    スタンプ : 横 80〜370px / 縦 80〜320px、周囲に約10pxの余白
    絵文字   : 180 x 180px 固定（余白をつけず画像いっぱいに配置）

使い方:
    python3 scripts/split_line_stamps.py <入力画像> <出力ディレクトリ> [--grid 8x5] [--emoji]

    --grid  格子の列数x行数（省略時は 4x4）
    --emoji 絵文字サイズ(180x180)で書き出す。ファイル名も3桁の連番になる
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ALPHA_THRESHOLD = 10   # これ以下のアルファは「背景」とみなす
MARGIN = 10            # スタンプの周囲に付ける余白(px)
MAX_W, MAX_H = 370, 320
MIN_W, MIN_H = 80, 80
EMOJI_SIZE = 180
EMOJI_MARGIN = 2       # 輪郭が縁で切れないための最小限の余白(px)


def empty_runs(occupancy):
    """占有量ゼロが連続する区間 [start, end) を返す。"""
    runs, start = [], None
    for i, v in enumerate(occupancy):
        if v == 0 and start is None:
            start = i
        elif v != 0 and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(occupancy)))
    return runs


def grid_cuts(mask, axis, divisions):
    """格子の区切り位置（divisions-1 本）を求める。

    軸方向に投影して空白区間を洗い出し、幅の広い順に必要な本数だけ採用する。
    """
    occupancy = mask.sum(axis=axis)
    length = len(occupancy)
    inner = [r for r in empty_runs(occupancy) if r[0] > 0 and r[1] < length]
    if len(inner) < divisions - 1:
        raise SystemExit(
            f"格子の区切りを検出できませんでした (axis={axis}, "
            f"必要 {divisions - 1} 本 / 検出 {len(inner)} 本)"
        )
    widest = sorted(inner, key=lambda r: r[1] - r[0], reverse=True)[: divisions - 1]
    return sorted((r[0] + r[1]) // 2 for r in widest)


def bounds(cuts, length):
    edges = [0, *cuts, length]
    return list(zip(edges[:-1], edges[1:]))


def even(n):
    return n if n % 2 == 0 else n + 1


def fit_sticker(cell):
    """切り出した中身を LINE スタンプの規定サイズに収める。"""
    inner_w, inner_h = MAX_W - MARGIN * 2, MAX_H - MARGIN * 2
    scale = min(inner_w / cell.width, inner_h / cell.height, 1.0)
    # 小さすぎる場合は最小サイズまで拡大する
    scale = max(scale, (MIN_W - MARGIN * 2) / cell.width, (MIN_H - MARGIN * 2) / cell.height)
    if scale != 1.0:
        cell = resize(cell, scale)
    return centered(cell, (even(cell.width + MARGIN * 2), even(cell.height + MARGIN * 2)))


def fit_emoji(cell):
    """切り出した中身を 180x180 いっぱいに収める。"""
    inner = EMOJI_SIZE - EMOJI_MARGIN * 2
    cell = resize(cell, min(inner / cell.width, inner / cell.height))
    return centered(cell, (EMOJI_SIZE, EMOJI_SIZE))


def resize(image, scale):
    return image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS
    )


def centered(image, size):
    canvas = Image.new("RGBA", size, (255, 255, 255, 0))
    canvas.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2), image)
    return canvas


def split(src_path, out_dir, grid, emoji):
    cols, rows = grid
    image = Image.open(src_path).convert("RGBA")
    mask = np.array(image)[:, :, 3] > ALPHA_THRESHOLD

    row_bounds = bounds(grid_cuts(mask, 1, rows), image.height)
    col_bounds = bounds(grid_cuts(mask, 0, cols), image.width)

    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for index, (row, col) in enumerate(((r, c) for r in row_bounds for c in col_bounds), start=1):
        cell_mask = mask[row[0]:row[1], col[0]:col[1]]
        ys, xs = np.nonzero(cell_mask)
        if len(xs) == 0:
            raise SystemExit(f"{src_path}: {index} 番目のセルが空です")
        box = (col[0] + xs.min(), row[0] + ys.min(), col[0] + xs.max() + 1, row[0] + ys.max() + 1)
        cell = image.crop(box)
        out = fit_emoji(cell) if emoji else fit_sticker(cell)
        out_path = out_dir / (f"{index:03d}.png" if emoji else f"{index}.png")
        out.save(out_path)
        results.append((out_path, out.size))
    return results


def parse_args(argv):
    grid, emoji, positional = (4, 4), False, []
    it = iter(argv)
    for arg in it:
        if arg == "--emoji":
            emoji = True
        elif arg == "--grid":
            cols, _, rows = next(it, "").partition("x")
            if not (cols.isdigit() and rows.isdigit()):
                raise SystemExit("--grid は 8x5 のように 列数x行数 で指定してください")
            grid = (int(cols), int(rows))
        else:
            positional.append(arg)
    if len(positional) != 2:
        raise SystemExit(__doc__)
    return Path(positional[0]), Path(positional[1]), grid, emoji


def main():
    src, out_dir, grid, emoji = parse_args(sys.argv[1:])
    for path, size in split(src, out_dir, grid, emoji):
        print(f"{path}\t{size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
