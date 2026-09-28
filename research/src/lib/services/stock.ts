// 銘柄ページに必要なデータを一度に集める。
// 各欄は DataResult のまま返し、1つの取得失敗で他の欄まで消えないようにする。

import 'server-only'
import { groupNews } from '@/lib/analysis/news-group'
import { cached } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { getProviders } from '@/lib/providers'
import { adx, atr, bollinger, macd, rsi, sma, stochastic, volumeRatio } from '@/lib/technical/indicators'
import { backtestAll, type BacktestResult } from '@/lib/technical/backtest'
import { analyzeSignals, type Signal } from '@/lib/technical/signals'
import type {
  Bar,
  DataResult,
  EarningsReport,
  FinancialStatement,
  IrDocument,
  MarketEvent,
  NewsGroup,
  Quote,
  SourceInfo,
  Stock,
} from '@/lib/types'

export interface Valuation {
  marketCap: number | null
  /** 直近4四半期のEPS合計 */
  epsTtm: number | null
  per: number | null
  pbr: number | null
  bps: number | null
  /** 直近通期の1株配当 ÷ 株価 */
  dividendYield: number | null
  dividendPerShare: number | null
}

export interface TechnicalSnapshot {
  date: string
  close: number
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHist: number | null
  sma5: number | null
  sma25: number | null
  sma75: number | null
  sma200: number | null
  bbZ: number | null
  bbUpper: number | null
  bbLower: number | null
  adx: number | null
  stochK: number | null
  atr: number | null
  volumeRatio: number | null
}

export interface SignalBundle {
  current: Signal[]
  history: Signal[]
  backtests: Record<string, BacktestResult>
  activeCount: number
  snapshot: TechnicalSnapshot
  source: SourceInfo
}

export interface SummaryItem {
  label: string
  detail?: string
  date?: string
  tone?: 'up' | 'down' | 'neutral'
  href?: string
}

export interface StatusSummary {
  technical: SummaryItem[]
  ir: SummaryItem[]
  news: SummaryItem[]
  earnings: SummaryItem[]
}

export interface StockPageData {
  stock: Stock
  stockSource: SourceInfo
  quote: DataResult<Quote>
  valuation: Valuation
  signals: DataResult<SignalBundle>
  ir: DataResult<IrDocument[]>
  news: DataResult<NewsGroup[]>
  financials: DataResult<FinancialStatement[]>
  earnings: DataResult<EarningsReport[]>
  events: DataResult<MarketEvent[]>
  summary: StatusSummary
}

const last = <T,>(xs: (T | null)[]): T | null => (xs.length ? xs[xs.length - 1] : null)

function snapshotOf(bars: Bar[]): TechnicalSnapshot {
  const closes = bars.map((b) => b.close)
  const m = macd(closes)
  const bb = bollinger(closes)
  return {
    date: String(bars[bars.length - 1].time),
    close: closes[closes.length - 1],
    rsi: last(rsi(closes)),
    macd: last(m.macd),
    macdSignal: last(m.signal),
    macdHist: last(m.histogram),
    sma5: last(sma(closes, 5)),
    sma25: last(sma(closes, 25)),
    sma75: last(sma(closes, 75)),
    sma200: last(sma(closes, 200)),
    bbZ: last(bb.zScore),
    bbUpper: last(bb.upper),
    bbLower: last(bb.lower),
    adx: last(adx(bars).adx),
    stochK: last(stochastic(bars).k),
    atr: last(atr(bars)),
    volumeRatio: last(volumeRatio(bars)),
  }
}

export async function getSignalBundle(code: string): Promise<DataResult<SignalBundle>> {
  const { market } = getProviders()
  const history = await market.getHistory(code, 'max')
  if (history.status !== 'ok') return history
  if (history.data.length < 30) return { status: 'empty', message: 'シグナル判定に必要な株価データが足りません' }
  const bars = history.data
  return cached(`signals:${code}:${history.source.asOf}`, 600, async () => {
    const { current, history: events } = analyzeSignals(bars)
    return {
      status: 'ok' as const,
      data: {
        current,
        history: events.slice(0, 80),
        backtests: backtestAll(bars, [...events].reverse()),
        activeCount: current.filter((s) => s.active).length,
        snapshot: snapshotOf(bars),
        source: history.source,
      },
      source: history.source,
    }
  })
}

function valuationOf(stock: Stock, quote: DataResult<Quote>, fin: DataResult<FinancialStatement[]>): Valuation {
  const price = quote.status === 'ok' ? quote.data.price : null
  const empty: Valuation = { marketCap: null, epsTtm: null, per: null, pbr: null, bps: null, dividendYield: null, dividendPerShare: null }
  if (price === null) return empty
  const marketCap = stock.sharesOutstanding ? (price * stock.sharesOutstanding) / 1e6 : null
  if (fin.status !== 'ok') return { ...empty, marketCap }
  const quarters = fin.data.filter((f) => f.period !== 'FY')
  const lastFour = quarters.slice(-4)
  const epsTtm = lastFour.length === 4 ? lastFour.reduce((a, q) => a + q.eps, 0) : null
  const latest = quarters[quarters.length - 1]
  const lastFy = fin.data.filter((f) => f.period === 'FY').at(-1)
  const bps = latest?.bps ?? null
  const dps = lastFy?.dividendPerShare ?? null
  return {
    marketCap,
    epsTtm,
    // 赤字（EPS ≤ 0）のときの PER は意味を持たないので出さない
    per: epsTtm !== null && epsTtm > 0 ? price / epsTtm : null,
    pbr: bps !== null && bps > 0 ? price / bps : null,
    bps,
    dividendYield: dps !== null ? (dps / price) * 100 : null,
    dividendPerShare: dps,
  }
}

