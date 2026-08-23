#!/usr/bin/env python3
"""スタンプ画像から main.png (240x240) と tab.png (96x74) を作る。

main はセリフ込みの全体、tab は 96x74 と小さくて文字が潰れるため、
文字とイラストの間の透過帯を検出してイラスト部分だけを使う。

使い方:
    python3 scripts/make_main_tab.py <スタンプ画像> [<出力ディレクトリ>]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

MAIN_SIZE = (240, 240)
TAB_SIZE = (96, 74)
MAIN_MARGIN = 10
TAB_MARGIN = 3
ALPHA_THRESHOLD = 10
MIN_GAP = 1          # 文字とイラストを分ける帯の最小の高さ(px)
SPARSE_RATIO = 0.05  # 幅のこの割合以下しか埋まっていない行は「帯」とみなす
SEARCH_RATIO = 0.45  # 上から何割の範囲で帯を探すか


def illustration(image):
    """セリフを除いたイラスト部分を返す（帯が見つからなければ全体）。

    セリフとイラストの間には、装飾（ハートや効果線）がわずかに掛かるだけの
    ほぼ空の行が並ぶ。その帯のうち一番下のもので切る。セリフが2行に
    分かれている場合に行間で切ってしまわないようにするため。
    """
    filled = np.array(image)[:, :, 3] > ALPHA_THRESHOLD
    rows = filled.sum(axis=1) <= image.width * SPARSE_RATIO
    limit = int(len(rows) * SEARCH_RATIO)

    cut, start = None, None
    for y in range(limit):
        if rows[y] and start is None:
            start = y
        elif not rows[y] and start is not None:
            if start > 0 and y - start >= MIN_GAP:
                cut = y
            start = None
    return image.crop((0, cut, image.width, image.height)) if cut else image


def contain(image, size, margin):
    """透過を除いた中身を size 内に最大まで収め、中央に配置する。"""
    content = image.crop(image.getbbox() or (0, 0, image.width, image.height))
    scale = min((size[0] - margin * 2) / content.width, (size[1] - margin * 2) / content.height)
    content = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))), Image.LANCZOS
    )
    canvas = Image.new("RGBA", size, (255, 255, 255, 0))
    canvas.paste(content, ((size[0] - content.width) // 2, (size[1] - content.height) // 2), content)
    return canvas


def main():
    if not 2 <= len(sys.argv) <= 3:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) == 3 else source.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    image = Image.open(source).convert("RGBA")
    contain(image, MAIN_SIZE, MAIN_MARGIN).save(out_dir / "main.png")
    contain(illustration(image), TAB_SIZE, TAB_MARGIN).save(out_dir / "tab.png")
    print(f"{out_dir}/main.png\t240x240")
    print(f"{out_dir}/tab.png\t96x74")


if __name__ == "__main__":
    main()
