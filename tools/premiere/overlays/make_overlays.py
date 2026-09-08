# -*- coding: utf-8 -*-
"""
文字・エフェクトの透過PNGを書き出す。
テキスト設定.json を書き換えてから実行すると、中身だけ差し替わる。

  python3 make_overlays.py
"""
import json, os, math, colorsys, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FW, FH, FPS = 1920, 1080, 30
OUT = os.path.join(HERE, "文字とエフェクト")
FONTS = os.path.join(HERE, "fonts")

INK = (58, 58, 58, 255)          # 参考動画の文字色（濃いグレー）
WHITE = (255, 255, 255, 255)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def canvas():
    return Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

def tracked(draw, xy, text, ft, fill, tracking=0, anchor_center=True, shadow=None):
    """字間（トラッキング）を空けて描く。参考動画の名前まわりの詰め方を再現する。"""
    widths = [draw.textlength(ch, font=ft) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    top = xy[1]
    for ch, w in zip(text, widths):
        if shadow:
            draw.text((x + shadow[0], top + shadow[1]), ch, font=ft, fill=shadow[2])
        draw.text((x, top), ch, font=ft, fill=fill)
        x += w + tracking
    return total

def soft_shadow(img, blur=6, alpha=110, offset=(0, 2)):
    """写真の上に置く文字用の、うっすらした影。"""
    a = img.split()[3].point(lambda v: min(255, v * alpha // 255))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base = Image.new("RGBA", img.size, (0, 0, 0, 0))
    base.paste(sh, offset, sh)
    return Image.alpha_composite(base, img)


def make_title(cfg):
    """0:02〜 のタイトル。筆記体の一言＋字間を広げた大きなお名前。"""
    img = canvas(); d = ImageDraw.Draw(img)
    t = cfg["タイトル"]
    d.text((FW / 2, FH * 0.34), t["上の一言"], font=font("script.ttf", 112),
           fill=INK, anchor="mm")
    tracked(d, (FW / 2, FH * 0.42), t["お名前"].upper(), font("serif-light.ttf", 150),
            INK, tracking=18)
    y = FH * 0.635
    d.line([(FW / 2 - 150, y), (FW / 2 + 150, y)], fill=(58, 58, 58, 140), width=1)
    tracked(d, (FW / 2, y + 26), t["挙式日"], font("serif.ttf", 40), INK, tracking=8)
    return soft_shadow(img, blur=14, alpha=60, offset=(0, 3))


def make_caption(date, place):
    """各カットの左下に入る日付＋場所。"""
    if not date and not place:
        return None
    img = canvas(); d = ImageDraw.Draw(img)
    x, y = 110, FH - 190
    if date:
        tracked(d, (x, y), date, font("serif.ttf", 44), WHITE, tracking=5, anchor_center=False)
    if place:
        d.text((x, y + 62), place, font=font("jp-light.ttf", 40), fill=WHITE)
    d.line([(x, y - 22), (x + 54, y - 22)], fill=(255, 255, 255, 200), width=2)
    return soft_shadow(img, blur=8, alpha=150, offset=(0, 2))


def make_endcard(cfg):
    """1:19〜 の締め。グラデーションの枠＋メッセージ。"""
    img = Image.new("RGBA", (FW, FH), (255, 255, 255, 255))
    grad = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for i in range(FW):
        h = 0.13 + 0.72 * (i / FW)                      # 黄 → ピンク → 紫
        r, g, b = colorsys.hsv_to_rgb(h, 0.45, 0.97)
        gd.line([(i, 0), (i, FH)], fill=(int(r * 255), int(g * 255), int(b * 255), 255))
    mask = Image.new("L", (FW, FH), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([28, 28, FW - 29, FH - 29], outline=255, width=14)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    e = cfg["エンドカード"]
    d.text((FW / 2, FH * 0.44), e["1行目"], font=font("script.ttf", 96), fill=INK, anchor="mm")
    d.text((FW / 2, FH * 0.58), e["2行目"], font=font("jp-light.ttf", 44), fill=INK, anchor="mm")
    return img


def make_scrim(center=0.52, edge=0.80):
    """
    タイトルの下に敷く白いベール。
    参考動画は写真を白く飛ばした上に濃いグレーの文字を置いている。
    中心をやや薄く、周辺を濃くして、視線が中央に集まるようにする。
    Premiere 側で不透明度を触れるよう、文字とは別ファイルにしてある。
    """
    img = Image.new("RGBA", (FW, FH), (255, 255, 255, 255))
    mask = Image.new("L", (FW, FH))
    px = mask.load()
    cx, cy = FW / 2, FH / 2
    maxd = math.hypot(cx, cy)
    for y in range(0, FH, 2):
        for x in range(0, FW, 2):
            r = math.hypot(x - cx, y - cy) / maxd
            v = int(255 * (center + (edge - center) * (r ** 1.6)))
            px[x, y] = v
            if x + 1 < FW: px[x + 1, y] = v
            if y + 1 < FH:
                px[x, y + 1] = v
                if x + 1 < FW: px[x + 1, y + 1] = v
    img.putalpha(mask.filter(ImageFilter.GaussianBlur(20)))
    return img


def make_flash():
    """カットの区切りに置く白フラッシュ（不透明度をキーフレームで動かす）。"""
    return Image.new("RGBA", (FW, FH), (255, 255, 255, 255))


def make_opening_wipe(n=60):
    """0:00〜0:02 の幾何ワイプ。白い帯が角度を変えながら画面を横切る。"""
    frames = []
    bands = [(-28, 0.00, 0.42), (34, 0.10, 0.52), (-16, 0.22, 0.64), (22, 0.34, 0.78)]
    for f in range(n):
        t = f / (n - 1)
        img = Image.new("RGBA", (FW, FH), (255, 255, 255, 255) if t < 0.06 else (0, 0, 0, 0))
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        for angle, t0, t1 in bands:
            if t < t0:
                p = 0.0
            elif t > t1:
                p = 1.0
            else:
                u = (t - t0) / (t1 - t0)
                p = u * u * (3 - 2 * u)                 # イーズイン／イーズアウト
            if p >= 1.0:
                continue
            w = FW * 2
            cx = -w / 2 + (FW + w) * p
            rad = math.radians(angle)
            dx, dy = math.cos(rad) * w, math.sin(rad) * w
            ld.polygon([(cx - dy, -dx), (cx + dy, dx),
                        (cx + dy + w, dx), (cx - dy + w, -dx)], fill=(255, 255, 255, 255))
        frames.append(Image.alpha_composite(img, layer))
    return frames


def make_color_frame(n=150):
    """1:14〜 のクライマックスを囲む、色が変わるアニメーション枠。"""
    frames = []
    for f in range(n):
        t = f / (n - 1)
        img = canvas()
        grad = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        for i in range(0, FW, 2):
            h = (0.13 + 0.72 * (i / FW) + t * 0.5) % 1.0
            r, g, b = colorsys.hsv_to_rgb(h, 0.55, 0.98)
            gd.rectangle([i, 0, i + 2, FH], fill=(int(r * 255), int(g * 255), int(b * 255), 255))
        mask = Image.new("L", (FW, FH), 0)
        md = ImageDraw.Draw(mask)
        md.rectangle([46, 46, FW - 47, FH - 47], outline=255, width=16)
        img.paste(grad, (0, 0), mask)
        frames.append(img)
    return frames


def main():
    cfg = json.load(open(os.path.join(HERE, "テキスト設定.json"), encoding="utf-8"))
    shutil.rmtree(OUT, ignore_errors=True)
    for sub in ("00_白スクリム", "01_タイトル", "02_キャプション", "03_エンドカード",
                "04_白フラッシュ", "05_オープニングワイプ", "06_カラーフレーム"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)

    n = 0
    make_scrim().save(os.path.join(OUT, "00_白スクリム", "白スクリム.png")); n += 1
    make_title(cfg).save(os.path.join(OUT, "01_タイトル", "タイトル.png")); n += 1

    caps = [(k, v) for k, v in cfg["キャプション"].items() if not k.startswith("_")]
    for cut, (date, place) in sorted(caps, key=lambda kv: int(kv[0])):
        img = make_caption(date, place)
        if img:
            img.save(os.path.join(OUT, "02_キャプション", "cut%02d.png" % int(cut))); n += 1

    make_endcard(cfg).save(os.path.join(OUT, "03_エンドカード", "エンドカード.png")); n += 1
    make_flash().save(os.path.join(OUT, "04_白フラッシュ", "白フラッシュ.png")); n += 1

    for i, fr in enumerate(make_opening_wipe()):
        fr.save(os.path.join(OUT, "05_オープニングワイプ", "wipe_%04d.png" % i)); n += 1
    for i, fr in enumerate(make_color_frame()):
        fr.save(os.path.join(OUT, "06_カラーフレーム", "frame_%04d.png" % i)); n += 1

    print("書き出し %d ファイル → %s" % (n, OUT))


if __name__ == "__main__":
    main()
