#!/usr/bin/env python3
"""既存のスタンプ画像を LINE Creators Market の規定に合わせる。

規定: 横 80〜370px / 縦 80〜320px、縦横とも偶数ピクセルの透過 PNG。
main.png / tab.png は scripts/make_main_tab.py で作る。

サイズ超過は縮小し、奇数ピクセルは透過ピクセルを 1px 足して偶数に揃える
（絵柄を再サンプリングしないので画質が落ちない）。

使い方:
    python3 scripts/normalize_line_stamps.py <スタンプ画像のあるディレクトリ> ...
"""
import sys
from pathlib import Path

from PIL import Image

MAX_W, MAX_H = 370, 320
MIN_W, MIN_H = 80, 80


def normalize(image):
    """スタンプ画像を規定サイズ・偶数ピクセルに整える。"""
    scale = min(MAX_W / image.width, MAX_H / image.height, 1.0)
    scale = max(scale, MIN_W / image.width, MIN_H / image.height)
    if scale != 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS
        )
    width = min(image.width + image.width % 2, MAX_W)
    height = min(image.height + image.height % 2, MAX_H)
    if (width, height) == image.size:
        return image
    # 余白を足すだけなので絵柄はそのまま
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    canvas.paste(image, ((width - image.width) // 2, (height - image.height) // 2), image)
    return canvas


def process(directory):
    changed = []
    for path in sorted(directory.glob("*.png"), key=lambda p: p.name):
        if path.stem in ("main", "tab"):
            continue
        before = Image.open(path).convert("RGBA")
        after = normalize(before)
        if after.size != before.size:
            after.save(path)
            changed.append((path, before.size, after.size))
    return changed


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for arg in sys.argv[1:]:
        for path, before, after in process(Path(arg)):
            print(f"{path}\t{before[0]}x{before[1]} -> {after[0]}x{after[1]}")


if __name__ == "__main__":
    main()
