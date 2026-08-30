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
GAP_RATIOS = (0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.18)
MIN_GAP_RATIO = 0.03   # コマ1つ分の何割以上の幅があれば区切りとみなすか
MIN_SPAN, MAX_SPAN = 0.6, 1.6  # コマ1つ分に対して許すコマ幅の範囲
REASSIGN_FACTOR = 2    # 隣のキャラクターがこの倍率より近いときだけ持ち主を移す


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

    軸方向に投影して空白に近い区間を洗い出し、その中からコマ幅が揃う
    組み合わせを選ぶ。隣のコマの効果線が触れていて完全な空白にならない
    ことがあるので、足りなければ閾値を少しずつ緩めて探し直す。
    """
    occupancy = mask.sum(axis=axis)
    length = len(occupancy)
    depth = mask.shape[axis]  # 投影した方向の画素数 = 占有量の最大値

    cell = length / divisions
    # コマ1つ分に対して極端に細い帯は、絵の隙間であって区切りではない
    min_width = max(2, cell * MIN_GAP_RATIO)

    for ratio in GAP_RATIOS:
        midpoints = sorted(
            (r[0] + r[1]) // 2
            for r in thin_runs(occupancy, depth * ratio)
            if r[0] > 0 and r[1] < length and r[1] - r[0] >= min_width
        )
        cuts = choose_cuts(midpoints, length, divisions)
        if cuts is not None:
            return cuts

    raise SystemExit(f"格子の区切りを検出できませんでした (axis={axis}, {divisions}分割)")


def choose_cuts(midpoints, length, divisions):
    """帯の候補から、コマ幅が揃う組み合わせを選ぶ。選べなければ None。

    絵の中の隙間が候補に混ざるので、幅の広い順に採ると誤った位置で切ってしまう。
    コマ幅が均等に近くなる組み合わせを動的計画法で選び、それでも極端に
    広い／狭いコマが残る場合は候補が足りていないとみなす。
    """
    cell = length / divisions
    points = [0, *midpoints, length]
    infinity = float("inf")

    # best[j][c] = points[j] までを c コマで区切ったときの (最小コスト, 直前の点)
    best = [[(infinity, None)] * (divisions + 1) for _ in points]
    best[0][0] = (0.0, None)
    for j in range(1, len(points)):
        for c in range(1, divisions + 1):
            for i in range(j):
                previous = best[i][c - 1][0]
                if previous == infinity:
                    continue
                cost = previous + (points[j] - points[i] - cell) ** 2
                if cost < best[j][c][0]:
                    best[j][c] = (cost, i)

    if best[-1][divisions][0] == infinity:
        return None

    chosen, j, c = [], len(points) - 1, divisions
    while c:
        j = best[j][c][1]
        c -= 1
        chosen.append(points[j])
    chosen = sorted(chosen)[1:]  # 先頭の 0 は区切りではない

    edges = [0, *chosen, length]
    spans = [b - a for a, b in zip(edges[:-1], edges[1:])]
    if min(spans) < cell * MIN_SPAN or max(spans) > cell * MAX_SPAN:
        return None
    return chosen


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


def boxes_of(labels, count):
    """ラベルごとの外接矩形 (x0, y0, x1, y1) をまとめて求める。"""
    ys, xs = np.nonzero(labels)
    order = np.argsort(labels[ys, xs], kind="stable")
    ys, xs = ys[order], xs[order]
    edges = np.searchsorted(labels[ys, xs], np.arange(count + 1))
    boxes = {}
    for label in range(1, count):
        lo, hi = edges[label], edges[label + 1]
        if lo < hi:
            boxes[label] = (xs[lo:hi].min(), ys[lo:hi].min(), xs[lo:hi].max(), ys[lo:hi].max())
    return boxes


def box_gap(a, b):
    """2つの外接矩形の隙間の距離。重なっていれば 0。"""
    dx = max(0, a[0] - b[2], b[0] - a[2])
    dy = max(0, a[1] - b[3], b[1] - a[3])
    return np.hypot(dx, dy)


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

    基本はコマの矩形どおりに割り当てる。ただしコマの間に置かれた音符や
    キラキラは、区切り位置のわずかな違いで隣のコマに移ってしまう。
    自分のコマのキャラクターより隣のキャラクターのほうがはっきり近い
    成分だけ、そちらに渡す。渡すのは同じ行の中だけ。スタンプのセリフは
    上下の行のキャラクターに近いことがあり、行をまたいで動かすと文字が
    隣のコマに移ってしまうため。
    """
    labels = label_components(mask)
    count = labels.max() + 1
    cell_of_pixel = np.full(mask.shape, -1, np.int32)
    for index, (row, col) in enumerate(cells):
        cell_of_pixel[row[0]:row[1], col[0]:col[1]] = index

    inside = mask & (cell_of_pixel >= 0)
    sizes = np.bincount(
        labels[inside] * len(cells) + cell_of_pixel[inside],
        minlength=count * len(cells),
    ).reshape(count, len(cells))

    owner_of_label = sizes.argmax(axis=1)
    boxes = boxes_of(labels, count)

    # 各コマのキャラクター = そのコマに最も多くの画素を置いている成分
    bodies = {}
    for label in boxes:
        cell = owner_of_label[label]
        if cell not in bodies or sizes[label, cell] > sizes[bodies[cell], cell]:
            bodies[cell] = label

    for label in boxes:
        cell = owner_of_label[label]
        if bodies.get(cell) == label or cell not in bodies:
            continue
        same_row = [c for c in bodies if cells[c][0] == cells[cell][0]]
        nearest = min(same_row, key=lambda c: box_gap(boxes[label], boxes[bodies[c]]))
        if nearest == cell:
            continue
        own = box_gap(boxes[label], boxes[bodies[cell]])
        if box_gap(boxes[label], boxes[bodies[nearest]]) * REASSIGN_FACTOR < own:
            owner_of_label[label] = nearest

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
