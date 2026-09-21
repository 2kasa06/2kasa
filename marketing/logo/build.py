# -*- coding: utf-8 -*-
"""Evea ロゴ提案書（A4 2ページ）"""
import pathlib
import marks

ROSE, DEEP, INK, GOLD = "#C08578", "#A5645A", "#463229", "#C9A96A"
SUB = "TOTAL BEAUTY SCHOOL"
JP  = "トータルビューティースクール エヴァ"

# ── 4つの案 ────────────────────────────────
def lock_a(scale=1.0, color=ROSE, ink=INK, sub_color=None):
    s = sub_color or DEEP
    return (f'<div class="lock"><div class="lk-mark">{marks.quatrefoil(int(40*scale), color, 1.9)}</div>'
            f'<div class="lk-name lk-name--cor" style="color:{ink};font-size:{30*scale}pt">Evea</div>'
            f'<div class="lk-hr" style="background:{color}"></div>'
            f'<div class="lk-sub" style="color:{s}">{SUB}</div></div>')

def lock_b():
    return ('<div class="lock">'
            f'<div class="lk-mark">{marks.vesica(50, ROSE, 1.7)}</div>'
            '<div class="lk-name lk-name--ita">EVEA</div>'
            '<div class="lk-sub lk-sub--ink">' + SUB + '</div></div>')

def lock_c():
    return ('<div class="lock">'
            f'<div class="lk-mark">{marks.rule(48, ROSE, 0.8)}</div>'
            '<div class="lk-name lk-name--cori">Evea</div>'
            '<div class="lk-sub">' + SUB + '</div>'
            f'<div class="lk-jp">{JP}</div></div>')

def lock_d():
    return ('<div class="lock">'
            f'<div class="lk-mark">{marks.arch(46, DEEP, 1.8)}</div>'
            '<div class="lk-name lk-name--jost">EVEA</div>'
            '<div class="lk-hr lk-hr--wide"></div>'
            '<div class="lk-sub lk-sub--ink">' + SUB + '</div></div>')

CARDS = [
    ("案A", True,  "四弁の花 ＋ セリフ",  "Cormorant Garamond Light",
     "花を真上から見た形。左右上下に対称なのでファビコンや箔押しでも形が崩れません。今のサイトの雰囲気をそのまま引き継げます。",
     lock_a()),
    ("案B", False, "つぼみ ＋ 細字ローマン", "Italiana",
     "これから咲くつぼみ。字間を大きく開けた大文字と合わせて、静かで品のある印象になります。",
     lock_b()),
    ("案C", False, "マークなし・筆記体寄り", "Cormorant Garamond Light Italic",
     "図形を持たないワードマーク。名前そのものを見せるので迷いがなく、名刺やチラシの隅にも小さく置けます。",
     lock_c()),
    ("案D", False, "アーチ（鏡）＋ 幾何学サンセリフ", "Jost Light",
     "ドレッサーの鏡がモチーフ。直線的な書体と合わせると「学校」らしい端正さが出ます。",
     lock_d()),
]

cards = "".join(
    f'<div class="card"><div class="card__stage">{lock}</div><div class="card__b">'
    f'<span class="card__tag {"card__tag--rec" if rec else ""} mono">{tag}{"　おすすめ" if rec else ""}</span>'
    f'<div class="card__t">{title}</div>'
    f'<div class="card__f">{face}</div>'
    f'<div class="card__d">{desc}</div></div></div>'
    for tag, rec, title, face, desc, lock in CARDS)

# ── 大文字・小文字の比較 ──────────────────
CASES = [
    ("EVEA", "TOTAL BEAUTY SCHOOL", "すべて大文字", False,
     "いちばん堂々として見えます。ただし字面が四角くなるので、字間を広げないと詰まって読みにくくなります。"),
    ("Evea", "Total Beauty School", "頭だけ大文字", True,
     "読みやすさと品のバランスが一番よく、E の縦線と e の丸みで形にリズムが出ます。小さくしても潰れません。"),
    ("evea", "total beauty school", "すべて小文字", False,
     "やわらかく今っぽい印象。ただし固有名詞に見えにくく、文章の中に置くと名前として拾われにくくなります。"),
]
cases = "".join(
    f'<div class="case"><div class="case__s"><div class="w">{w}</div><div class="s">{s}</div></div>'
    f'<div><div class="case__t">{t}{"<em>おすすめ</em>" if rec else ""}</div>'
    f'<div class="case__d">{d}</div></div></div>'
    for w, s, t, rec, d in CASES)

