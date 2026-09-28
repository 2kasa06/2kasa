// Yahoo Finance の公開エンドポイント（チャート・検索）を読む。
//
// 公式に提供・保証された API ではないので、形が変わったり止まったりすることがある。
// 失敗しても例外で画面全体を落とさず、呼び出し側が「データ取得失敗」を出せるように null を返す。
// 利用は個人の閲覧用にとどめ、取得したデータを再配布しないこと。

import type { Bar } from '@/lib/types'

// bot らしい UA は 429 を返されやすい
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

export interface ChartMeta {
  symbol: string
  currency?: string
  exchangeName?: string
  fullExchangeName?: string
  instrumentType?: string
  longName?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketTime?: number
  chartPreviousClose?: number
  gmtoffset?: number
}

export interface ChartResult {
  meta: ChartMeta
  bars: Bar[]
}

/**
 * チャート API の応答を足に直す。
 * daily のときは取引所の現地日付の 'YYYY-MM-DD'、日中足は UNIX 秒のまま。
 * 値が欠けた足（休場・取引途中）は飛ばす。
 */
export function parseChart(json: unknown, daily: boolean): ChartResult | null {
  const result = (json as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as
    | { meta?: ChartMeta; timestamp?: number[]; indicators?: { quote?: Array<Record<string, (number | null)[]>> } }
    | undefined
  if (!result?.meta || !Array.isArray(result.timestamp)) return null
  const q = result.indicators?.quote?.[0]
  if (!q) return null
  const offset = result.meta.gmtoffset ?? 0

  const bars: Bar[] = []
  const seen = new Set<string | number>()
  for (const [i, ts] of result.timestamp.entries()) {
    const open = q.open?.[i], high = q.high?.[i], low = q.low?.[i], close = q.close?.[i]
    if (![open, high, low, close].every((v) => typeof v === 'number' && Number.isFinite(v))) continue
    const time = daily ? new Date((ts + offset) * 1000).toISOString().slice(0, 10) : ts
    // 同じ日付が2本来ることがある（取引時間中の最新足）。後の方を採る
    if (seen.has(time)) bars.pop()
    seen.add(time)
    bars.push({ time, open: open!, high: high!, low: low!, close: close!, volume: Math.max(0, q.volume?.[i] ?? 0) })
  }
  return bars.length > 0 ? { meta: result.meta, bars } : null
}

export interface SearchQuote {
  symbol: string
  name: string
  exchange: string
  type: string
}

export function parseSearch(json: unknown): SearchQuote[] {
  const quotes = (json as { quotes?: Array<Record<string, unknown>> })?.quotes
  if (!Array.isArray(quotes)) return []
  return quotes
    .filter((q) => typeof q.symbol === 'string' && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map((q) => ({
      symbol: String(q.symbol),
      name: String(q.longname ?? q.shortname ?? q.symbol),
      exchange: String(q.exchDisp ?? q.exchange ?? ''),
      type: String(q.quoteType),
    }))
}

async function getJson(url: string, revalidateSeconds: number): Promise<unknown | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'application/json' },
        signal: controller.signal,
        // Next.js のデータキャッシュに載せ、同じ銘柄を短時間に何度も取りに行かない
        next: { revalidate: revalidateSeconds },
      } as RequestInit)
      if (res.ok) return await res.json()
      // 4xx（429 以外）は繰り返しても変わらない
      if (res.status !== 429 && res.status < 500) return null
    } catch {
      // タイムアウト・通信断は1回だけやり直す
    } finally {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, 800))
  }
  return null
}

export type ChartSpan = 'daily-max' | 'intraday-1d' | 'intraday-5d' | 'meta'

const SPAN_PARAMS: Record<ChartSpan, { range: string; interval: string; revalidate: number }> = {
  // 10年分の日足。指標の計算（200日線など）と「全期間」表示に使う
  'daily-max': { range: '10y', interval: '1d', revalidate: 600 },
  'intraday-1d': { range: '1d', interval: '5m', revalidate: 120 },
  'intraday-5d': { range: '5d', interval: '15m', revalidate: 300 },
  // 銘柄名や取引所を知りたいだけのとき
  meta: { range: '5d', interval: '1d', revalidate: 3600 },
}

export async function fetchChart(symbol: string, span: ChartSpan): Promise<ChartResult | null> {
  const p = SPAN_PARAMS[span]
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${p.range}&interval=${p.interval}&includePrePost=false`
  const json = await getJson(url, p.revalidate)
  return json ? parseChart(json, span === 'daily-max' || span === 'meta') : null
}

export async function searchYahoo(query: string): Promise<SearchQuote[]> {
  const url =
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}` +
    '&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false'
  const json = await getJson(url, 3600)
  return json ? parseSearch(json) : []
}
