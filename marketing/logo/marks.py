# -*- coding: utf-8 -*-
"""ロゴマーク（SVG）。すべて線幅と座標だけで描いていて、拡大しても劣化しません。"""

def vesica(size=64, color="#C08578", sw=1.6, seed=True):
    """花のつぼみ／葉の形（縦長のとがった楕円）に、上に小さな粒を置いたマーク。"""
    return f'''<svg viewBox="0 0 100 100" width="{size}" height="{size}" fill="none"
 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M50 16 C72 34 72 62 50 84 C28 62 28 34 50 16 Z"
        stroke="{color}" stroke-width="{sw}" stroke-linejoin="round"/>
  <path d="M50 26 C64 40 64 60 50 74" stroke="{color}" stroke-width="{sw*0.6}" opacity=".55"/>
  {'<circle cx="50" cy="9" r="3.2" fill="'+color+'"/>' if seed else ''}
</svg>'''

def quatrefoil(size=64, color="#C08578", sw=1.6):
    """4枚の花びらを十字に配した抽象の花。ファビコンでも形が残ります。"""
    petal = "M50 50 C62 42 62 26 50 14 C38 26 38 42 50 50 Z"
    rot = "".join(
        f'<path d="{petal}" stroke="{color}" stroke-width="{sw}" stroke-linejoin="round"'
        f' transform="rotate({a} 50 50)"/>' for a in (0, 90, 180, 270))
    return f'''<svg viewBox="0 0 100 100" width="{size}" height="{size}" fill="none"
 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{rot}
  <circle cx="50" cy="50" r="2.4" fill="{color}"/>
</svg>'''

def arch(size=64, color="#C08578", sw=1.6):
    """鏡（ドレッサー）を思わせるアーチ。中の細い線は映り込み。"""
    return f'''<svg viewBox="0 0 100 100" width="{size}" height="{size}" fill="none"
 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M26 88 L26 46 A24 24 0 0 1 74 46 L74 88"
        stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>
  <path d="M36 88 L36 48 A14 14 0 0 1 64 48 L64 88"
        stroke="{color}" stroke-width="{sw*0.55}" opacity=".45"/>
  <path d="M18 88 L82 88" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>
</svg>'''

def rule(width=40, color="#C08578", sw=0.8, dot=True):
    """左右に伸びる細いけい線。中央に小さな菱形。"""
    d = f'<path d="M50 44 L54 50 L50 56 L46 50 Z" fill="{color}"/>' if dot else ""
    return f'''<svg viewBox="0 0 100 100" width="{width}" height="{width}" fill="none"
 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M8 50 L42 50 M58 50 L92 50" stroke="{color}" stroke-width="{sw*2}" stroke-linecap="round"/>
  {d}
</svg>'''
