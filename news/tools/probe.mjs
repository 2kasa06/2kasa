#!/usr/bin/env node
// 情報源の疎通と、Google ニュースのリンク解決を調べる診断ツール。
//
//   npm run news:probe
//
// このコンテナからは外に出られないので、GitHub Actions 上で走らせて事実を取るために置いた。
// 情報源が落ちたとき、候補URLをまとめて試すのにも使える。

import { get, mapLimit } from '../lib/http.mjs'
import { parseFeed } from '../lib/feed.mjs'

// 落ちている情報源の代わりを探す。上から試して最初に読めたものを config に採る。
// 追加したい情報源の候補。読めたものだけを config.mjs に採る。
// 一次情報（官公庁・議事録）は有料の壁が無く、防衛施設の話では新聞より中身が濃い。
const FEED_CANDIDATES = {
  // --- 防衛省・自衛隊の一次情報 ---
  '防衛省 調達・入札': [
    'https://www.mod.go.jp/j/rss/procurement.xml',
    'https://www.mod.go.jp/j/rss/chotatsu.xml',
    'https://www.mod.go.jp/j/rss/nyusatsu.xml',
    'https://www.mod.go.jp/j/procurement/rss.xml',
  ],
  '防衛装備庁': [
    'https://www.mod.go.jp/atla/rss/news.xml',
    'https://www.mod.go.jp/atla/rss/press.xml',
    'https://www.mod.go.jp/atla/rss/chotatsu.xml',
    'https://www.mod.go.jp/atla/rss.xml',
  ],
  '沖縄防衛局': [
    'https://www.mod.go.jp/rdb/okinawa/rss.xml',
    'https://www.mod.go.jp/rdb/okinawa/rss/news.xml',
    'https://www.mod.go.jp/rdb/okinawa/index.xml',
  ],
  '九州防衛局': [
    'https://www.mod.go.jp/rdb/kyusyu/rss.xml',
    'https://www.mod.go.jp/rdb/kyusyu/rss/news.xml',
  ],
  '防衛省 政策・計画': [
    'https://www.mod.go.jp/j/rss/policy.xml',
    'https://www.mod.go.jp/j/rss/approach.xml',
    'https://www.mod.go.jp/j/rss/publication.xml',
  ],

  // --- 自治体（基地を抱える県の報道発表） ---
  '沖縄県': [
    'https://www.pref.okinawa.jp/rss/news.xml',
    'https://www.pref.okinawa.jp/index.rdf',
    'https://www.pref.okinawa.jp/rss.xml',
    'https://www.pref.okinawa.jp/site/rss/press.xml',
  ],
  '鹿児島県': [
    'https://www.pref.kagoshima.jp/rss/news.xml',
    'https://www.pref.kagoshima.jp/index.rdf',
    'https://www.pref.kagoshima.jp/rss.xml',
  ],
  '長崎県': ['https://www.pref.nagasaki.jp/rss/news.xml', 'https://www.pref.nagasaki.jp/index.rdf'],
  '山口県': ['https://www.pref.yamaguchi.lg.jp/rss/news.xml', 'https://www.pref.yamaguchi.lg.jp/index.rdf'],
  '青森県': ['https://www.pref.aomori.lg.jp/rss/news.xml', 'https://www.pref.aomori.lg.jp/index.rdf'],
  '西之表市（馬毛島）': [
    'https://www.city.nishinoomote.lg.jp/rss.xml',
    'https://www.city.nishinoomote.lg.jp/index.rdf',
    'https://www.city.nishinoomote.lg.jp/rss/news.xml',
  ],
  '名護市（辺野古）': [
    'https://www.city.nago.okinawa.jp/rss.xml',
    'https://www.city.nago.okinawa.jp/index.rdf',
  ],
  '石垣市': ['https://www.city.ishigaki.okinawa.jp/rss.xml', 'https://www.city.ishigaki.okinawa.jp/index.rdf'],

  // --- 建設系の専門紙（無料公開分） ---
  '建通新聞': [
    'https://www.kentsu.co.jp/feed',
    'https://www.kentsu.co.jp/rss',
    'https://www.kentsu.co.jp/?feed=rss2',
    'https://www.kentsu.co.jp/webnews/rss.xml',
  ],
  'けんせつPlaza': [
    'https://www.kensetsu-plaza.com/kiji/rss',
    'https://www.kensetsu-plaza.com/?feed=rss2',
    'https://www.kensetsu-plaza.com/kiji/feed/',
  ],
  '日経クロステック 建設': [
    'https://xtech.nikkei.com/rss/xtech-const.rdf',
    'https://xtech.nikkei.com/rss/index.rdf',
  ],
  '日刊建設産業新聞': [
    'https://www.kensetsusangyo.com/feed',
    'https://www.kensetsusangyo.com/?feed=rss2',
  ],
  '国土交通省': [
    'https://www.mlit.go.jp/press.rdf',
    'https://www.mlit.go.jp/rss/press.xml',
    'https://www.mlit.go.jp/index.rdf',
  ],
}

