// ドメインの型。UI・API・データ取得層が共有する。
// 値は必ず「どこから・いつ取ったか」と一緒に運ぶ（SourceInfo）。

/** データの出所。UI に必ず表示する。 */
export interface SourceInfo {
  /** 提供元の名前（例: "サンプルデータ", "J-Quants"） */
  provider: string
  /** モックかどうか。true のとき UI は「サンプルデータ」と明示する */
  isMock: boolean
  /** データの時点（ISO 8601） */
  asOf: string
  /** 取得した時刻（ISO 8601） */
  fetchedAt: string
}

/**
 * 取得結果。失敗や欠損を 0 / null の正常値として流さないための型。
 * ok 以外のときは UI が「データ取得失敗」「データなし」を出す。
 */
export type DataResult<T> =
  | { status: 'ok'; data: T; source: SourceInfo }
  | { status: 'empty'; source?: SourceInfo; message?: string }
  | { status: 'error'; message: string }

export type Market = '東証プライム' | '東証スタンダード' | '東証グロース' | 'NYSE' | 'NASDAQ'

export interface Stock {
  code: string
  name: string
  nameEn: string
  ticker: string
  market: Market
  sector: string
  industry: string
  currency: 'JPY' | 'USD'
  sharesOutstanding: number
  /** 同業他社のコード */
  peers: string[]
}

export interface Bar {
  /** 日足は 'YYYY-MM-DD'、日中足は UNIX 秒 */
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Quote {
  code: string
  price: number
  previousClose: number
  change: number
  changePct: number
  volume: number
  /** 値の時点 */
  time: string
}

export type ChartRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'max'

export interface IndexQuote {
  id: string
  name: string
  group: '日本' | '米国' | '為替・金利' | '商品' | 'ボラティリティ' | '暗号資産'
  value: number
  previousClose: number
  change: number
  changePct: number
  digits: number
  unit?: string
  time: string
}

export type IrType =
  | '決算短信'
  | '決算説明資料'
  | '有価証券報告書'
  | '適時開示'
  | '配当'
  | '自社株買い'
  | '株式分割'
  | '業績予想修正'
  | 'M&A'
  | '人事'
  | '新商品'
  | 'その他'

export type IrImportance = 'critical' | 'important' | 'normal'

export interface IrDocument {
  id: string
  code: string
  type: IrType
  title: string
  publishedAt: string
  importance: IrImportance
  /** 重要度の判定根拠 */
  importanceReason: string
  /** 判定・要約を AI が行ったか */
  aiClassified: boolean
  /** 3行要約: 何が発表されたか / 業績への影響 / 今後の注目点 */
  summary?: [string, string, string]
  sourceUrl: string
  sourceName: string
}

export type NewsCategory = '決算' | 'IR' | '業界' | '市場' | '商品' | 'M&A' | '経営' | '規制' | '海外' | 'その他'
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'review'

export interface NewsArticle {
  id: string
  title: string
  publishedAt: string
  media: string
  url: string
  summary?: string
  category: NewsCategory
  relatedCodes: string[]
  /** AI による分類。review は「中立/要確認」 */
  sentiment?: Sentiment
}

/** 同じ出来事を報じた記事の束 */
export interface NewsGroup {
  key: string
  lead: NewsArticle
  articles: NewsArticle[]
  category: NewsCategory
  sentiment?: Sentiment
  latestAt: string
}

export type FiscalPeriod = 'FY' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

/** 金額はすべて百万円（USD 銘柄は百万ドル） */
export interface FinancialStatement {
  fiscalYear: number
  period: FiscalPeriod
  /** 期末日 */
  periodEnd: string
  revenue: number
  operatingIncome: number
  ordinaryIncome: number
  netIncome: number
  eps: number
  bps: number
  totalAssets: number
  equity: number
  interestBearingDebt: number
  cash: number
  operatingCashFlow: number
  investingCashFlow: number
  dividendPerShare: number
  buyback: number
}

export interface EarningsReport {
  fiscalYear: number
  period: FiscalPeriod
  announcedAt: string
  actual: Pick<FinancialStatement, 'revenue' | 'operatingIncome' | 'netIncome' | 'eps'>
  /** 会社予想（通期） */
  companyForecast?: Pick<FinancialStatement, 'revenue' | 'operatingIncome' | 'netIncome' | 'eps'>
  /** 市場予想（コンセンサス）。取れない場合は undefined */
  consensus?: Pick<FinancialStatement, 'revenue' | 'operatingIncome' | 'netIncome' | 'eps'>
  nextAnnouncement?: string
}

export interface MarketEvent {
  id: string
  date: string
  title: string
  kind: '決算' | '権利確定' | '金融政策' | '経済指標' | 'SQ' | 'IPO' | 'IR'
  code?: string
}
