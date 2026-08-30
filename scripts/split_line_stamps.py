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
# 区切りを探すときの「ほぼ空」の閾値。完全な空白で足りなければ順に緩める
GAP_RATIOS = (0, 0.01, 0.02, 0.03, 0.05, 0.08)
MIN_GAP_RATIO = 0.03   # コマ1つ分の何割以上の幅があれば区切りとみなすか


def thin_runs(occupancy, threshold):
    """占有量が threshold 以下の行/列が連続する区間 [start, end) を返す。"""
    runs, start = [], None
    for i, v in enumerate(occupancy):
        if v <= threshold and start is None:
            start = i
        elif v > threshold and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(occupancy)))
    return runs


def grid_cuts(mask, axis, divisions):
    """格子の区切り位置（divisions-1 本）を求める。

    軸方向に投影して空白区間を洗い出し、幅の広い順に必要な本数だけ採用する。
    隣のコマの効果線が触れていて完全な空白にならないことがあるので、
    足りなければ閾値を少しずつ緩めて探し直す。
    """
    occupancy = mask.sum(axis=axis)
    length = len(occupancy)
    depth = mask.shape[1 - axis]

    # コマ1つ分に対して極端に細い帯は、絵の隙間であって区切りではない
    min_width = max(2, length / divisions * MIN_GAP_RATIO)

    for ratio in GAP_RATIOS:
        inner = [
            r
            for r in thin_runs(occupancy, depth * ratio)
            if r[0] > 0 and r[1] < length and r[1] - r[0] >= min_width
        ]
        if len(inner) >= divisions - 1:
            widest = sorted(inner, key=lambda r: r[1] - r[0], reverse=True)[: divisions - 1]
            return sorted((r[0] + r[1]) // 2 for r in widest)

    raise SystemExit(
        f"格子の区切りを検出できませんでした (axis={axis}, "
        f"必要 {divisions - 1} 本 / 検出 {len(inner)} 本)"
    )


def label_components(mask):
    """連結成分のラベル配列を返す。

    行ごとに連続する区間を拾い、上の行の区間と重なるものを同じ成分として
    束ねる（union-find）。効果線などが隣のコマに掛かっているかを見るために使う。
    """
    parent = [0]

    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    all_runs, previous = [], []
    for y in range(mask.shape[0]):
        padded = np.concatenate(([0], mask[y].view(np.int8), [0]))
        edges = np.flatnonzero(np.diff(padded))
        current = []
        for start, stop in zip(edges[::2], edges[1::2]):
            label = None
            for p_start, p_stop, p_label in previous:
                if p_start < stop and start < p_stop:
                    if label is None:
                        label = p_label
                    else:
                        union(label, p_label)
            if label is None:
                parent.append(len(parent))
                label = len(parent) - 1
            current.append((start, stop, label))
        all_runs.append(current)
        previous = current

    labels = np.zeros(mask.shape, np.int32)
    for y, runs in enumerate(all_runs):
        for start, stop, label in runs:
            labels[y, start:stop] = find(label)
    return labels


def centroid(mask):
    ys, xs = np.nonzero(mask)
    return xs.mean(), ys.mean()


def grid_cells(mask, cols, rows):
    """各コマの矩形 (行の範囲, 列の範囲) を並べて返す。

    列の区切りは行ごとに検出する。1枚絵によっては行ごとに横位置が
    少しずつずれていて、全体で投影すると区切りが埋まってしまうため。
    """
    cells = []
    for row in bounds(grid_cuts(mask, 1, rows), mask.shape[0]):
        band = mask[row[0]:row[1]]
        cells.extend((row, col) for col in bounds(grid_cuts(band, 0, cols), mask.shape[1]))
    return cells


def owners(mask, cells):
    """各画素が「どのセルのものか」を表す配列を返す。

    単純に矩形で切ると、コマの間に置かれた音符やキラキラが隣のコマに
    混ざる。連結成分ごとに持ち主を決め、区切り線をまたぐものは一番近い
    キャラクター（またがずに収まっている最大の成分）のセットに渡す。
    """
    labels = label_components(mask)
    cell_of_pixel = np.full(mask.shape, -1, np.int32)
    for index, (row, col) in enumerate(cells):
        cell_of_pixel[row[0]:row[1], col[0]:col[1]] = index

    inside = mask & (cell_of_pixel >= 0)
    counts = np.bincount(
        labels[inside] * len(cells) + cell_of_pixel[inside],
        minlength=(labels.max() + 1) * len(cells),
    ).reshape(-1, len(cells))

    owner_of_label = counts.argmax(axis=1)
    straddling = [
        label for label in np.flatnonzero(counts.sum(axis=1)) if (counts[label] > 0).sum() > 1
    ]

    # 各セルの「キャラクター」= またがずに収まっている最大の成分
    bodies = {}
    for label in np.flatnonzero(counts.sum(axis=1)):
        if label in straddling:
            continue
        cell = owner_of_label[label]
        if counts[label, cell] > counts[bodies.get(cell, label), cell] or cell not in bodies:
            bodies[cell] = label

    for label in straddling:
        candidates = [c for c in np.flatnonzero(counts[label]) if c in bodies]
        if len(candidates) < 2:
            continue
        x, y = centroid(labels == label)
        owner_of_label[label] = min(
            candidates,
            key=lambda c: np.hypot(*np.subtract(centroid(labels == bodies[c]), (x, y))),
        )

    return np.where(mask, owner_of_label[labels], -1)


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

    cells = grid_cells(mask, cols, rows)
    owner = owners(mask, cells)

    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for index in range(1, len(cells) + 1):
        cell_mask = owner == index - 1
        ys, xs = np.nonzero(cell_mask)
        if len(xs) == 0:
            raise SystemExit(f"{src_path}: {index} 番目のセルが空です")
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        cell = image.crop(box)
        # 切り出した矩形に入り込んだ隣のコマの破片を消す。
        # 閾値以下の薄い画素（輪郭のアンチエイリアス）はそのまま残す
        foreign = owner[box[1]:box[3], box[0]:box[2]]
        if (foreign >= 0).any() and (foreign[foreign >= 0] != index - 1).any():
            pixels = np.array(cell)
            pixels[(foreign >= 0) & (foreign != index - 1), 3] = 0
            cell = Image.fromarray(pixels)
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
