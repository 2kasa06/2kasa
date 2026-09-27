// モック実装。APIキーが無い段階でも画面を作れるようにするためのもの。
// 返すデータは source.isMock = true を持ち、UI は必ず「サンプルデータ」と表示する。

import type { ChartRange, DataResult, SourceInfo, Stock } from '@/lib/types'
import type { FinancialDataProvider, IRProvider, MacroDataProvider, MarketDataProvider, NewsProvider, Providers } from '../types'
import { generateEarnings, generateFinancials, generateIrDocuments, generateMarketEvents, generateNews } from './content'
import { generateDailyBars, generateIndices, generateIntradayBars } from './prices'
import { latestSessionDate, toDateKey } from './random'
import { findMockStock, MOCK_STOCKS, toStock, type MockStockSpec } from './stocks'

const PROVIDER_NAME = 'サンプルデータ'

function source(asOf: string): SourceInfo {
  return { provider: PROVIDER_NAME, isMock: true, asOf, fetchedAt: new Date().toISOString() }
}

function notFound(code: string): DataResult<never> {
  return { status: 'empty', message: `銘柄 ${code} は見つかりません` }
}

/** 検索用に表記ゆれを吸収する */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s・.,]/g, '')
}

// 日足の全履歴は生成に少し時間がかかるので、最新日ごとに覚えておく
const barCache = new Map<string, ReturnType<typeof generateDailyBars>>()
function dailyBars(spec: MockStockSpec) {
  const asOf = latestSessionDate()
  const key = `${spec.code}:${toDateKey(asOf)}`
  let bars = barCache.get(key)
  if (!bars) {
    bars = generateDailyBars(spec, asOf)
    barCache.set(key, bars)
  }
  return bars
}

class MockMarketData implements MarketDataProvider {
  readonly name = PROVIDER_NAME

  async listStocks() {
    return { status: 'ok' as const, data: MOCK_STOCKS.map(toStock), source: source(toDateKey(latestSessionDate())) }
  }

  async getStock(code: string): Promise<DataResult<Stock>> {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    return { status: 'ok', data: toStock(spec), source: source(toDateKey(latestSessionDate())) }
  }

  async searchStocks(query: string, limit = 10) {
    const q = normalize(query)
    if (!q) return { status: 'ok' as const, data: [], source: source(toDateKey(latestSessionDate())) }
    const scored = MOCK_STOCKS.map((s) => {
      const fields = [s.code, s.ticker, s.name, s.nameEn].map(normalize)
      // 前方一致を優先し、部分一致は後ろに回す
      const score = fields.some((f) => f === q) ? 3 : fields.some((f) => f.startsWith(q)) ? 2 : fields.some((f) => f.includes(q)) ? 1 : 0
      return { s, score }
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => toStock(x.s))
    return { status: 'ok' as const, data: scored, source: source(toDateKey(latestSessionDate())) }
  }

  async getQuote(code: string) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    const bars = dailyBars(spec)
    const last = bars[bars.length - 1]
    const prev = bars[bars.length - 2]
    return {
      status: 'ok' as const,
      data: {
        code: spec.code,
        price: last.close,
        previousClose: prev.close,
        change: last.close - prev.close,
        changePct: ((last.close - prev.close) / prev.close) * 100,
        volume: last.volume,
        time: `${last.time}T06:30:00.000Z`,
      },
      source: source(String(last.time)),
    }
  }

  async getHistory(code: string, range: ChartRange) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    const daily = dailyBars(spec)
    // 1日は5分足、1週間は15分足、それ以外は日足
    const data =
      range === '1d'
        ? generateIntradayBars(spec, daily, 0, 5)
        : range === '1w'
          ? [4, 3, 2, 1, 0].flatMap((offset) => generateIntradayBars(spec, daily, offset, 15))
          : daily
    return { status: 'ok' as const, data, source: source(String(daily[daily.length - 1].time)) }
  }

  async getIndices() {
    const asOf = latestSessionDate()
    return { status: 'ok' as const, data: generateIndices(asOf), source: source(toDateKey(asOf)) }
  }
}

class MockNews implements NewsProvider {
  readonly name = PROVIDER_NAME
  async getStockNews(code: string, limit = 30) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    return { status: 'ok' as const, data: generateNews(spec).slice(0, limit), source: source(toDateKey(latestSessionDate())) }
  }
  async getMarketNews(limit = 20) {
    const all = MOCK_STOCKS.flatMap((s) => generateNews(s)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    return { status: 'ok' as const, data: all.slice(0, limit), source: source(toDateKey(latestSessionDate())) }
  }
}

class MockIR implements IRProvider {
  readonly name = PROVIDER_NAME
  async getDocuments(code: string, limit = 20) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    return { status: 'ok' as const, data: generateIrDocuments(spec).slice(0, limit), source: source(toDateKey(latestSessionDate())) }
  }
}

class MockFinancial implements FinancialDataProvider {
  readonly name = PROVIDER_NAME
  async getFinancials(code: string) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    const data = generateFinancials(spec)
    return { status: 'ok' as const, data, source: source(data[data.length - 1]?.periodEnd ?? '') }
  }
  async getEarnings(code: string) {
    const spec = findMockStock(code)
    if (!spec) return notFound(code)
    const data = generateEarnings(spec)
    return { status: 'ok' as const, data, source: source(data[data.length - 1]?.announcedAt ?? '') }
  }
}

class MockMacro implements MacroDataProvider {
  readonly name = PROVIDER_NAME
  async getEvents(from: string, to: string, code?: string) {
    const events = generateMarketEvents(new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`))
    if (code) {
      const spec = findMockStock(code)
      const next = spec ? generateEarnings(spec).at(-1)?.nextAnnouncement : undefined
      if (spec && next && next >= from && next <= to) {
        events.push({ id: `earn-${spec.code}`, date: next, title: `${spec.name} 決算発表予定（サンプル）`, kind: '決算', code: spec.code })
      }
    }
    events.sort((a, b) => a.date.localeCompare(b.date))
    return { status: 'ok' as const, data: events, source: source(toDateKey(latestSessionDate())) }
  }
}

export function createMockProviders(): Providers {
  return {
    market: new MockMarketData(),
    news: new MockNews(),
    ir: new MockIR(),
    financial: new MockFinancial(),
    macro: new MockMacro(),
  }
}