function buildSummary(
  code: string,
  signals: DataResult<SignalBundle>,
  ir: DataResult<IrDocument[]>,
  news: DataResult<NewsGroup[]>,
  earnings: DataResult<EarningsReport[]>,
): StatusSummary {
  const technical: SummaryItem[] = []
  if (signals.status === 'ok') {
    const { current, snapshot } = signals.data
    // 条件の強いもの・新しいものから最大4件
    for (const s of current.filter((x) => x.active && x.kind === 'event').slice(0, 3)) {
      technical.push({ label: s.label, date: s.date, tone: s.tone, href: '#signals' })
    }
    if (snapshot.rsi !== null) {
      technical.push({
        label: 'RSI(14)',
        detail: `${snapshot.rsi.toFixed(1)}${snapshot.rsi < 30 ? '（30未満）' : snapshot.rsi > 70 ? '（70超）' : ''}`,
        tone: snapshot.rsi < 30 ? 'up' : snapshot.rsi > 70 ? 'down' : 'neutral',
      })
    }
    if (snapshot.sma25 !== null) {
      const gap = ((snapshot.close - snapshot.sma25) / snapshot.sma25) * 100
      technical.push({
        label: '25日移動平均線',
        detail: `${Math.abs(gap) <= 1 ? '付近' : gap > 0 ? '上回る' : '下回る'}（乖離 ${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(1)}%）`,
        tone: Math.abs(gap) <= 1 ? 'neutral' : gap > 0 ? 'up' : 'down',
      })
    }
    if (snapshot.volumeRatio !== null) {
      const pct = (snapshot.volumeRatio - 1) * 100
      technical.push({
        label: '出来高',
        detail: `20日平均比 ${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(0)}%`,
        tone: 'neutral',
      })
    }
  }

  const irItems: SummaryItem[] =
    ir.status === 'ok'
      ? ir.data
          .filter((d) => d.importance !== 'normal')
          .slice(0, 2)
          .map((d) => ({ label: d.type, detail: d.title, date: d.publishedAt, href: '#ir' }))
      : []

  const newsItems: SummaryItem[] =
    news.status === 'ok'
      ? news.data.slice(0, 2).map((g) => ({
          label: g.category,
          detail: g.lead.title + (g.articles.length > 1 ? `（関連報道 ${g.articles.length}件）` : ''),
          date: g.latestAt,
          href: '#news',
        }))
      : []

  const earningsItems: SummaryItem[] = []
  if (earnings.status === 'ok') {
    const latest = earnings.data.at(-1)
    if (latest?.nextAnnouncement) earningsItems.push({ label: '次回決算', detail: '発表予定日', date: latest.nextAnnouncement, href: '#earnings' })
    if (latest) {
      earningsItems.push({
        label: '直近決算',
        detail: `${latest.fiscalYear}年 ${latest.period === 'FY' ? '通期' : latest.period}`,
        date: latest.announcedAt,
        href: '#earnings',
      })
    }
  }
  // 取れなかった欄は「無い」ではなく「取れていない」と分かるようにする
  const unavailable = (r: DataResult<unknown>): SummaryItem[] =>
    r.status === 'error' ? [{ label: 'データ取得失敗' }] : r.status === 'empty' && r.message ? [{ label: '未接続', detail: r.message }] : []
  logger.debug('summary.built', { code, technical: technical.length })
  return {
    technical,
    ir: ir.status === 'ok' ? irItems : unavailable(ir),
    news: news.status === 'ok' ? newsItems : unavailable(news),
    earnings: earnings.status === 'ok' ? earningsItems : unavailable(earnings),
  }
}

/** 取得処理そのものが例外を投げたときも、その欄だけを「取得失敗」にする */
async function safe<T>(label: string, code: string, run: () => Promise<DataResult<T>>): Promise<DataResult<T>> {
  try {
    return await run()
  } catch (err) {
    logger.error('data.fetch_failed', { section: label, code, err })
    return { status: 'error', message: 'データの取得に失敗しました' }
  }
}

function addDays(dateKey: string, days: number): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
}

/** 銘柄が無ければ null（ページは 404 にする） */
export async function getStockPageData(code: string): Promise<StockPageData | null> {
  const p = getProviders()
  const stockResult = await safe('stock', code, () => p.market.getStock(code))
  if (stockResult.status !== 'ok') return null
  const stock = stockResult.data

  const today = new Date().toISOString().slice(0, 10)
  const [quote, signals, ir, newsRaw, financials, earnings, events] = await Promise.all([
    safe('quote', code, () => p.market.getQuote(stock.code)),
    safe('signals', code, () => getSignalBundle(stock.code)),
    safe('ir', code, () => p.ir.getDocuments(stock.code)),
    safe('news', code, () => p.news.getStockNews(stock.code)),
    safe('financials', code, () => p.financial.getFinancials(stock.code)),
    safe('earnings', code, () => p.financial.getEarnings(stock.code)),
    safe('events', code, () => p.macro.getEvents(today, addDays(today, 60), stock.code)),
  ])

  const news: DataResult<NewsGroup[]> =
    newsRaw.status === 'ok' ? { status: 'ok', data: groupNews(newsRaw.data), source: newsRaw.source } : newsRaw

  return {
    stock,
    stockSource: stockResult.source,
    quote,
    valuation: valuationOf(stock, quote, financials),
    signals,
    ir,
    news,
    financials,
    earnings,
    events,
    summary: buildSummary(stock.code, signals, ir, news, earnings),
  }
}