// RSS ではなく JSON で答える一次情報。読めたら専用の取り込みを書く。
const JSON_CANDIDATES = {
  '国会会議録検索システム': {
    url:
      'https://kokkai.ndl.go.jp/api/speech?any=' +
      encodeURIComponent('防衛施設') +
      '&recordPacking=json&maximumRecords=3',
    // 期待する形。ここが崩れていたら取り込みを書いても無駄になる。
    expect: (json) => Array.isArray(json?.speechRecord),
    describe: (json) =>
      `${json?.numberOfRecords ?? '?'}件中${json?.speechRecord?.length ?? 0}件 / 例: ` +
      `${(json?.speechRecord?.[0]?.speech ?? '').slice(0, 50)}`,
  },
}

const GNEWS =
  'https://news.google.com/rss/search?q=' +
  encodeURIComponent('馬毛島 基地建設 when:14d') +
  '&hl=ja&gl=JP&ceid=JP:ja'

function section(title) {
  console.log(`\n${'='.repeat(64)}\n${title}\n${'='.repeat(64)}`)
}

// ---- 1) 候補フィードの疎通 -------------------------------------------------

section('1. 候補フィードの疎通')

const probes = Object.entries(FEED_CANDIDATES).flatMap(([name, urls]) =>
  urls.map((url) => ({ name, url })),
)

const feedResults = await mapLimit(probes, 6, async ({ name, url }) => {
  const res = await get(url, { timeoutMs: 15000, retries: 0 })
  if (!res.ok) return { name, url, ok: false, note: res.error }
  const parsed = parseFeed(res.body)
  return parsed.ok
    ? { name, url, ok: true, note: `${parsed.items.length}件`, sample: parsed.items[0]?.title ?? '' }
    : { name, url, ok: false, note: parsed.error }
})

for (const [name] of Object.entries(FEED_CANDIDATES)) {
  const rows = feedResults.filter((r) => r.name === name)
  const win = rows.find((r) => r.ok)
  console.log(`\n【${name}】 ${win ? '✓ 使える' : '× 全滅'}`)
  for (const row of rows) {
    console.log(`  ${row.ok ? '✓' : '×'} ${row.url}  → ${row.note}`)
  }
  if (win?.sample) console.log(`    例: ${win.sample.slice(0, 60)}`)
}

// ---- 2) Google ニュースのリンク解決 ---------------------------------------

section('2. Google ニュースのリンクから元記事に辿れるか')

