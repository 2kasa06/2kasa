#!/usr/bin/env node
// 収集 → 本文抽出 → 要約 → HTML生成までを、ローカルに立てた偽サイト相手に通す。
// 外部ネットワークを使わないので CI でもそのまま走る。
//
//   node news/selftest.mjs

import http from 'node:http'
import assert from 'node:assert/strict'

import { collectArticles, enrichArticles, matchesTheme } from './lib/collect.mjs'
import { summarizeArticles } from './lib/summarize.mjs'
import { renderIndex, renderDay, renderArchiveIndex, dayKey } from './lib/render.mjs'
import { mergeArchive } from './lib/store.mjs'
import { buildStats } from './lib/stats.mjs'
import { parseFeed, stripHtml } from './lib/feed.mjs'
import { detectRegion, assignRegions } from './lib/region.mjs'
import { regions as mapRegions } from './lib/japan-map.mjs'
import { regionKeywords } from './config.mjs'

const iso = (offsetHours) => new Date(Date.now() - offsetHours * 3600_000).toISOString()

const bodyPage = (paragraphs) => `<!DOCTYPE html><html><head><title>x</title>
<script>var junk = "これはスクリプトなので本文ではない";</script></head>
<body><nav>メニュー</nav><article>
${paragraphs.map((p) => `<p>${p}</p>`).join('\n')}
<p>短い</p></article><footer>フッター</footer></body></html>`

// URL ごとに違う本文を返す。同じ本文を使い回すと、カテゴリ推定の検証が
// 本文ではなくフィクスチャの偶然に引きずられる。
const ARTICLE_BODIES = {
  mage: [
    '九州防衛局は3日、鹿児島県西之表市の馬毛島で8月に実施する自衛隊基地の工事作業予定を公表した。',
    '滑走路2本の造成工事を継続するほか、F-35B用の模擬艦艇発着艦訓練施設の整備に着手する。',
    '総事業費は約4800億円を見込み、2027年度の完成を目指すとしている。',
  ],
  nyusatsu: [
    '沖縄防衛局は、キャンプ内の隊舎整備工事について一般競争入札の公告を行った。',
    '予定価格は約12億円で、開札は来月下旬を予定している。',
    '同局は今年度、同種の建築工事を複数件発注する見込みだと説明した。',
  ],
  kayakuko: [
    '防衛省は、陸上自衛隊駐屯地に整備する火薬庫について、地元住民への説明会を開くと発表した。',
    '離隔距離の確保のため用地を取得する方針で、環境影響評価の手続きも並行して進める。',
    '自治体は安全対策の具体的な説明を求めている。',
  ],
}

function makeFeeds() {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>専門紙</title>
<item>
  <title><![CDATA[馬毛島基地、8月の工事作業予定を九州防衛局が公表]]></title>
  <link>http://127.0.0.1:PORT/article/mage</link>
  <pubDate>${new Date(Date.parse(iso(5))).toUTCString()}</pubDate>
  <description>&lt;p&gt;九州防衛局が&lt;b&gt;工事作業予定&lt;/b&gt;を公表。滑走路の造成を継続する。&lt;/p&gt;</description>
</item>
<item>
  <title>沖縄防衛局、キャンプ内の隊舎整備工事を一般競争入札で公告</title>
  <link>http://127.0.0.1:PORT/article/nyusatsu</link>
  <pubDate>${new Date(Date.parse(iso(20))).toUTCString()}</pubDate>
  <description>予定価格は約12億円。</description>
</item>
<item>
  <title>市内の歩道橋、老朽化で架け替えへ</title>
  <link>http://127.0.0.1:PORT/article/hodokyo</link>
  <pubDate>${new Date(Date.parse(iso(9))).toUTCString()}</pubDate>
  <description>市は歩道橋の架け替え工事を来年度に着工すると発表した。</description>
</item>
<item>
  <title>去年のニュース</title>
  <link>http://127.0.0.1:PORT/article/old</link>
  <pubDate>${new Date(Date.now() - 400 * 864e5).toUTCString()}</pubDate>
  <description>自衛隊駐屯地の話だが古い。</description>
</item>
</channel></rss>`

  // 同じ記事を別経路でも配信して、重複除去が効くか見る
  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>総合紙</title>
<entry>
  <title>馬毛島基地、8月の工事作業予定を九州防衛局が公表</title>
  <link rel="self" href="http://127.0.0.1:PORT/self"/>
  <link rel="alternate" href="http://127.0.0.1:PORT/article/mage?utm=1"/>
  <updated>${iso(4)}</updated>
  <summary type="html">&lt;div&gt;別媒体による同一記事&lt;/div&gt;</summary>
</entry>
<entry>
  <title>陸自駐屯地の火薬庫整備、地元説明会を開催へ</title>
  <link rel="alternate" href="http://127.0.0.1:PORT/article/kayakuko"/>
  <updated>${iso(30)}</updated>
  <summary>防衛省は住民説明会を開くと発表した。</summary>
</entry>
</feed>`

  return { rss, atom }
}

