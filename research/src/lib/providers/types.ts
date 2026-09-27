// データ取得層のインターフェース。UI はこれ越しにしかデータに触れない。
// 提供元を変えるときは実装クラスを差し替えるだけで済むようにする。

import type {
  Bar,
  ChartRange,
  DataResult,
  EarningsReport,
  FinancialStatement,
  IndexQuote,
  IrDocument,
  MarketEvent,
  NewsArticle,
  Quote,
  Stock,
} from '@/lib/types'

export interface MarketDataProvider {
  readonly name: string
  listStocks(): Promise<DataResult<Stock[]>>
  getStock(code: string): Promise<DataResult<Stock>>
  searchStocks(query: string, limit?: number): Promise<DataResult<Stock[]>>
  getQuote(code: string): Promise<DataResult<Quote>>
  /**
   * 足を返す。'1d' は5分足、'1w' は15分足、それ以外は日足（全期間）。
   * 指標の計算に余裕を持たせるため、呼び出し側は 'max' を取って自分で切り出す想定。
   */
  getHistory(code: string, range: ChartRange): Promise<DataResult<Bar[]>>
  getIndices(): Promise<DataResult<IndexQuote[]>>
}

export interface NewsProvider {
  readonly name: string
  getStockNews(code: string, limit?: number): Promise<DataResult<NewsArticle[]>>
  getMarketNews(limit?: number): Promise<DataResult<NewsArticle[]>>
}

export interface IRProvider {
  readonly name: string
  getDocuments(code: string, limit?: number): Promise<DataResult<IrDocument[]>>
}

export interface FinancialDataProvider {
  readonly name: string
  /** 年次（FY）と四半期（Q1〜Q4）を古い順で返す */
  getFinancials(code: string): Promise<DataResult<FinancialStatement[]>>
  getEarnings(code: string): Promise<DataResult<EarningsReport[]>>
}

export interface MacroDataProvider {
  readonly name: string
  getEvents(from: string, to: string, code?: string): Promise<DataResult<MarketEvent[]>>
}

export interface Providers {
  market: MarketDataProvider
  news: NewsProvider
  ir: IRProvider
  financial: FinancialDataProvider
  macro: MacroDataProvider
}