const gres = await get(GNEWS, { timeoutMs: 20000, retries: 1 })
if (!gres.ok) {
  console.log(`検索フィードが取れない: ${gres.error}`)
} else {
  const items = parseFeed(gres.body).items.slice(0, 3)
  console.log(`検索フィード: ${items.length}件を試す\n`)

  for (const item of items) {
    console.log(`--- ${item.title.slice(0, 50)}`)
    console.log(`    出典: ${item.sourceName} (${item.sourceUrl})`)
    console.log(`    link: ${item.link.slice(0, 80)}…`)

    // (a) 素直にリダイレクトを追う
    const res = await get(item.link, { timeoutMs: 20000, retries: 0 })
    let finalHost = '-'
    try {
      finalHost = new URL(res.url).hostname
    } catch {
      /* URL が壊れている場合はそのまま */
    }
    console.log(`    (a) 追跡: status=${res.status} 最終ホスト=${finalHost} 本文長=${res.body.length}`)

    if (res.ok) {
      // (b) 返ってきた HTML に元記事のURLが含まれるか
      const hrefs = [...res.body.matchAll(/https?:\/\/[^"'\s<>\\]+/g)]
        .map((m) => m[0])
        .filter((u) => {
          try {
            const h = new URL(u).hostname
            return !/(^|\.)(google\.com|gstatic\.com|googleapis\.com|schema\.org|w3\.org)$/.test(h)
          } catch {
            return false
          }
        })
      const uniq = [...new Set(hrefs.map((u) => { try { return new URL(u).hostname } catch { return '' } }))]
        .filter(Boolean)
      console.log(`    (b) 外部ホスト: ${uniq.slice(0, 8).join(', ') || 'なし'}`)
      const expected = item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, '') : ''
      console.log(`        出典ホストと一致するものがあるか: ${expected && uniq.some((h) => h.replace(/^www\./, '') === expected) ? 'あり' : 'なし'}`)
      for (const marker of ['data-n-au', 'c-wiz', 'http-equiv="refresh"', 'window.location', 'AF_initDataCallback']) {
        if (res.body.includes(marker)) console.log(`        目印: ${marker}`)
      }
    }

    // (c) 記事IDのbase64にURLが埋まっている旧形式か
    const id = item.link.match(/\/rss\/articles\/([^?]+)/)?.[1]
    if (id) {
      try {
        const raw = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1')
        const found = raw.match(/https?:\/\/[\x20-\x7e]+/)
        console.log(`    (c) ID内のURL: ${found ? found[0].slice(0, 70) : 'なし'}`)
      } catch {
        console.log('    (c) ID内のURL: 復号できず')
      }
    }
    console.log('')
  }
}

// ---- 3) ブラウザでの解決 ---------------------------------------------------

section('3. ブラウザで元記事に辿れるか')

const { createResolver } = await import('../lib/resolve.mjs')
const resolver = await createResolver({ timeoutMs: 20000 })
console.log(`解決器: ${resolver.available ? '有効' : `無効（${resolver.reason}）`}\n`)

if (resolver.available && gres.ok) {
  const items = parseFeed(gres.body).items.slice(0, 5)
  let hit = 0
  for (const item of items) {
    const resolved = await resolver.resolve(item.link)
    if (resolved) hit++
    console.log(`  ${resolved ? '✓' : '×'} ${item.sourceName.padEnd(16)} → ${resolved ? resolved.slice(0, 76) : '解決できず'}`)
  }
  console.log(`\n  解決できた: ${hit}/${items.length}`)
}
await resolver.close()

section('診断おわり')

// ---- 4) JSON で答える一次情報 ---------------------------------------------

section('4. JSON の一次情報が使えるか')

for (const [name, spec] of Object.entries(JSON_CANDIDATES)) {
  const res = await get(spec.url, { timeoutMs: 20000, retries: 1 })
  if (!res.ok) {
    console.log(`× ${name}: ${res.error}`)
    continue
  }
  let json = null
  try {
    json = JSON.parse(res.body)
  } catch (e) {
    console.log(`× ${name}: JSON として読めない（${String(e).slice(0, 60)}）`)
    continue
  }
  if (!spec.expect(json)) {
    console.log(`× ${name}: 応答の形が想定と違う → ${Object.keys(json).slice(0, 6).join(', ')}`)
    continue
  }
  console.log(`✓ ${name}: ${spec.describe(json)}`)
}

section('診断おわり（4節）')