async function withServer(run) {
  const { rss, atom } = makeFeeds()
  const server = http.createServer((req, res) => {
    const port = server.address().port
    const send = (status, type, body) => {
      res.writeHead(status, { 'content-type': type })
      res.end(body)
    }
    if (req.url === '/feed/rss') return send(200, 'application/rss+xml', rss.replaceAll('PORT', port))
    if (req.url === '/feed/atom') return send(200, 'application/atom+xml', atom.replaceAll('PORT', port))
    if (req.url === '/feed/broken') return send(200, 'text/html', '<html>フィードではない</html>')
    if (req.url === '/feed/404') return send(404, 'text/plain', 'nope')
    if (req.url.startsWith('/article/')) {
      const slug = req.url.split('/')[2].split('?')[0]
      const paragraphs = ARTICLE_BODIES[slug]
      if (!paragraphs) return send(404, 'text/plain', 'nope')
      return send(200, 'text/html', bodyPage(paragraphs))
    }
    return send(404, 'text/plain', 'nope')
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    return await run(port)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

let failures = 0
function check(label, fn) {
  try {
    fn()
    console.log(`  ✓ ${label}`)
  } catch (err) {
    failures++
    console.error(`  ✗ ${label}\n    ${err.message}`)
  }
}

await withServer(async (port) => {
  const base = `http://127.0.0.1:${port}`
  const testSources = [
    { id: 'pro', name: '専門紙', kind: 'rss', hint: '専門', urls: [`${base}/feed/404`, `${base}/feed/rss`] },
    { id: 'gen', name: '総合紙', kind: 'rss', hint: '総合', urls: [`${base}/feed/atom`] },
    { id: 'dead', name: '死んでいる情報源', kind: 'rss', hint: '', urls: [`${base}/feed/broken`] },
  ]

  console.log('\nフィード解析')
  check('壊れた応答をフィードとして受け付けない', () => {
    assert.equal(parseFeed('<html>nope</html>').ok, false)
  })
  check('エスケープされたHTMLをテキストに戻す', () => {
    assert.equal(stripHtml('&lt;p&gt;本文&lt;/p&gt;'), '本文')
  })

  console.log('\n収集')
  const { articles, status } = await collectArticles(testSources, { now: new Date() })
  const titles = articles.map((a) => a.title)

  check('候補URLの1つ目が404でも2つ目で拾える', () => {
    assert.equal(status.find((s) => s.id === 'pro').ok, true)
  })
  check('フィードでない情報源は失敗として記録される', () => {
    const dead = status.find((s) => s.id === 'dead')
    assert.equal(dead.ok, false)
    assert.match(dead.note, /読めない|項目が0件/)
  })
  check('防衛と無関係な記事（歩道橋）は入らない', () => {
    assert.equal(titles.some((t) => t.includes('歩道橋')), false)
  })
  check('期間外の古い記事は入らない', () => {
    assert.equal(titles.some((t) => t.includes('去年')), false)
  })
  check('別媒体の同一記事は1件に統合される', () => {
    const dupes = titles.filter((t) => t.includes('馬毛島'))
    assert.equal(dupes.length, 1)
    const merged = articles.find((a) => a.title.includes('馬毛島'))
    assert.equal(merged.pickups, 2, `pickups=${merged.pickups}`)
    assert.equal(merged.via.length, 2, `via=${merged.via}`)
  })
  check('総合紙からも防衛施設の記事は拾える', () => {
    assert.ok(titles.some((t) => t.includes('火薬庫')), titles.join(' / '))
  })
  check('新しい順に並ぶ', () => {
    const times = articles.map((a) => new Date(a.publishedAt).getTime())
    assert.deepEqual(times, [...times].sort((a, b) => b - a))
  })

  console.log('\n本文取得')
  await enrichArticles(articles)
  const mage = articles.find((a) => a.title.includes('馬毛島'))
  check('記事ページから本文を取り出す', () => {
    assert.ok(mage.hasBody, '本文が取れていない')
    assert.match(mage.body, /総事業費は約4800億円/)
  })
  check('scriptタグやナビの文言を本文に混ぜない', () => {
    assert.doesNotMatch(mage.body, /これはスクリプト|メニュー|フッター/)
  })
  check('短すぎる段落は落とす', () => {
    assert.doesNotMatch(mage.body, /^短い$/m)
  })

  console.log('\n要約')
  const { articles: summarized, engine } = await summarizeArticles(articles)
  check('全記事に3行の要約が付く', () => {
    for (const a of summarized) {
      assert.equal(a.summary.length, 3, `${a.title}: ${a.summary?.length}行`)
      assert.ok(a.category, `${a.title}: カテゴリ無し`)
    }
  })
  check('カテゴリ推定が妥当（馬毛島 → 南西諸島）', () => {
    assert.equal(mage.category, 'nansei')
  })
  check('入札記事は発注カテゴリに入る', () => {
    const nyusatsu = summarized.find((a) => a.title.includes('入札'))
    assert.equal(nyusatsu.category, 'chotatsu')
  })

  console.log('\nアーカイブ')
  check('2回目の実行で新着が出ない（要約を作り直さない）', () => {
    const { fresh } = mergeArchive(summarized, summarized.map((a) => ({ ...a })))
    assert.equal(fresh.length, 0)
  })

  console.log('\n地方の判定')
  check('施設名から地方を当てる', () => {
    const cases = [
      ['馬毛島の基地建設、九州防衛局が工事予定を公表', 'kyushu'],
      ['岩国基地の滑走路改修が完了', 'chugoku'],
      ['善通寺駐屯地の隊舎建て替え', 'shikoku'],
      ['舞鶴の岸壁を延伸', 'kinki'],
      ['三沢基地の格納庫を新設', 'tohoku'],
      ['千歳基地の誘導路を改修', 'hokkaido'],
      ['市ヶ谷の庁舎を改修', 'kanto'],
      ['浜松基地の格納庫を更新', 'chubu'],
    ]
    for (const [title, expected] of cases) {
      assert.equal(detectRegion({ title, summary: [] }), expected, title)
    }
  })
  check('防衛省の所在地として東京が出るだけでは関東にしない', () => {
    // 「辺野古」（施設名・重み3）が「東京」（地名・重み1）に勝つ
    assert.equal(
      detectRegion({ title: '辺野古の地盤改良、防衛省が東京で会見', summary: ['沖縄防衛局が説明'] }),
      'okinawa',
    )
  })
  check('全国の話は地方を決めない', () => {
    assert.equal(detectRegion({ title: '防衛省、施設整備費を12%増で概算要求', summary: [] }), null)
  })
  check('決め手が同点なら地方を決めない', () => {
    // 「浜松」と「舞鶴」がどちらも重み3で並ぶ
    assert.equal(detectRegion({ title: '浜松と舞鶴で同時に工事', summary: [] }), null)
  })
  check('既に地方が付いている記事は上書きしない', () => {
    const kept = [{ title: '馬毛島の工事', region: null }]
    assignRegions(kept)
    assert.equal(kept[0].region, null)
  })

  console.log('\n地図データ')
  check('地図の地方IDと判定キーワードのIDが一致する', () => {
    assert.deepEqual(mapRegions.map((r) => r.id).sort(), Object.keys(regionKeywords).sort())
  })
  check('パスが絶対座標になっている', () => {
    // 相対パスのまま連結すると2県目以降がずれる。生成時に絶対化している。
    for (const region of mapRegions) {
      assert.doesNotMatch(region.d, /[mlhvcsqtaz]/, `${region.label} に相対コマンドが残っている`)
      assert.match(region.d, /^M/, `${region.label} が M で始まっていない`)
    }
  })
  check('ピンが地方の外接矩形の中に収まる', () => {
    for (const region of mapRegions) {
      const [x, y] = region.pin
      assert.ok(x >= region.box.x && x <= region.box.x + region.box.w, `${region.label} のピンX`)
      assert.ok(y >= region.box.y && y <= region.box.y + region.box.h, `${region.label} のピンY`)
    }
  })

  console.log('\nHTML生成')
  const meta = { updatedAt: new Date().toISOString(), engine, sourcesOk: 2, sourcesTotal: 3, status }
  const stats = buildStats({ recent: summarized, archived: summarized, status, freshCount: 2 })
  const html = renderIndex({ articles: summarized, digest: ['要点テスト'], status, meta, stats })
  check('記事がカードとして出力される', () => {
    assert.equal((html.match(/<article class="card/g) || []).length, summarized.length)
  })
  check('HTMLがエスケープされる', () => {
    const evil = [{
      ...mage,
      title: '<img src=x onerror=alert(1)>',
      summary: ['"><script>bad()</script>', 'b', 'c'],
      why: "</a><svg onload=alert(2)>",
      publisher: '<b>媒体</b>',
    }]
    const out = renderIndex({ articles: evil, digest: [], status: [], meta, stats })
    const page = out.slice(out.indexOf('<body>'))
    // 注入した文字列が「生のタグ」として出ていないこと。
    // HUD 自体が <svg> を含み、無害化済みのテキストにも onerror= という
    // 文字列は現れるので、タグ名やイベント属性の総当たりでは判定できない。
    // 注入した当の文字列が raw で出ていないかを直接見る。
    for (const raw of ['<img src=x', '<svg onload', '<script>bad', '</a><svg', '<b>媒体']) {
      assert.ok(!page.includes(raw), `${raw} が素通し`)
    }
    // 中身自体は表示されること
    assert.ok(page.includes('&lt;img src=x onerror=alert(1)&gt;'), 'タイトルが消えている')
    assert.ok(page.includes('&lt;script&gt;bad()&lt;/script&gt;'), '要約が消えている')
    assert.ok(page.includes('&lt;svg onload=alert(2)&gt;'), 'why が消えている')
    // 属性値を閉じて抜け出せないこと
    assert.doesNotMatch(page, /data-text="[^"]*"[^>]*onerror/i, '属性から抜け出せている')
  })

  check('日別ページとアーカイブ一覧が組める', () => {
    const day = dayKey(mage.publishedAt)
    assert.match(day, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(renderDay({ day, articles: summarized, meta, stats }).includes('<!DOCTYPE html>'))
    assert.ok(renderArchiveIndex({ days: [{ day, count: 3 }], meta, stats }).includes(`${day}.html`))
  })
  check('記事のある地方にだけピンが立つ', () => {
    const withRegions = summarized.map((a, i) => ({
      ...a,
      region: ['kyushu', 'okinawa', null][i % 3],
    }))
    const s = buildStats({ recent: withRegions, archived: withRegions, status, freshCount: 1 })
    const out = renderIndex({ articles: withRegions, digest: [], status, meta, stats: s })
    const pinned = new Set(
      [...out.matchAll(/class="pin[^"]*"[^>]*data-region="([^"]+)"/g)].map((m) => m[1]),
    )
    const expected = new Set(s.regions.list.filter((r) => r.count > 0).map((r) => r.id))
    assert.deepEqual([...pinned].sort(), [...expected].sort())
    assert.ok(!pinned.has('none'), '地方不明にピンが立っている')
  })
  check('記事カードに地方が入る', () => {
    const withRegion = [{ ...mage, region: 'kyushu', summary: ['a', 'b', 'c'], why: '' }]
    const out = renderIndex({ articles: withRegion, digest: [], status, meta, stats })
    assert.match(out, /data-region="kyushu"/)
  })
  check('カテゴリが欠けた記事も落とさず表示する', () => {
    const orphan = [{ ...mage, category: undefined, summary: ['a', 'b', 'c'], why: '' },
                    { ...mage, key: 'x2', category: '存在しないID', summary: ['a', 'b', 'c'], why: '' }]
    const out = renderIndex({ articles: orphan, digest: [], status: [], meta, stats })
    assert.equal((out.match(/<article class="card/g) || []).length, 2)
    assert.doesNotMatch(out, /data-cat="undefined"/)
    assert.doesNotMatch(out, /data-cat="存在しないID"/)
  })

  check('記事0件でも壊れない', () => {
    const out = renderIndex({ articles: [], digest: [], status: [], meta, stats })
    assert.ok(out.includes('該当する記事はありませんでした'))
  })
})

console.log(failures === 0 ? '\n全項目に合格しました。' : `\n${failures}件が失敗しました。`)
process.exitCode = failures === 0 ? 0 : 1
