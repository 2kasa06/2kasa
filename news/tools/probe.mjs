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
const FEED_CANDIDATES = {
  '沖縄タイムス': [
    'https://www.okinawatimes.co.jp/feed/rss/',
    'https://www.okinawatimes.co.jp/rss/',
    'https://www.okinawatimes.co.jp/rss.xml',
    'https://www.okinawatimes.co.jp/feed.xml',
    'https://www.okinawatimes.co.jp/?feed=rss2',
  ],
  '琉球新報': [
    'https://ryukyushimpo.jp/feed/rss2/',
    'https://ryukyushimpo.jp/?feed=rss2',
    'https://ryukyushimpo.jp/rss.xml',
    'https://ryukyushimpo.jp/feed/atom/',
  ],
  '南日本新聞': [
    'https://373news.com/_rss/rss.xml',
    'https://373news.com/rss/',
    'https://373news.com/?feed=rss2',
    'https://373news.com/feed/rss/',
  ],
  'Jディフェンスニュース': [
    'https://j-defense.ikaros.jp/atom.xml',
    'https://j-defense.ikaros.jp/index.xml',
    'https://j-defense.ikaros.jp/rss/',
    'https://j-defense.ikaros.jp/?feed=rss2',
  ],
  'けんせつPlaza': [
    'https://www.kensetsu-plaza.com/kiji/rss',
    'https://www.kensetsu-plaza.com/?feed=rss2',
    'https://www.kensetsu-plaza.com/kiji/feed/',
  ],
  '47NEWS': ['https://www.47news.jp/rss/index.rdf', 'https://www.47news.jp/feed', 'https://www.47news.jp/rss.xml'],
  '西日本新聞': ['https://www.nishinippon.co.jp/feed/', 'https://www.nishinippon.co.jp/rss/', 'https://www.nishinippon.co.jp/rss/news.rdf'],
  '山陰中央新報': ['https://www.sanin-chuo.co.jp/feed', 'https://www.sanin-chuo.co.jp/rss/', 'https://www.sanin-chuo.co.jp/?feed=rss2'],
  '中国新聞': ['https://www.chugoku-np.co.jp/rss/', 'https://www.chugoku-np.co.jp/feed'],
  '長崎新聞': ['https://nordot.app/-/rss/nagasaki', 'https://www.nagasaki-np.co.jp/feed'],
  '佐賀新聞': ['https://www.saga-s.co.jp/rss/', 'https://www.saga-s.co.jp/feed'],
  '北海道新聞': ['https://www.hokkaido-np.co.jp/rss/', 'https://www.hokkaido-np.co.jp/feed'],
  '東奥日報': ['https://www.toonippo.co.jp/feed', 'https://www.toonippo.co.jp/rss/'],
  '神戸新聞': ['https://www.kobe-np.co.jp/rss/flash.xml', 'https://www.kobe-np.co.jp/feed'],
  '静岡新聞': ['https://www.at-s.com/rss/news.xml', 'https://www.at-s.com/feed'],
  'Yahoo!ニュース 国内': ['https://news.yahoo.co.jp/rss/topics/domestic.xml'],
  '時事通信': ['https://www.jiji.com/rss/ranking.rdf', 'https://www.jiji.com/rss/'],
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
