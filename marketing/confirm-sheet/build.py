# -*- coding: utf-8 -*-
"""オーナー様への確認・ご依頼事項シート（A4 1枚）"""
import pathlib

def opts(*labels):
    return '<div class="opts">' + "".join(
        f'<span class="opt"><i></i>{l}</span>' for l in labels) + '</div>'

def line(k, half=False):
    cls = "line line--half" if half else "line"
    return f'<div class="{cls}"><span class="line__k">{k}</span><span class="line__v"></span></div>'

def lines(*ks):
    return "".join(line(k) for k in ks)

ITEMS = [
    ("01", "さくらインターネットのアカウントは残っていますか", "確認",
     "サイトをどこで公開するかの判断につながります。"
     "<b>さくらを使う場合は WordPress 版</b>、使わない場合は<b>現在のNetlify版（React）</b>での運用になります。",
     opts("残っている", "解約済み", "わからない")
     + line("契約プラン・ドメイン名など（分かる範囲で）")),

    ("02", "（01が「残っている」場合）ログイン情報のお渡し", "確認",
     '<span class="warn">※ ID・パスワードはこの用紙に書かないでください。</span>'
     "紛失・第三者の目に触れるリスクがあります。下記のいずれかの方法でお願いします。",
     opts("パスワード管理ツールで共有", "メッセージで個別に送る", "対面で口頭", "その他")),

    ("03", "サンプル協力者様のビフォーアフター写真", "ご用意",
     "現在サイトに入っているビフォーアフター写真は<b>仮のフリー素材</b>です。"
     "実際の写真に差し替えます。撮影データ（できるだけ加工前）をお預けください。",
     opts("本人の掲載許諾を取得済み（書面またはメッセージ）")
     + '<div class="line"><span class="line__k">枚数　Before</span><span class="line__v"></span>'
       '<span class="line__k">After</span><span class="line__v"></span>'
       '<span class="line__k">お渡し方法</span><span class="line__v"></span></div>'),

    ("04", "サイト名をどうしますか", "要決定",
     "現在は「<b>Beauty Produce</b>」で作っています。変更する場合、"
     "ドメイン名・ロゴ・チラシ・見積書の表記にも影響します。",
     opts("このまま Beauty Produce で進める", "変更する")
     + line("変更する場合の新しい名称")),

    ("05", "サイトにロゴは必要ですか", "要決定",
     "現在はヒーロー左上に仮のロゴマーク（水彩の花のマーク）が入っています。",
     opts("今のロゴマークを使う", "新しく作りたい", "文字だけでよい（ロゴなし）")),

    ("06", "診断アプリは本当に必要ですか", "要決定",
     "紙の診断シート（A4・1枚）はすでに完成しています。"
     "同じ内容を<b>Web上で回答できるアプリ</b>にするかどうかの判断です。"
     "作る場合は制作費・工期が別途かかります。",
     opts("アプリが必要", "紙のままでよい", "迷っている・相談したい")
     + line("紙でやりにくいと感じている点があれば")),

    ("07", "診断アプリを元にした「結果用紙」は必要ですか", "要決定",
     "06で「アプリが必要」の場合のみ。回答内容から自動で結果シートを作り、"
     "その場で印刷してお客様にお渡しする仕組みです（サンプルは作成済み）。",
     opts("必要", "不要", "06が決まってから判断")),
]

items_html = "".join(
    f'<div class="item"><div class="item__no mono">{no}</div><div>'
    f'<div class="item__t">{title}<em>{tag}</em></div>'
    f'<div class="item__d">{desc}</div>'
    f'<div class="ans">{ans}</div>'
    f'</div></div>'
    for no, title, tag, desc, ans in ITEMS)

body = f"""
<div class="sheet">

  <header class="head">
    <div class="head__l">
      <div class="head__brand mono">Beauty Produce / Website Project</div>
      <h1>確認・ご依頼事項</h1>
      <div class="head__sub">ウェブサイト制作を進めるにあたり、オーナー様にご確認・ご用意いただきたい項目です。</div>
    </div>
    <div class="head__r">
      <div class="fld"><span class="fld__k">ご記入日</span><span class="fld__v"></span></div>
      <div class="fld"><span class="fld__k">ご記入者</span><span class="fld__v"></span></div>
    </div>
  </header>

  <section class="sec">
    <div class="sec__h">
      <span class="sec__tag mono">OWNER</span>
      <span class="sec__t">オーナー様にご対応いただきたいこと</span>
      <span class="sec__n mono">7件</span>
    </div>
    {items_html}
  </section>

  <section class="sec">
    <div class="sec__h">
      <span class="sec__tag mono">STUDIO</span>
      <span class="sec__t">制作側で対応すること</span>
      <span class="sec__n mono">1件</span>
    </div>
    <div class="made">
      <div class="item"><div class="item__no mono">08</div><div>
        <div class="item__t">お客様の感想コメントを、オーナー様が自分で投稿・編集できるようにする</div>
        <div class="item__d">お客様の声は載せたほうがよいので、制作側に頼まなくても管理画面から追加・修正・削除できる形に整えます。</div>
        <div class="st">
          <span class="st__k">WORDPRESS</span>
          <span class="st__v"><b>対応済み</b>。管理画面の「お客様の声」からお名前・年齢・利用サービス・評価・本文を入力するだけで、サイトに反映されます（ビフォーアフター・サービス・よくあるご質問も同じ形です）。</span>
          <span class="st__k">NETLIFY</span>
          <span class="st__v">現在公開中のReact版は<b>コードに直接書かれている</b>ため、更新のたびに制作側の作業が必要です。こちらで運用する場合は、投稿できる仕組みを別途組みます。</span>
          <span class="st__k">NEXT</span>
          <span class="st__v">01でどちらを使うかが決まり次第、投稿手順書（画面キャプチャ付き）をお渡しします。</span>
        </div>
      </div></div>
    </div>
  </section>

  <footer class="foot">
    <div class="foot__l">
      ご不明な点は空欄のままで構いません。打ち合わせのときに一緒に埋めていきます。<br>
      04・05・06 が決まると、残りの制作範囲と費用が確定します。
    </div>
    <div class="foot__r">
      <div class="fld"><span class="fld__k">ご返信期限</span><span class="fld__v"></span></div>
      <div class="fld"><span class="fld__k">返信先</span><span class="fld__v"></span></div>
    </div>
  </footer>

</div>
"""

pathlib.Path("body.html").write_text(body, encoding="utf-8")
fonts = pathlib.Path("fonts.css")
fonts_css = fonts.read_text(encoding="utf-8") if fonts.exists() else ""
style = pathlib.Path("style.css").read_text(encoding="utf-8")
pathlib.Path("sheet.html").write_text(
    f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>確認・ご依頼事項</title>
<style>{fonts_css}</style><style>{style}</style>
</head><body>{body}</body></html>""", encoding="utf-8")
print("built")
