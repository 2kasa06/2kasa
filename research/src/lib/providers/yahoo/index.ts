// 実データ（株価のみ）の提供元。
//
// - 日本株の銘柄一覧は JPX の上場銘柄一覧から作った src/data/jp-stocks.json（GitHub Actions が月1回更新）
// - 株価・指数は Yahoo Finance のチャート API（遅延あり）
// - 米国株などは Yahoo の検索 API で見つけ、ティッカーで表示する
// - IR・ニュース・財務・予定は、提供元がまだ無いので「未接続」を返す（作り物は出さない）

import jpStocks from '@/data/jp-stocks.json'
import { searchStocks as searchLocal } from '@/lib/search'
import type { Bar, ChartRange, DataResult, IndexQuote, SourceInfo, Stock } from '@/lib/types'
import type { FinancialDataProvider, IRProvider, MacroDataProvider, MarketDataProvider, NewsProvider, Providers } from '../types'
import { fetchChart, searchYahoo, type ChartResult } from './client'

const PROVIDER = 'Yahoo Finance（遅延あり）'
const JP_CODE = /^\d{3}[0-9A-Z]$/

interface JpRow {
  code: string
  name: string
  market: string
  sector: string
}

const JP: JpRow[] = (jpStocks.rows as string[][]).map(([code, name, market, sector]) => ({ code, name, market, sector }))
const JP_BY_CODE = new Map(JP.map((r) => [r.code, r]))

/** トップページに並べる銘柄 */
const FEATURED = ['7203', '6758', '9984', '8306', '6861', '8035', '6501', '9983', '7974', '8058', '4063', '9432', 'AAPL', 'NVDA', 'MSFT']

export function toSymbol(code: string): string {
  const c = code.trim().toUpperCase()
  return JP_CODE.test(c) ? `${c}.T` : c
}

function fromSymbol(symbol: string): string {
  return symbol.endsWith('.T') ? symbol.slice(0, -2) : symbol
}

function source(asOf: string): SourceInfo {
  return { provider: PROVIDER, isMock: false, asOf, fetchedAt: new Date().toISOString() }
}

const failed = (message = 'データ取得失敗'): DataResult<never> => ({ status: 'error', message })

function jpStock(row: JpRow): Stock {
  return {
    code: row.code,
    name: row.name,
    nameEn: '',
    ticker: `${row.code}.T`,
    market: row.market.startsWith('東証') ? row.market : `東証${row.market}`,
    sector: row.sector,
    industry: row.sector,
    currency: 'JPY',
    sharesOutstanding: null,
    peers: [],
  }
}

function stockFromMeta(code: string, meta: ChartResult['meta']): Stock {
  const row = JP_BY_CODE.get(code)
  if (row) return jpStock(row)
  return {
    code,
    name: meta.longName ?? meta.shortName ?? code,
    nameEn: meta.longName ?? meta.shortName ?? '',
    ticker: meta.symbol,
    market: meta.fullExchangeName ?? meta.exchangeName ?? '',
    sector: meta.instrumentType === 'ETF' ? 'ETF' : '—',
    industry: '—',
    currency: meta.currency === 'JPY' ? 'JPY' : 'USD',
    sharesOutstanding: null,
    peers: [],
  }
}

class YahooMarketData implements MarketDataProvider {
  readonly name = PROVIDER

  async listStocks(): Promise<DataResult<Stock[]>> {
    const stocks = (await Promise.all(FEATURED.map((c) => this.getStock(c))))
      .filter((r): r is Extract<DataResult<Stock>, { status: 'ok' }> => r.status === 'ok')
      .map((r) => r.data)
    return { status: 'ok', data: stocks, source: source(new Date().toISOString()) }
  }

  async getStock(code: string): Promise<DataResult<Stock>> {
    const c = code.trim().toUpperCase()
    const row = JP_BY_CODE.get(c)
    if (row) return { status: 'ok', data: jpStock(row), source: source(jpStocks.asOf ?? new Date().toISOString()) }
    // 一覧に無い（米国株・新規上場など）ときは、チャートの情報から銘柄名を取る
    const chart = await fetchChart(toSymbol(c), 'meta')
    if (!chart) return { status: 'empty', message: `銘柄 ${c} は見つかりません` }
    return { status: 'ok', data: stockFromMeta(c, chart.meta), source: source(new Date().toISOString()) }
  }

  async searchStocks(query: string, limit = 10): Promise<DataResult<Stock[]>> {
    const local = searchLocal(
      JP.map((r) => ({ ...r, ticker: `${r.code}.T`, nameEn: '' })),
      query,
      limit,
    ).map((r) => jpStock(r))
    const out = [...local]
    // 日本語の銘柄名は一覧で足りる。英字・ティッカーのときは Yahoo の検索も使う（米国株など）
    if (out.length < limit && /[a-z]/i.test(query)) {
      for (const q of await searchYahoo(query)) {
        const code = fromSymbol(q.symbol)
        if (out.some((s) => s.code === code)) continue
        // 東証銘柄は一覧の日本語名を優先する
        const row = JP_BY_CODE.get(code)
        out.push(
          row
            ? jpStock(row)
            : { code, name: q.name, nameEn: q.name, ticker: q.symbol, market: q.exchange, sector: '—', industry: '—', currency: q.symbol.endsWith('.T') ? 'JPY' : 'USD', sharesOutstanding: null, peers: [] },
        )
        if (out.length >= limit) break
      }
    }
    return { status: 'ok', data: out, source: source(new Date().toISOString()) }
  }

