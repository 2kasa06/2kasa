#!/usr/bin/env python3
"""4x4 に並んだ 1 枚絵の LINE スタンプ素材を 16 枚に切り分ける。

透過アルファのヒストグラム（行/列ごとの投影）から格子の区切り位置を検出し、
各セルの中身を余白なしで切り出したうえで、LINE スタンプの規定サイズ
（横 80〜370px / 縦 80〜320px、周囲に約10pxの余白）に収めて書き出す。

使い方:
    python3 scripts/split_line_stamps.py <入力画像> <出力ディレクトリ>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ALPHA_THRESHOLD = 10   # これ以下のアルファは「背景」とみなす
GRID = 4               # 4 x 4
MARGIN = 10            # 出力画像の周囲に付ける余白(px)
MAX_W, MAX_H = 370, 320
MIN_W, MIN_H = 80, 80


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


def grid_cuts(mask, axis):
    """格子の区切り位置（GRID-1 本）を求める。

    軸方向に投影して空白区間を洗い出し、幅の広い順に GRID-1 本だけ採用する。
    """
    occupancy = mask.sum(axis=axis)
    length = len(occupancy)
    inner = [r for r in empty_runs(occupancy) if r[0] > 0 and r[1] < length]
    if len(inner) < GRID - 1:
        raise SystemExit(f"格子の区切りを検出できませんでした (axis={axis})")
    widest = sorted(inner, key=lambda r: r[1] - r[0], reverse=True)[: GRID - 1]
    return sorted((r[0] + r[1]) // 2 for r in widest)


def bounds(cuts, length):
    edges = [0, *cuts, length]
    return list(zip(edges[:-1], edges[1:]))


def even(n):
    return n if n % 2 == 0 else n + 1


def fit(cell):
    """切り出した中身を LINE スタンプの規定サイズに収める。"""
    inner_w, inner_h = MAX_W - MARGIN * 2, MAX_H - MARGIN * 2
    scale = min(inner_w / cell.width, inner_h / cell.height, 1.0)
    # 小さすぎる場合は最小サイズまで拡大する
    scale = max(scale, (MIN_W - MARGIN * 2) / cell.width, (MIN_H - MARGIN * 2) / cell.height)
    if scale != 1.0:
        cell = cell.resize(
            (max(1, round(cell.width * scale)), max(1, round(cell.height * scale))),
            Image.LANCZOS,
        )
    canvas = Image.new(
        "RGBA", (even(cell.width + MARGIN * 2), even(cell.height + MARGIN * 2)), (255, 255, 255, 0)
    )
    canvas.paste(cell, ((canvas.width - cell.width) // 2, (canvas.height - cell.height) // 2), cell)
    return canvas


def split(src_path, out_dir):
    image = Image.open(src_path).convert("RGBA")
    mask = np.array(image)[:, :, 3] > ALPHA_THRESHOLD

    rows = bounds(grid_cuts(mask, axis=1), image.height)
    cols = bounds(grid_cuts(mask, axis=0), image.width)

    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for index, (row, col) in enumerate(((r, c) for r in rows for c in cols), start=1):
        cell_mask = mask[row[0]:row[1], col[0]:col[1]]
        ys, xs = np.nonzero(cell_mask)
        if len(xs) == 0:
            raise SystemExit(f"{src_path}: {index} 番目のセルが空です")
        box = (col[0] + xs.min(), row[0] + ys.min(), col[0] + xs.max() + 1, row[0] + ys.max() + 1)
        out = fit(image.crop(box))
        out_path = out_dir / f"{index}.png"
        out.save(out_path)
        results.append((out_path, out.size))
    return results


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    for path, size in split(Path(sys.argv[1]), Path(sys.argv[2])):
        print(f"{path}\t{size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
