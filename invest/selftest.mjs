#!/usr/bin/env node
// 外に出ない自己テスト。壊れた状態で本番を走らせないため、ワークフローの最初に回す。
//
//   node invest/selftest.mjs

import assert from 'node:assert/strict'
import { categories, categoryIds, markets, watchlist, allSources } from './config.mjs'
import { parseYahooChart, parseStooqCsv, summarizeSeries } from './lib/market.mjs'
import { matchesMarket, matchWatchlist, collectArticles } from './lib/collect.mjs'
import { extractiveSummary, guessCategory, guessSentiment, describeMove, summarizeArticles } from './lib/summarize.mjs'
import { mergeArchive } from './lib/store.mjs'
import { renderIndex, renderDay, renderArchiveIndex, escapeHtml, dayKey } from './lib/render.mjs'

let failed = 0
async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  × ${name}\n    ${err.stack?.split('\n').slice(0, 3).join('\n    ')}`)
  }
}

console.log('■ 投資情報ウォッチ 自己テスト')

// --- 設定 ---
await test('設定: id と code が重複しない', () => {
  const keys = [...markets.map((m) => m.id), ...watchlist.map((w) => w.code)]
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(new Set(categoryIds).size, categories.length)
})
await test('設定: 指標と銘柄に取得先がある', () => {
  for (const item of [...markets, ...watchlist]) assert.ok(item.yahoo || item.stooq, item.name)
})
await test('設定: 銘柄別の検索が情報源に加わる', () => {
  const sources = allSources()
  assert.ok(sources.some((s) => s.watchCode === watchlist[0].code))
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length, '情報源の id が重複')
})

// --- 値動き ---
const day = (i) => Math.floor(Date.UTC(2026, 0, 2 + i) / 1000)
await test('Yahoo: 欠けた足を飛ばし、現在値で最後の足を上書きする', () => {
  const json = {
    chart: {
      result: [
        {
          meta: { regularMarketPrice: 105 },
          timestamp: [day(0), day(1), day(2), day(3)],
          indicators: { quote: [{ close: [100, null, 102, 104] }] },
        },
      ],
    },
  }
  const parsed = parseYahooChart(json)
  assert.deepEqual(parsed.points.map((p) => p.c), [100, 102, 105])
  assert.equal(parseYahooChart({ chart: { result: null, error: { code: 'Not Found' } } }), null)
})
await test('Stooq: CSV を読み、読めない応答は null', () => {
  const csv = 'Date,Open,High,Low,Close,Volume\n2026-01-05,1,1,1,10,0\n2026-01-06,1,1,1,11,0\n'
  assert.deepEqual(parseStooqCsv(csv).points, [{ t: '2026-01-05', c: 10 }, { t: '2026-01-06', c: 11 }])
  assert.equal(parseStooqCsv('No data'), null)
})
await test('変化率: 前日比・週・年初来・52週レンジ', () => {
  const points = [{ t: '2025-12-30', c: 80 }]
  for (let i = 0; i < 30; i++) points.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, c: 100 + i })
  const s = summarizeSeries(points)
  assert.equal(s.last, 129)
  assert.equal(s.prev, 128)
  assert.ok(Math.abs(s.changePct - (1 / 128) * 100) < 1e-9)
  assert.ok(Math.abs(s.week - ((129 - 124) / 124) * 100) < 1e-9)
  assert.ok(Math.abs(s.ytd - ((129 - 80) / 80) * 100) < 1e-9, '年初来は前年最終日が基準')
  assert.equal(s.low52, 80)
  assert.equal(s.high52, 129)
  assert.equal(summarizeSeries([]), null)
})

// --- ニュースの採否 ---
await test('採否: 市場の語で採り、無関係な記事は落とす', () => {
  assert.ok(matchesMarket('日経平均が反発、終値は4万円台').matched)
  assert.ok(!matchesMarket('新型スマホの発売日が決定').matched)
  assert.ok(!matchesMarket('株価占い 今週の星座').matched, '除外語が優先')
  assert.ok(matchesMarket('何でもない見出し', { acceptAll: true }).matched)
})
await test('採否: ウォッチ銘柄は別名でも当たる', () => {
  assert.deepEqual(matchWatchlist('NVIDIA、新型GPUを発表'), ['NVDA'])
  const r = matchesMarket('トヨタ、新型車を発表')
  assert.ok(r.matched)
  assert.deepEqual(r.tickers, ['7203'])
})
await test('収集: 重複をまとめ、Google の見出しから媒体名を落とす', async () => {
  const now = new Date('2026-09-27T00:00:00Z')
  const fresh = '2026-09-26T12:00:00Z'
  const sources = [
    { id: 'a', name: 'A', kind: 'rss' },
    { id: 'g', name: 'G', kind: 'gnews' },
    { id: 'x', name: 'X', kind: 'rss' },
  ]
  const read = async (s) => {
    if (s.id === 'x') return { ok: false, items: [], attempts: ['→ HTTP 404'] }
    const items =
      s.id === 'a'
        ? [
            { title: '日銀が利上げを決定', link: 'https://a.example/1', description: '日銀は政策金利を引き上げた。', publishedAt: fresh },
            { title: '古い株価の記事', link: 'https://a.example/2', description: '', publishedAt: '2026-01-01T00:00:00Z' },
          ]
        : [{ title: '日銀が利上げを決定 - 経済新聞', link: 'https://news.google.com/x', description: '一覧', sourceName: '経済新聞', publishedAt: fresh }]
    return { ok: true, url: 'u', items, attempts: [] }
  }
  const { articles, status } = await collectArticles(sources, { now, read })
  assert.equal(articles.length, 1)
  assert.equal(articles[0].pickups, 2)
  assert.equal(articles[0].isGoogleLink, false, '直リンクを優先')
  assert.deepEqual(status.map((s) => s.ok), [true, true, false])
})
await test('蓄積: 既知の記事は新着にしない', () => {
  const now = new Date('2026-09-27T00:00:00Z')
  const a = { key: 'k1', publishedAt: '2026-09-26T00:00:00Z', via: ['A'], summary: ['済'] }
  const { merged, fresh } = mergeArchive([a], [{ key: 'k1', publishedAt: a.publishedAt, via: ['B'] }, { key: 'k2', publishedAt: a.publishedAt, via: ['A'] }], { now })
  assert.equal(merged.length, 2)
  assert.deepEqual(fresh.map((x) => x.key), ['k2'])
  assert.deepEqual(merged.find((x) => x.key === 'k1').via, ['A', 'B'])
})

// --- 要約 ---
await test('抽出型: 3行・カテゴリ・向きが付く', () => {
  const s = extractiveSummary({
    title: 'ソニー、通期予想を上方修正',
    body: 'ソニーグループは通期の営業利益予想を上方修正した。前年比12%の増益を見込む。ゲーム事業が好調だった。',
    tickers: ['6758'],
    relevance: 3,
  })
  assert.equal(s.summary.length, 3)
  assert.equal(s.sentiment, 'positive')
  assert.equal(s.importance, 'high', 'ウォッチ銘柄の記事は注目')
  assert.deepEqual(s.assets, ['ソニーグループ'])
  assert.equal(guessCategory('FOMCで利下げ'), 'macro')
  assert.equal(guessCategory('円安が進行、ドル円は150円'), 'fx')
  assert.equal(guessSentiment('株価が急落、赤字に転落'), 'negative')
})
await test('要約: 鍵が無ければ抽出型に落ちる', async () => {
  const saved = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_AUTH_TOKEN]
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_AUTH_TOKEN
  try {
    const items = [{ title: '日経平均が続落', description: '日経平均株価は続落した。', relevance: 1 }]
    const { engine } = await summarizeArticles(items)
    assert.equal(engine, 'extractive')
    assert.equal(items[0].generatedBy, 'extractive')
  } finally {
    if (saved[0] !== undefined) process.env.ANTHROPIC_API_KEY = saved[0]
    if (saved[1] !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved[1]
  }
})
await test('市況の一行: 符号と桁', () => {
  assert.equal(describeMove('日経平均', { last: 40000, changePct: -1.234 }, 0), '日経平均 40,000（−1.23%）')
  assert.equal(describeMove('x', { last: null }), null)
})

// --- 描画 ---
await test('描画: 値の欠けや失敗があっても組める', () => {
  const article = {
    key: 'k', title: '<script>alert(1)</script>日銀', link: 'https://example.com/?a=1&b=2', publisher: 'A', publishedAt: '2026-09-26T00:00:00Z',
    category: 'macro', sentiment: 'negative', importance: 'high', summary: ['a', 'b', 'c'], impact: '円高', assets: ['ドル円'], tickers: ['7203'], via: ['A'],
  }
  const quotes = {
    n225: summarizeSeries([{ t: '2026-09-25', c: 100 }, { t: '2026-09-26', c: 101 }]),
    usdjpy: { ok: false, stale: false, error: 'x' },
  }
  const html = renderIndex({ articles: [article], quotes, digest: ['要点'], status: [{ id: 'a', name: 'A', ok: false, note: '<b>' }], meta: { updatedAt: '2026-09-27T00:00:00Z', engine: 'claude' } })
  assert.ok(!html.includes('<script>alert'), '見出しはエスケープされる')
  assert.ok(html.includes('▼ 向かい風'))
  assert.ok(html.includes('取得できませんでした'))
  assert.ok(html.includes('a=1&amp;b=2'))
  assert.ok(renderDay({ day: '2026-09-26', articles: [article], meta: {} }).includes('2026-09-26 のニュース'))
  assert.ok(renderArchiveIndex({ days: [{ day: '2026-09-26', count: 1 }], meta: {} }).includes('archive/2026-09-26.html'))
  assert.equal(escapeHtml(`"'`), '&quot;&#39;')
  assert.equal(dayKey('2026-09-26T16:00:00Z'), '2026-09-27', '日付は日本時間で切る')
})

if (failed > 0) {
  console.log(`\n${failed}件失敗`)
  process.exitCode = 1
} else {
  console.log('\nすべて成功')
}
