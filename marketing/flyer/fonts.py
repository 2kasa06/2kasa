# -*- coding: utf-8 -*-
"""本文に出てくる文字だけを Google Fonts からサブセット取得して埋め込む"""
import pathlib, re, base64, subprocess, urllib.parse, sys

body = pathlib.Path("body.html").read_text(encoding="utf-8")
text_only = re.sub(r"<[^>]+>", "", body)                 # タグを除去
chars = sorted(set(text_only) - set("\n\r\t"))
chars += list(" 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#|×✦、。・（）「」＆")
chars = sorted(set(chars))
subset = "".join(chars)
print(f"必要な文字数: {len(subset)}")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

FAMILIES = [
    ("ZenMaru", "Zen+Maru+Gothic:wght@400;500;700"),
    ("Cormorant", "Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400"),
]

faces = []
for local_name, family in FAMILIES:
    url = ("https://fonts.googleapis.com/css2?family=" + family
           + "&text=" + urllib.parse.quote(subset) + "&display=swap")
    css = subprocess.run(["curl", "-sS", "--max-time", "60", "-A", UA, url],
                         capture_output=True, text=True).stdout
    if "@font-face" not in css:
        sys.exit(f"取得失敗: {local_name}\n{css[:300]}")

    for block in re.findall(r"@font-face\s*\{.*?\}", css, flags=re.S):
        src = re.search(r"url\((https://[^)]+)\)", block)
        weight = re.search(r"font-weight:\s*([\d ]+);", block)
        style = re.search(r"font-style:\s*(\w+);", block)
        if not src:
            continue
        data = subprocess.run(["curl", "-sS", "--max-time", "60", "-A", UA, src.group(1)],
                              capture_output=True).stdout
        b64 = base64.b64encode(data).decode()
        faces.append(
            f"@font-face{{font-family:'{local_name}';"
            f"font-style:{style.group(1) if style else 'normal'};"
            f"font-weight:{weight.group(1).strip() if weight else '400'};"
            f"font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
        print(f"  {local_name} {style.group(1) if style else 'normal'} "
              f"{weight.group(1).strip() if weight else '400'} — {len(data)/1024:.1f} KB")

pathlib.Path("fonts.css").write_text("\n".join(faces), encoding="utf-8")
print(f"埋め込みフォント: {len(faces)} 種 / 合計 {len(''.join(faces))/1024:.0f} KB")
