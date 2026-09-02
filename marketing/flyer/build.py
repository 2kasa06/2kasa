# -*- coding: utf-8 -*-
import pathlib, base64
from content import *

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "images"
JPG = pathlib.Path(__file__).resolve().parent / "img"   # 印刷用にリサイズ済み（resize.mjs）

def img(name):
    """印刷解像度にリサイズした JPEG があればそれを、無ければ元の webp を埋め込む"""
    j = JPG / name.replace(".webp", ".jpg")
    if j.exists():
        return "data:image/jpeg;base64," + base64.b64encode(j.read_bytes()).decode()
    return "data:image/webp;base64," + base64.b64encode((SRC / name).read_bytes()).decode()

RING = ('<svg class="{cls}" viewBox="0 0 800 400" fill="none" preserveAspectRatio="xMidYMid slice">'
        '<circle cx="140" cy="150" r="120" stroke="{c}" stroke-width="1"/>'
        '<circle cx="140" cy="150" r="200" stroke="{c}" stroke-width=".6"/>'
        '<path d="M 0 320 Q 200 220 400 270 T 800 160" stroke="{c}" stroke-width="1" fill="none"/>'
        '<circle cx="660" cy="330" r="80" stroke="{c}" stroke-width=".8"/></svg>')

stages = "".join(
    f'<div class="stage"><img src="{img(f)}" alt=""><div class="stage__ov"></div>'
    f'<div class="stage__tx"><div class="stage__en">{en}</div>'
    f'<div class="stage__r">{r}</div><div class="stage__c">{c}</div></div></div>'
    for r, en, c, f in STAGES)

services = "".join(
    f'<div class="svc"><div class="svc__i">{i}</div>'
    f'<div class="svc__t">{t}</div><div class="svc__d">{d}</div></div>'
    for i, t, d in SERVICES)

flow = "".join(
    f'<div class="step"><div class="step__n">{n}</div>'
    f'<div class="step__t">{t}</div><div class="step__d">{d}</div></div>'
    for n, t, d in FLOW)

prices = "".join(
    f'<div class="price"><div><div class="price__n">{n}</div>'
    f'<div class="price__s">{note}</div></div>'
    f'<div class="price__v num">{v}<span>{suf}</span></div></div>'
    for n, v, suf, note in PRICES)

voices = "".join(
    f'<div class="voice"><div class="voice__t">「{t}」</div>'
    f'<div class="voice__m"><b>{who}</b><i>{svc}</i></div></div>'
    for who, svc, t in VOICES)
voices = f'<div class="voices">{voices}</div>' 

body = f"""
<div class="sheet">

  <section class="hero">
    <img class="hero__img" src="{img('hero-illustration.webp')}" alt="">
    <div class="hero__veil"></div>
    {RING.format(cls="hero__ring", c="#C08578")}
    <div class="hero__in">
      <div class="brand">
        <img class="brand__mark" src="{img('logo-mark.webp')}" alt="">
        <div class="brand__tx"><div class="n">{BRAND}</div>
        <div class="s">BEAUTY&nbsp;&amp;&nbsp;LIFE&nbsp;PRODUCE</div></div>
      </div>
      <div class="label">Your Story Begins Here</div>
      <h1>{CATCH_1}<br><em>{CATCH_2}</em></h1>
      <p class="lead">{LEAD}</p>
      <div class="hero__msg">
        <b>{BRAND_MSG_1}</b><em>{BRAND_MSG_2}</em><br>{BRAND_MSG_P}
      </div>
    </div>
  </section>

  <section class="sec stages">
    <div class="sec__h">
      <div class="label label--c">Your Life Stage</div>
      <h2>あなたのステージを選んでください</h2>
    </div>
    <div class="stage__grid">{stages}</div>
  </section>

  <section class="sec">
    <div class="sec__h">
      <div class="label label--c">Our Services</div>
      <h2>提供サービス</h2>
    </div>
    <div class="svc__grid">{services}</div>
  </section>

  <section class="sec flow">
    <div class="sec__h">
      <div class="label label--c">How It Works</div>
      <h2>ご利用の流れ</h2>
    </div>
    <div class="flow__grid">{flow}</div>
  </section>

  <section class="sec">
    <div class="two">
      <div>
        <div class="blk__h">Price</div>
        {prices}
      </div>
      <div>
        <div class="blk__h">Voice</div>
        {voices}
      </div>
    </div>
  </section>

  <section class="cta">
    {RING.format(cls="cta__ring", c="#ffffff")}
    <div class="cta__in">
      <div class="cta__l">
        <div class="cta__k">Reservation</div>
        <div class="cta__t">{CTA_TITLE}</div>
        <div class="cta__s">{CTA_SUB}</div>
      </div>
      <div class="freebox"><small>{FREE_K}</small><strong>{FREE_V}</strong></div>
    </div>
    <div class="ctbar">
      <div class="ct"><span class="ct__k">TEL</span><span class="ct__v">{CONTACT_TEL}</span></div>
      <div class="ct"><span class="ct__k">MAIL</span><span class="ct__v">{CONTACT_MAIL}</span></div>
      <div class="ct"><span class="ct__k">INSTA</span><span class="ct__v">{CONTACT_INSTA}</span></div>
      <div class="ct"><span class="ct__k">WEB</span><span class="ct__v">{CONTACT_WEB}</span></div>
    </div>
    <div class="notes">{NOTES}</div>
  </section>

</div>
"""

pathlib.Path("body.html").write_text(body, encoding="utf-8")

fonts = pathlib.Path("fonts.css")
fonts_css = fonts.read_text(encoding="utf-8") if fonts.exists() else ""
style = pathlib.Path("style.css").read_text(encoding="utf-8")

html = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>Beauty Produce チラシ</title>
<style>{fonts_css}</style>
<style>{style}</style>
</head><body>{body}</body></html>"""
pathlib.Path("flyer.html").write_text(html, encoding="utf-8")
print("body.html / flyer.html  ->", len(html) // 1024, "KB")
