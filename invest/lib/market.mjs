// 指標と銘柄の値動きを取ってくる。
//
// 主経路は Yahoo Finance のチャートAPI（鍵不要・1年分の日足が JSON で返る）。
// 落ちたときは Stooq の日足CSVで拾い直す。どちらも公式に保証された API では
// ないので、形が変わっても例外で全体を止めず、その指標だけ「取得失敗」にする。
// 前回取れた値は data/invest-market.json に残っていて、失敗時はそれを「前回値」として出す。

import { get, mapLimit } from '../../news/lib/http.mjs'

const DAY = 24 * 60 * 60 * 1000

// Yahoo は bot らしい UA に 429 を返すので、ふつうのブラウザを名乗る
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

/**
 * Yahoo のチャートAPI応答を、日付と終値の列に直す。
 * @returns {{points: Array<{t: string, c: number}>, meta: object} | null}
 */
export function parseYahooChart(json) {
  const result = json?.chart?.result?.[0]
  if (!result || !Array.isArray(result.timestamp)) return null
  const closes = result.indicators?.quote?.[0]?.close
  if (!Array.isArray(closes)) return null

  const points = []
  for (const [i, ts] of result.timestamp.entries()) {
    const c = closes[i]
    // 休場日や取引途中の欠けは null で来る
    if (typeof c !== 'number' || !Number.isFinite(c)) continue
    points.push({ t: new Date(ts * 1000).toISOString().slice(0, 10), c })
  }
  if (points.length === 0) return null

  // 取引時間中は最後の足が「今日の途中経過」になっている。現在値で上書きしておく。
  const live = result.meta?.regularMarketPrice
  if (typeof live === 'number' && Number.isFinite(live)) points[points.length - 1].c = live

  return { points: dedupeByDay(points), meta: result.meta || {} }
}

/** Stooq の日足CSV（Date,Open,High,Low,Close,Volume）を読む */
export function parseStooqCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/)
  if (lines.length < 2 || !/^date,/i.test(lines[0])) return null
  const header = lines[0].toLowerCase().split(',')
  const at = header.indexOf('close')
  if (at < 0) return null

  const points = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const c = Number(cols[at])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cols[0]) || !Number.isFinite(c)) continue
    points.push({ t: cols[0], c })
  }
  return points.length > 0 ? { points: dedupeByDay(points), meta: {} } : null
}

function dedupeByDay(points) {
  const byDay = new Map()
  for (const p of points) byDay.set(p.t, p)
  return [...byDay.values()].sort((a, b) => a.t.localeCompare(b.t))
}

/**
 * 終値の列から、画面に出す数字をまとめて作る。
 * 1週・1ヶ月は営業日で数える（5本前・21本前）。
 */
export function summarizeSeries(points) {
  if (!points || points.length === 0) return null
  const last = points[points.length - 1]
  const back = (n) => points[Math.max(0, points.length - 1 - n)]
  const pct = (from) => (from && from.c ? ((last.c - from.c) / from.c) * 100 : null)

  const prev = points.length >= 2 ? points[points.length - 2] : null
  const thisYear = last.t.slice(0, 4)
  const ytdBase = [...points].reverse().find((p) => p.t.slice(0, 4) < thisYear)
  const closes = points.map((p) => p.c)

  return {
    last: last.c,
    asOf: last.t,
    prev: prev ? prev.c : null,
    change: prev ? last.c - prev.c : null,
    changePct: pct(prev),
    week: pct(back(5)),
    month: pct(back(21)),
    ytd: pct(ytdBase),
    high52: Math.max(...closes),
    low52: Math.min(...closes),
    // 画面の小さなグラフ用。3ヶ月ぶんあれば流れは読める。
    spark: points.slice(-63),
  }
}

async function fetchYahoo(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    '?range=1y&interval=1d&includePrePost=false'
  const res = await get(url, { timeoutMs: 15000, retries: 1, accept: 'application/json', userAgent: BROWSER_UA })
  if (!res.ok) return { error: `Yahoo ${res.error}` }
  try {
    const parsed = parseYahooChart(JSON.parse(res.body))
    return parsed ? { ...parsed, via: 'Yahoo Finance' } : { error: 'Yahoo 応答の形が想定と違う' }
  } catch {
    return { error: 'Yahoo JSONとして読めない' }
  }
}

async function fetchStooq(symbol, now) {
  const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const url =
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d` +
    `&d1=${ymd(new Date(now.getTime() - 370 * DAY))}&d2=${ymd(now)}`
  const res = await get(url, { timeoutMs: 15000, retries: 1, accept: 'text/csv,*/*', userAgent: BROWSER_UA })
  if (!res.ok) return { error: `Stooq ${res.error}` }
  const parsed = parseStooqCsv(res.body)
  return parsed ? { ...parsed, via: 'Stooq' } : { error: 'Stooq 応答がCSVでない' }
}

/**
 * 指標1件を取る。Yahoo → Stooq の順に試す。
 * 全部だめなら previous（前回の実行で取れた値）を stale 付きで返す。
 */
async function fetchOne(item, { now, previous }) {
  const errors = []
  const attempts = [
    item.yahoo && (() => fetchYahoo(item.yahoo)),
    item.stooq && (() => fetchStooq(item.stooq, now)),
  ].filter(Boolean)

  for (const attempt of attempts) {
    const got = await attempt()
    if (got.error) {
      errors.push(got.error)
      continue
    }
    const stats = summarizeSeries(got.points)
    if (stats) return { ...stats, ok: true, stale: false, via: got.via, fetchedAt: now.toISOString() }
    errors.push(`${got.via} データが空`)
  }

  if (previous?.last != null) {
    return { ...previous, ok: false, stale: true, error: errors.join(' / ') }
  }
  return { ok: false, stale: false, error: errors.join(' / ') || '取得先が未設定' }
}

/**
 * 指標とウォッチ銘柄の値動きをまとめて取る。
 * @param items {Array<{id?: string, code?: string, yahoo?: string, stooq?: string}>}
 * @param previous {Record<string, object>} 前回の結果（キーは id か code）
 * @returns {Promise<Record<string, object>>}
 */
export async function fetchQuotes(items, { now = new Date(), previous = {} } = {}) {
  const results = await mapLimit(items, 4, async (item) => {
    const key = item.id || item.code
    return [key, await fetchOne(item, { now, previous: previous[key] })]
  })
  return Object.fromEntries(results)
}
