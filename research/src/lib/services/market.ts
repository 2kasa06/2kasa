// トップページ用の市場データ。

import 'server-only'
import { getProviders } from '@/lib/providers'
import { getSignalBundle } from './stock'
import type { DataResult, IndexQuote, Quote, SourceInfo, Stock } from '@/lib/types'
import type { Signal } from '@/lib/technical/signals'

export interface MarketFact {
  area: string
  text: string
  tone: 'up' | 'down' | 'flat'
}

/**
 * 「今日の市場環境」の事実部分。指数の数値から機械的に作る文で、解釈は入れない。
 * AI による要約・解釈は別枠（AI生成と明示）で出す。
 */
export function marketFacts(indices: IndexQuote[]): MarketFact[] {
  const by = (id: string) => indices.find((x) => x.id === id)
  const line = (area: string, ids: string[]): MarketFact | null => {
    const items = ids.map(by).filter((x): x is IndexQuote => Boolean(x))
    if (items.length === 0) return null
    const text = items
      .map((x) => `${x.name}は前日比 ${x.changePct >= 0 ? '+' : '−'}${Math.abs(x.changePct).toFixed(2)}%`)
      .join('、')
    const avg = items.reduce((a, x) => a + x.changePct, 0) / items.length
    return { area, text, tone: Math.abs(avg) < 0.05 ? 'flat' : avg > 0 ? 'up' : 'down' }
  }
  return [
    line('日本株', ['n225', 'topix', 'growth']),
    line('米国株', ['spx', 'ndq', 'dji']),
    line('為替', ['usdjpy']),
    line('金利', ['us10y']),
    line('コモディティ', ['gold', 'wti']),
    line('暗号資産', ['btc']),
  ].filter((x): x is MarketFact => x !== null)
}

export interface StockRow {
  stock: Stock
  quote: Quote | null
  signals: Signal[]
}

export interface MarketOverview {
  indices: DataResult<IndexQuote[]>
  rows: StockRow[]
  rowsSource: SourceInfo | null
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const { market } = getProviders()
  const [indices, list] = await Promise.all([market.getIndices(), market.listStocks()])
  if (list.status !== 'ok') return { indices, rows: [], rowsSource: null }

  const rows = await Promise.all(
    list.data.map(async (stock) => {
      const [quote, bundle] = await Promise.all([market.getQuote(stock.code), getSignalBundle(stock.code)])
      return {
        stock,
        quote: quote.status === 'ok' ? quote.data : null,
        signals: bundle.status === 'ok' ? bundle.data.current.filter((s) => s.active && s.kind === 'event') : [],
      }
    }),
  )
  return { indices, rows, rowsSource: list.source }
}
