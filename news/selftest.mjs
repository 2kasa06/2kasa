#!/usr/bin/env node
// 収集 → 本文抽出 → 要約 → HTML生成までを、ローカルに立てた偽サイト相手に通す。
// 外部ネットワークを使わないので CI でもそのまま走る。
//
//   node news/selftest.mjs

import http from 'node:http'
import assert from 'node:assert/strict'

import {
  collectArticles,
  enrichArticles,
  matchesTheme,
  stripSourceSuffix,
  articleKey,
} from './lib/collect.mjs'
import { summarizeArticles } from './lib/summarize.mjs'
import { renderIndex, renderDay, renderArchiveIndex, dayKey } from './lib/render.mjs'
import {
  mergeArchive,
  selectRetryTargets,
  selectResummaryTargets,
  normalizeArchive,
} from './lib/store.mjs'
import { buildStats } from './lib/stats.mjs'
import { parseFeed, stripHtml } from './lib/feed.mjs'
import { detectRegion, assignRegions } from './lib/region.mjs'
import { createResolver } from './lib/resolve.mjs'
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
async function check(label, fn) {
  try {
    await fn()
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
  await check('壊れた応答をフィードとして受け付けない', () => {
    assert.equal(parseFeed('<html>nope</html>').ok, false)
  })
  await check('項目が0件のフィードは故障扱いしない', () => {
    // 検索フィードは該当が無ければ空で返る。稼働率を実態より悪く見せない。
    const empty = parseFeed('<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>')
    assert.equal(empty.ok, true)
    assert.equal(empty.items.length, 0)
  })
  await check('エスケープされたHTMLをテキストに戻す', () => {
    assert.equal(stripHtml('&lt;p&gt;本文&lt;/p&gt;'), '本文')
  })

  console.log('\n収集')
  const { articles, status } = await collectArticles(testSources, { now: new Date() })
  const titles = articles.map((a) => a.title)

  await check('候補URLの1つ目が404でも2つ目で拾える', () => {
    assert.equal(status.find((s) => s.id === 'pro').ok, true)
  })
  await check('フィードでない情報源は失敗として記録される', () => {
    const dead = status.find((s) => s.id === 'dead')
    assert.equal(dead.ok, false)
    assert.match(dead.note, /読めない/)
  })
  await check('防衛と無関係な記事（歩道橋）は入らない', () => {
    assert.equal(titles.some((t) => t.includes('歩道橋')), false)
  })
  await check('期間外の古い記事は入らない', () => {
    assert.equal(titles.some((t) => t.includes('去年')), false)
  })
  await check('別媒体の同一記事は1件に統合される', () => {
    const dupes = titles.filter((t) => t.includes('馬毛島'))
    assert.equal(dupes.length, 1)
    const merged = articles.find((a) => a.title.includes('馬毛島'))
    assert.equal(merged.pickups, 2, `pickups=${merged.pickups}`)
    assert.equal(merged.via.length, 2, `via=${merged.via}`)
  })
  await check('総合紙からも防衛施設の記事は拾える', () => {
    assert.ok(titles.some((t) => t.includes('火薬庫')), titles.join(' / '))
  })
  await check('新しい順に並ぶ', () => {
    const times = articles.map((a) => new Date(a.publishedAt).getTime())
    assert.deepEqual(times, [...times].sort((a, b) => b - a))
  })

  console.log('\n本文取得')
  await enrichArticles(articles)
  const mage = articles.find((a) => a.title.includes('馬毛島'))
  await check('記事ページから本文を取り出す', () => {
    assert.ok(mage.hasBody, '本文が取れていない')
    assert.match(mage.body, /総事業費は約4800億円/)
  })
  await check('scriptタグやナビの文言を本文に混ぜない', () => {
    assert.doesNotMatch(mage.body, /これはスクリプト|メニュー|フッター/)
  })
  await check('短すぎる段落は落とす', () => {
    assert.doesNotMatch(mage.body, /^短い$/m)
  })

  console.log('\n要約')
  const { articles: summarized, engine } = await summarizeArticles(articles)
  await check('全記事に3行の要約が付く', () => {
    for (const a of summarized) {
      assert.equal(a.summary.length, 3, `${a.title}: ${a.summary?.length}行`)
      assert.ok(a.category, `${a.title}: カテゴリ無し`)
    }
  })
  await check('カテゴリ推定が妥当（馬毛島 → 南西諸島）', () => {
    assert.equal(mage.category, 'nansei')
  })
  await check('入札記事は発注カテゴリに入る', () => {
    const nyusatsu = summarized.find((a) => a.title.includes('入札'))
    assert.equal(nyusatsu.category, 'chotatsu')
  })

  console.log('\nアーカイブ')
  await check('2回目の実行で新着が出ない（要約を作り直さない）', () => {
    const { fresh } = mergeArchive(summarized, summarized.map((a) => ({ ...a })))
    assert.equal(fresh.length, 0)
  })

  console.log('\n元URLの解決')
  await check('解決器が無ければGoogleリンクは触らず、本文も取りに行かない', async () => {
    const item = { link: `${base}/article/mage`, isGoogleLink: true, description: '' }
    await enrichArticles([item], { resolver: undefined })
    assert.equal(item.isGoogleLink, true)
    assert.equal(item.hasBody, false, 'リダイレクタのまま本文を取りに行っている')
  })
  await check('解決器が元URLを返せば、その記事の本文を取る', async () => {
    const item = { link: 'https://news.google.com/rss/articles/XXXX', isGoogleLink: true, description: '' }
    const stub = { available: true, resolve: async () => `${base}/article/mage`, close: async () => {} }
    await enrichArticles([item], { resolver: stub })
    assert.equal(item.isGoogleLink, false)
    assert.ok(item.hasBody, '解決したのに本文が取れていない')
    assert.match(item.body, /総事業費は約4800億円/)
  })
  await check('解決に失敗してもリダイレクタのまま落ちない', async () => {
    const item = { link: 'https://news.google.com/rss/articles/XXXX', isGoogleLink: true, description: '' }
    const stub = { available: true, resolve: async () => null, close: async () => {} }
    await enrichArticles([item], { resolver: stub })
    assert.equal(item.isGoogleLink, true)
    assert.equal(item.hasBody, false)
  })
  await check('ブラウザが無い環境では解決器が理由付きで無効になる', async () => {
    const resolver = await createResolver({ timeoutMs: 3000 })
    if (!resolver.available) assert.ok(resolver.reason, '無効なのに理由が無い')
    assert.equal(await resolver.resolve('https://news.google.com/x'), resolver.available ? await resolver.resolve('https://news.google.com/x') : null)
    await resolver.close()
  })

  console.log('\n見出しの整形')
  await check('Googleニュースの「 - 媒体名」を落とす', () => {
    assert.equal(stripSourceSuffix('見出し - 47NEWS', '47NEWS'), '見出し')
    assert.equal(stripSourceSuffix('ハイフン - を含む見出し - 読売新聞', '読売新聞'), 'ハイフン - を含む見出し')
    assert.equal(stripSourceSuffix('媒体名が無い見出し', ''), '媒体名が無い見出し')
    assert.equal(stripSourceSuffix('末尾が違う - A社', 'B社'), '末尾が違う - A社')
  })
  await check('媒体違いの同じ記事が1件にまとまる', () => {
    // 実データで、同じ記事が媒体名の違いだけで4件並んだ
    const a = articleKey(stripSourceSuffix('外局新設を要求 - 47NEWS', '47NEWS'), 'https://a.jp/1')
    const b = articleKey(stripSourceSuffix('外局新設を要求 - Excite エキサイト', 'Excite エキサイト'), 'https://b.jp/2')
    assert.equal(a, b)
  })
  await check('施設と関係ない防衛ニュースは通さない', () => {
    // 実データで誤って通っていたもの
    for (const title of [
      '退職隊員庁、110人規模に 防衛省、外局新設を要求',
      '防衛省、AI指揮統制へ政府クラウド導入 27年度概算要求',
      '防衛事業を再編する企業に国が出資、「継戦能力」確保へ',
    ]) {
      assert.equal(matchesTheme(title).matched, false, title)
    }
  })
  await check('施設の記事は通す', () => {
    for (const title of [
      '馬毛島の自衛隊基地工事に沸く種子島',
      '沖縄防衛局が隊舎整備工事を公告',
      '辺野古の埋立、地盤改良の設計を変更',
      '政府の「特定利用空港・港湾」指定に反対',
    ]) {
      assert.equal(matchesTheme(title).matched, true, title)
    }
  })

  await check('説明文の遠くにある語では通さない', () => {
    // 1項目に複数記事を詰めるフィードで、別記事の防衛語に引っ張られていた。
    // 実際に川崎の冷凍倉庫の記事が入った。
    const head =
      '日本ＧＬＰ／扇島に冷凍冷蔵倉庫群／総延べ３７万平米、投資額３０００億円\n' +
      'ＪＦＥの高炉跡地に大規模物流施設群を段階整備する。保管能力は約55万トン。'.repeat(20)
    assert.ok(head.length > 600, 'この検査には600字を超える材料が要る')
    const withFarAway = `${head}\n沖縄防衛局が隊舎の建設工事を発注`
    assert.equal(matchesTheme(withFarAway.slice(0, 600)).matched, false, '頭600字で通ってしまっている')
    assert.equal(matchesTheme(withFarAway).matched, true, '全文なら通るはずの材料になっていない')
  })

  console.log('\n地方の判定')
  await check('施設名から地方を当てる', () => {
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
  await check('防衛省の所在地として東京が出るだけでは関東にしない', () => {
    // 「辺野古」（施設名・重み3）が「東京」（地名・重み1）に勝つ
    assert.equal(
      detectRegion({ title: '辺野古の地盤改良、防衛省が東京で会見', summary: ['沖縄防衛局が説明'] }),
      'okinawa',
    )
  })
  await check('本文に混ざった地名より見出しを優先する', () => {
    // 実データで、沖縄県知事選の記事が本文に紛れた別速報の「石川県・富山県」に
    // 引きずられて中部と判定された
    assert.equal(
      detectRegion({
        title: '沖縄県知事選6人が立候補 基地負担や経済振興で論戦へ',
        summary: [],
        body: '【気象予報士解説】大雨特別警報 石川県・富山県 名古屋 静岡 長野の情報も',
      }),
      'okinawa',
    )
  })
  await check('全国の話は地方を決めない', () => {
    assert.equal(detectRegion({ title: '防衛省、施設整備費を12%増で概算要求', summary: [] }), null)
  })
  await check('決め手が同点なら地方を決めない', () => {
    // 「浜松」と「舞鶴」がどちらも重み3で並ぶ
    assert.equal(detectRegion({ title: '浜松と舞鶴で同時に工事', summary: [] }), null)
  })
  await check('地方は毎回引き直す', () => {
    // 後から本文が取れたり、判定条件を直したときに古い値が残らないこと
    const stale = [{ title: '馬毛島の工事', summary: [], region: 'kanto' }]
    assignRegions(stale)
    assert.equal(stale[0].region, 'kyushu')
  })

  console.log('\n地図データ')
  await check('地図の地方IDと判定キーワードのIDが一致する', () => {
    assert.deepEqual(mapRegions.map((r) => r.id).sort(), Object.keys(regionKeywords).sort())
  })
  await check('パスが絶対座標になっている', () => {
    // 相対パスのまま連結すると2県目以降がずれる。生成時に絶対化している。
    for (const region of mapRegions) {
      assert.doesNotMatch(region.d, /[mlhvcsqtaz]/, `${region.label} に相対コマンドが残っている`)
      assert.match(region.d, /^M/, `${region.label} が M で始まっていない`)
    }
  })
  await check('ピンが地方の外接矩形の中に収まる', () => {
    for (const region of mapRegions) {
      const [x, y] = region.pin
      assert.ok(x >= region.box.x && x <= region.box.x + region.box.w, `${region.label} のピンX`)
      assert.ok(y >= region.box.y && y <= region.box.y + region.box.h, `${region.label} のピンY`)
    }
  })

  console.log('\n蓄積の作り直し')
  await check('古い見出しの「 - 媒体名」が落ち、重複が畳まれる', () => {
    const stored = [
      { key: 'old1', title: '馬毛島の基地建設が進む - 47NEWS', publisher: '47NEWS', link: 'https://a.jp/1', summary: [], via: ['A'], pickups: 1, hasBody: false },
      { key: 'old2', title: '馬毛島の基地建設が進む', publisher: 'jcp.or.jp', link: 'https://b.jp/2', summary: [], via: ['B'], pickups: 1, hasBody: true },
    ]
    const out = normalizeArchive(stored)
    assert.equal(out.length, 1, '重複が畳まれていない')
    assert.equal(out[0].title, '馬毛島の基地建設が進む')
    assert.equal(out[0].hasBody, true, '情報の濃い方が残っていない')
    assert.deepEqual(out[0].via.sort(), ['A', 'B'])
  })
  await check('採否は収集時と同じ材料で見直す', () => {
    // 要約で見直すと、収集時には見ていなかった本文の語で通ってしまう
    const stored = [{
      key: 'k',
      title: '駐屯地でオスプレイが飛行訓練',
      publisher: 'X',
      link: 'https://a.jp/1',
      matchText: '駐屯地でオスプレイが飛行訓練',
      summary: ['九州各地の自衛隊施設で飛行訓練をしています'],
    }]
    assert.equal(normalizeArchive(stored).length, 0, '要約の語で通ってしまっている')
  })
  await check('防衛と無関係な公共工事は通さない', () => {
    // 「萩山小複合施設整備事業」が topic の「施設整備」に当たっていた
    const stored = [{
      key: 'k',
      title: '9月補正で債務負担80億/萩山小複合施設整備事業/東村山市',
      publisher: 'X',
      link: 'https://a.jp/1',
      summary: [],
    }]
    assert.equal(normalizeArchive(stored).length, 0)
  })
  await check('今の基準で対象外になった記事は落ちる', () => {
    const stored = [
      { key: 'x', title: '陸自駐屯地オスプレイが飛行訓練', publisher: 'X', link: 'https://a.jp/1', summary: [] },
      { key: 'y', title: '馬毛島の造成工事が進む', publisher: 'Y', link: 'https://a.jp/2', summary: [] },
    ]
    // キーは見出しから作り直されるので、残ったかどうかは見出しで見る
    assert.deepEqual(normalizeArchive(stored).map((a) => a.title), ['馬毛島の造成工事が進む'])
  })

  console.log('\n本文の取り直し')
  await check('本文が無い蓄積記事だけを、回数を区切って取り直す', () => {
    const now = new Date()
    const ago = (days) => new Date(now.getTime() - days * 864e5).toISOString()
    const pool = [
      { key: 'nobody', hasBody: false, enrichAttempts: 0, publishedAt: ago(1) },
      { key: 'hasbody', hasBody: true, enrichAttempts: 0, publishedAt: ago(1) },
      { key: 'exhausted', hasBody: false, enrichAttempts: 3, publishedAt: ago(1) },
      { key: 'old', hasBody: false, enrichAttempts: 0, publishedAt: ago(60) },
      { key: 'isfresh', hasBody: false, enrichAttempts: 0, publishedAt: ago(1) },
    ]
    const picked = selectRetryTargets(pool, {
      skipKeys: new Set(['isfresh']),
      limit: 10,
      now,
    }).map((a) => a.key)
    assert.deepEqual(picked, ['nobody'])
  })
  await check('試行回数の少ない記事から順に枠を使う', () => {
    const now = new Date()
    const ago = (days) => new Date(now.getTime() - days * 864e5).toISOString()
    const pool = [
      { key: 'twice', hasBody: false, enrichAttempts: 2, publishedAt: ago(1) },
      { key: 'never', hasBody: false, enrichAttempts: 0, publishedAt: ago(1) },
    ]
    assert.deepEqual(
      selectRetryTargets(pool, { skipKeys: new Set(), limit: 1, now }).map((a) => a.key),
      ['never'],
    )
  })
  await check('枠が無ければ取り直さない', () => {
    const pool = [{ key: 'x', hasBody: false, enrichAttempts: 0, publishedAt: new Date().toISOString() }]
    assert.deepEqual(selectRetryTargets(pool, { skipKeys: new Set(), limit: 0 }), [])
  })

  console.log('\n要約の作り直し')
  await check('抽出型で作った要約だけを作り直す', () => {
    const now = new Date()
    const ago = (d) => new Date(now.getTime() - d * 864e5).toISOString()
    const pool = [
      { key: 'stale', hasBody: true, generatedBy: 'extractive', publishedAt: ago(1) },
      { key: 'done', hasBody: true, generatedBy: 'claude', publishedAt: ago(1) },
      { key: 'nobody', hasBody: false, generatedBy: 'extractive', publishedAt: ago(1) },
      { key: 'old', hasBody: true, generatedBy: 'extractive', publishedAt: ago(60) },
      { key: 'fresh', hasBody: true, generatedBy: 'extractive', publishedAt: ago(1) },
    ]
    const picked = selectResummaryTargets(pool, {
      skipKeys: new Set(['fresh']),
      limit: 10,
      now,
    }).map((a) => a.key)
    assert.deepEqual(picked, ['stale'])
  })
  await check('枠が無ければ作り直さない', () => {
    const pool = [{ key: 'x', hasBody: true, generatedBy: 'extractive', publishedAt: new Date().toISOString() }]
    assert.deepEqual(selectResummaryTargets(pool, { skipKeys: new Set(), limit: 0 }), [])
  })

  console.log('\nHTML生成')
  const meta = { updatedAt: new Date().toISOString(), engine, sourcesOk: 2, sourcesTotal: 3, status }
  const stats = buildStats({ recent: summarized, archived: summarized, status, freshCount: 2 })
  const html = renderIndex({ articles: summarized, digest: ['要点テスト'], status, meta, stats })
  await check('記事がカードとして出力される', () => {
    assert.equal((html.match(/<article class="card/g) || []).length, summarized.length)
  })
  await check('HTMLがエスケープされる', () => {
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

  await check('日別ページとアーカイブ一覧が組める', () => {
    const day = dayKey(mage.publishedAt)
    assert.match(day, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(renderDay({ day, articles: summarized, meta, stats }).includes('<!DOCTYPE html>'))
    assert.ok(renderArchiveIndex({ days: [{ day, count: 3 }], meta, stats }).includes(`${day}.html`))
  })
  await check('記事のある地方にだけピンが立つ', () => {
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
  await check('記事カードに地方が入る', () => {
    const withRegion = [{ ...mage, region: 'kyushu', summary: ['a', 'b', 'c'], why: '' }]
    const out = renderIndex({ articles: withRegion, digest: [], status, meta, stats })
    assert.match(out, /data-region="kyushu"/)
  })
  await check('カテゴリが欠けた記事も落とさず表示する', () => {
    const orphan = [{ ...mage, category: undefined, summary: ['a', 'b', 'c'], why: '' },
                    { ...mage, key: 'x2', category: '存在しないID', summary: ['a', 'b', 'c'], why: '' }]
    const out = renderIndex({ articles: orphan, digest: [], status: [], meta, stats })
    assert.equal((out.match(/<article class="card/g) || []).length, 2)
    assert.doesNotMatch(out, /data-cat="undefined"/)
    assert.doesNotMatch(out, /data-cat="存在しないID"/)
  })

  await check('記事0件でも壊れない', () => {
    const out = renderIndex({ articles: [], digest: [], status: [], meta, stats })
    assert.ok(out.includes('該当する記事はありませんでした'))
  })
})

console.log(failures === 0 ? '\n全項目に合格しました。' : `\n${failures}件が失敗しました。`)
process.exitCode = failures === 0 ? 0 : 1
