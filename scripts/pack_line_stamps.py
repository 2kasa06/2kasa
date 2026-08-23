#!/usr/bin/env python3
"""LINE Creators Market の「ZIPファイル アップロード」用 ZIP を作る。

ZIP 直下に main.png / tab.png / 01.png … と並べる必要があるため、
`1.png` 形式のファイル名を 2 桁ゼロ埋めにリネームして固める。

使い方:
    python3 scripts/pack_line_stamps.py <出力ディレクトリ> <スタンプ画像のディレクトリ> ...
"""
import sys
import zipfile
from pathlib import Path


def pack(directory, out_dir):
    numbered = sorted(
        (p for p in directory.glob("*.png") if p.stem.isdigit()), key=lambda p: int(p.stem)
    )
    missing = [name for name in ("main.png", "tab.png") if not (directory / name).exists()]
    if missing:
        raise SystemExit(f"{directory}: {', '.join(missing)} がありません")

    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"{directory.name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(directory / "main.png", "main.png")
        archive.write(directory / "tab.png", "tab.png")
        for index, path in enumerate(numbered, start=1):
            archive.write(path, f"{index:02d}.png")
    return zip_path, len(numbered)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    out_dir = Path(sys.argv[1])
    for arg in sys.argv[2:]:
        zip_path, count = pack(Path(arg), out_dir)
        print(f"{zip_path}\tスタンプ{count}枚 + main + tab")


if __name__ == "__main__":
    main()
