#!/usr/bin/env python3
"""LINE Creators Market の「ZIPファイル アップロード」用 ZIP を作る。

ZIP 直下に main.png / tab.png / 連番画像を並べる必要があるため、
ファイル名をゼロ埋めの連番にリネームして固める。連番の桁数は
スタンプが2桁（01.png〜）、絵文字が3桁（001.png〜）。

使い方:
    python3 scripts/pack_line_stamps.py <出力ディレクトリ> <画像のディレクトリ> ... [--emoji]
"""
import sys
import zipfile
from pathlib import Path

SIZE_LIMIT = 20 * 1024 * 1024  # アップロードできる ZIP の上限


def pack(directory, out_dir, digits):
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
            archive.write(path, f"{index:0{digits}d}.png")

    size = zip_path.stat().st_size
    if size > SIZE_LIMIT:
        print(f"警告: {zip_path} が {size / 1024 / 1024:.1f}MB あり 20MB を超えています", file=sys.stderr)
    return zip_path, len(numbered), size


def main():
    args = [a for a in sys.argv[1:] if a != "--emoji"]
    digits = 3 if "--emoji" in sys.argv[1:] else 2
    if len(args) < 2:
        raise SystemExit(__doc__)

    out_dir = Path(args[0])
    for arg in args[1:]:
        zip_path, count, size = pack(Path(arg), out_dir, digits)
        print(f"{zip_path}\t{count}個 + main + tab\t{size / 1024 / 1024:.1f}MB")


if __name__ == "__main__":
    main()