  async getQuote(code: string) {
    const chart = await fetchChart(toSymbol(code), 'daily-max')
    if (!chart || chart.bars.length < 2) return failed()
    const bars = chart.bars
    const last = bars[bars.length - 1]
    const prev = bars[bars.length - 2]
    const price = chart.meta.regularMarketPrice ?? last.close
    return {
      status: 'ok' as const,
      data: {
        code,
        price,
        previousClose: prev.close,
        change: price - prev.close,
        changePct: ((price - prev.close) / prev.close) * 100,
        volume: last.volume,
        time: chart.meta.regularMarketTime ? new Date(chart.meta.regularMarketTime * 1000).toISOString() : String(last.time),
      },
      source: source(String(last.time)),
    }
  }

  async getHistory(code: string, range: ChartRange): Promise<DataResult<Bar[]>> {
    const span = range === '1d' ? 'intraday-1d' : range === '1w' ? 'intraday-5d' : 'daily-max'
    const chart = await fetchChart(toSymbol(code), span)
    if (!chart) return failed()
    const asOf = String(chart.bars[chart.bars.length - 1].time)
    return { status: 'ok', data: chart.bars, source: source(/^\d+$/.test(asOf) ? new Date(Number(asOf) * 1000).toISOString() : asOf) }
  }

  async getIndices(): Promise<DataResult<IndexQuote[]>> {
    const results = await Promise.all(INDICES.map(async (spec) => ({ spec, chart: await fetchChart(spec.symbol, 'meta') })))
    const data: IndexQuote[] = []
    for (const { spec, chart } of results) {
      // 取れなかった指数は並べない（0 や前回値を正常値として出さない）
      if (!chart || chart.bars.length < 2) continue
      const prev = chart.bars[chart.bars.length - 2].close
      const value = chart.meta.regularMarketPrice ?? chart.bars[chart.bars.length - 1].close
      data.push({
        id: spec.id,
        name: spec.name,
        group: spec.group,
        value,
        previousClose: prev,
        change: value - prev,
        changePct: ((value - prev) / prev) * 100,
        digits: spec.digits,
        unit: spec.unit,
        time: chart.meta.regularMarketTime ? new Date(chart.meta.regularMarketTime * 1000).toISOString() : String(chart.bars.at(-1)!.time),
      })
    }
    if (data.length === 0) return failed()
    return { status: 'ok', data, source: source(new Date().toISOString()) }
  }
}

const INDICES: Array<{ id: string; symbol: string; name: string; group: IndexQuote['group']; digits: number; unit?: string }> = [
  { id: 'n225', symbol: '^N225', name: '日経平均', group: '日本', digits: 2, unit: '円' },
  { id: 'topix', symbol: '1306.T', name: 'TOPIX（連動ETF 1306）', group: '日本', digits: 1, unit: '円' },
  { id: 'growth', symbol: '2516.T', name: 'グロース250（連動ETF 2516）', group: '日本', digits: 1, unit: '円' },
  { id: 'reit', symbol: '1343.T', name: '東証REIT（連動ETF 1343）', group: '日本', digits: 1, unit: '円' },
  { id: 'spx', symbol: '^GSPC', name: 'S&P 500', group: '米国', digits: 2 },
  { id: 'ndq', symbol: '^IXIC', name: 'NASDAQ総合', group: '米国', digits: 2 },
  { id: 'dji', symbol: '^DJI', name: 'NYダウ', group: '米国', digits: 2, unit: 'ドル' },
  { id: 'usdjpy', symbol: 'JPY=X', name: 'ドル円', group: '為替・金利', digits: 3, unit: '円' },
  { id: 'us10y', symbol: '^TNX', name: '米10年債利回り', group: '為替・金利', digits: 3, unit: '%' },
  { id: 'gold', symbol: 'GC=F', name: '金（NY先物）', group: '商品', digits: 1, unit: 'ドル' },
  { id: 'wti', symbol: 'CL=F', name: 'WTI原油', group: '商品', digits: 2, unit: 'ドル' },
  { id: 'vix', symbol: '^VIX', name: 'VIX', group: 'ボラティリティ', digits: 2 },
  { id: 'btc', symbol: 'BTC-USD', name: 'ビットコイン', group: '暗号資産', digits: 0, unit: 'ドル' },
]

// --- まだ提供元の無い項目 ----------------------------------------------

const NOT_CONNECTED = 'この項目のデータ提供元はまだ接続していません'
const notConnected = async (): Promise<DataResult<never>> => ({ status: 'empty', message: NOT_CONNECTED })

class NotConnected implements NewsProvider, IRProvider, FinancialDataProvider, MacroDataProvider {
  readonly name = '未接続'
  getStockNews = notConnected
  getMarketNews = notConnected
  getDocuments = notConnected
  getFinancials = notConnected
  getEarnings = notConnected
  getEvents = notConnected
}

export function createYahooProviders(): Providers {
  const none = new NotConnected()
  return { market: new YahooMarketData(), news: none, ir: none, financial: none, macro: none }
}