# ── 展開 ───────────────────────────────────
VARS = [
    ("var__s--l", lock_a(0.62), "基本（カラー）", "白〜アイボリーの背景で使う基本形。"),
    ("var__s--m", lock_a(0.62, INK, INK, INK), "モノクロ", "FAXや1色印刷、判子のとき。"),
    ("var__s--d", lock_a(0.62, "#FFFFFF", "#FFFFFF", "#F4DED8"), "白抜き", "濃い色の上に置くとき。"),
]
vars_html = "".join(
    f'<div class="var"><div class="var__s {cls}">{lock}</div>'
    f'<div class="var__c"><div class="var__t">{t}</div><div class="var__d">{d}</div></div></div>'
    for cls, lock, t, d in VARS)

PAL = [("Rose Beige", ROSE), ("Deep Rose", DEEP), ("Warm Brown", INK),
       ("Gold", GOLD), ("Warm White", "#FDFAF6")]
pal = "".join(
    f'<div><div class="sw__c" style="background:{h}"></div>'
    f'<div class="sw__n">{n}</div><div class="sw__h">{h}</div></div>' for n, h in PAL)

body = f"""
<div class="page">
  <header class="head">
    <div class="head__k mono">Logo Proposal</div>
    <h1>ロゴのご提案</h1>
    <div class="head__s">Total Beauty School Evea ／ トータルビューティースクール エヴァ</div>
    <div class="head__n">4案ご用意しました。まずは方向性をお選びください。決まった案を、実際に使えるデータ一式に仕上げます。</div>
  </header>
  <div class="grid">{cards}</div>
  <footer class="foot">
    どの案も図形と文字だけで作っているため、名刺サイズまで小さくしても、看板まで大きくしても劣化しません。<br>
    書体はすべて商用利用・ロゴ利用が許可されているもの（SIL Open Font License）を使っています。
  </footer>
</div>

<div class="page">
  <header class="head">
    <div class="head__k mono">Options &amp; Usage</div>
    <h1>大文字・小文字と、使い方</h1>
    <div class="head__s">お悩みだった「大文字でいくか、小文字でいくか」の比較です。</div>
  </header>

  <section class="sec">
    <div class="sec__t">大文字・小文字の比較</div>
    <div class="cases">{cases}</div>
  </section>

  <section class="sec">
    <div class="sec__t">おすすめ案の展開（案A）</div>
    <div class="sec__n">どの案を選んでも、この3種類はセットでお渡しします。</div>
    <div class="vars">{vars_html}</div>
  </section>

  <section class="sec">
    <div class="sec__t">色</div>
    <div class="pal">{pal}</div>
  </section>

  <section class="sec">
    <div class="sec__t">使うときの目安</div>
    <div class="notes">
      <div class="note"><b>小さくするとき</b>マークだけなら 8mm 角、名前まで入れるなら横 25mm を下限にしてください。それより小さいときはマークだけを使います。</div>
      <div class="note"><b>まわりの余白</b>ロゴの高さの半分ぶんは、まわりに何も置かないでください。文字や写真が近すぎると読みにくくなります。</div>
      <div class="note"><b>やらないこと</b>縦横の比率を変える、影をつける、色を変える、書体を置き換える。この4つだけ避ければ崩れません。</div>
      <div class="note"><b>お渡しするデータ</b>SVG（Web用）・PNG（背景透過）・PDF（印刷入稿用）。カラー／モノクロ／白抜きの3種類ぶんをまとめてお渡しします。</div>
    </div>
  </section>

  <footer class="foot">
    案が決まりましたら、細かい字間やマークの線の太さを詰めて仕上げます。<br>
    「案Aのマークに案Cの文字を合わせたい」といった組み替えもできますので、気になる部分をお聞かせください。
  </footer>
</div>
"""

pathlib.Path("body.html").write_text(body, encoding="utf-8")
fonts = pathlib.Path("fonts.css")
fonts_css = fonts.read_text(encoding="utf-8") if fonts.exists() else ""
style = pathlib.Path("style.css").read_text(encoding="utf-8")
pathlib.Path("logo.html").write_text(
    f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>Evea ロゴのご提案</title>
<style>{fonts_css}</style><style>{style}</style>
</head><body>{body}</body></html>""", encoding="utf-8")
print("built")
