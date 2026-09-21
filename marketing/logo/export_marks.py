# -*- coding: utf-8 -*-
"""マーク単体を SVG で書き出す（文字を含まないので、どの環境でもそのまま開けます）"""
import pathlib, marks
out = pathlib.Path("marks"); out.mkdir(exist_ok=True)
ROSE, DEEP, INK = "#C08578", "#A5645A", "#463229"
JOBS = [
    ("A-bloom-rose",  marks.quatrefoil(512, ROSE, 1.9)),
    ("A-bloom-ink",   marks.quatrefoil(512, INK, 1.9)),
    ("A-bloom-white", marks.quatrefoil(512, "#FFFFFF", 1.9)),
    ("B-bud-rose",    marks.vesica(512, ROSE, 1.7)),
    ("D-arch-rose",   marks.arch(512, DEEP, 1.8)),
    ("C-rule-rose",   marks.rule(512, ROSE, 0.8)),
]
for name, svg in JOBS:
    (out / f"evea-mark-{name}.svg").write_text(svg, encoding="utf-8")
    print("wrote", name)
