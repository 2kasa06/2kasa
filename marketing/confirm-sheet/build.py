# -*- coding: utf-8 -*-
"""オーナー様への確認・お願いシート（A4 1枚・シンプル版）"""
import pathlib

OWNER = [
    ("さくらインターネットのアカウントが<br>残っているか確認",
     "サイトをどこで公開するかがこれで決まります。"),
    ("残っていた場合、ID・パスワードのご共有",
     "※ 紙には書かず、メッセージなどで直接お送りください。"),
    ("サンプル協力者様のビフォーアフター写真",
     "今サイトに入っているのは仮の素材です。実際の写真に差し替えます。"),
    ("サイト名をどうするか",
     "現在は「Beauty Produce」。変えるならドメイン名やロゴにも影響します。"),
    ("サイトにロゴが必要かどうか",
     "今は仮のロゴマークが入っています。新しく作るか、文字だけにするか。"),
    ("診断アプリが必要かどうか", ""),
    ("診断アプリの結果用紙が必要かどうか", ""),
]

STUDIO = [
    ("お客様の感想コメントを、ご自身で<br>投稿・編集できるように調整",
     "WordPressの管理画面から追加・修正できるようにします。"),
    ("ボタンのイラスト8点をデザイン作成",
     "サービス一覧のアイコンです。今は仮の絵文字が入っています。"),
]

def rows(items, start):
    out = []
    for i, (t, d) in enumerate(items, start):
        out.append(
            f'<div class="item"><span class="box"></span>'
            f'<span class="no">{i:02d}</span>'
            f'<div><div class="t">{t}</div>'
            + (f'<div class="d">{d}</div>' if d else '')
            + '</div></div>')
    return "".join(out)

body = f"""
<div class="sheet">

  <header class="head">
    <div class="brand">Beauty Produce</div>
    <h1>サイト公開までにやること</h1>
    <p class="sub">オーナー様に決めていただきたいこと・ご用意いただきたいことと、制作側で進めることの一覧です。</p>
  </header>

  <section class="sec">
    <h2 class="sec__t">オーナー様</h2>
    <div class="rows">{rows(OWNER, 1)}</div>
  </section>

  <section class="sec">
    <h2 class="sec__t sec__t--alt">制作側</h2>
    <p class="sec__n">こちらで進めます。ご対応は不要です。</p>
    <div class="rows">{rows(STUDIO, 8)}</div>
  </section>

  <footer class="foot">
    分からない項目は空欄で構いません。打ち合わせのときに一緒に決めましょう。
  </footer>

</div>
"""

pathlib.Path("body.html").write_text(body, encoding="utf-8")
fonts = pathlib.Path("fonts.css")
fonts_css = fonts.read_text(encoding="utf-8") if fonts.exists() else ""
style = pathlib.Path("style.css").read_text(encoding="utf-8")
pathlib.Path("sheet.html").write_text(
    f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>サイト公開までにやること</title>
<style>{fonts_css}</style><style>{style}</style>
</head><body>{body}</body></html>""", encoding="utf-8")
print("built")
