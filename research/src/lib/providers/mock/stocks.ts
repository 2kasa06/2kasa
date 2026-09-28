// モックの銘柄マスタ。値はすべて開発用の作り物で、実在企業の実数ではない。

import type { Stock } from '@/lib/types'

export interface MockStockSpec extends Stock {
  sharesOutstanding: number
  /** 最新終値の目安 */
  targetPrice: number
  /** 年率ボラティリティ */
  vol: number
  /** 年率ドリフト */
  drift: number
  /** 1日の平均出来高 */
  avgVolume: number
  /** 通期売上高の目安（百万円・百万ドル） */
  revenueBase: number
  opMargin: number
  /** 決算期末の月（3 = 3月期） */
  fiscalYearEndMonth: number
}

const AUTO = ['7203', '7267', '7201', '7269']
const SEMI = ['8035', '6857', '6920']
const US_TECH = ['AAPL', 'NVDA', 'MSFT']

const peersOf = (group: string[], code: string) => group.filter((c) => c !== code)

export const MOCK_STOCKS: MockStockSpec[] = [
  {
    code: '7203', name: 'トヨタ自動車', nameEn: 'Toyota Motor', ticker: 'TM', market: '東証プライム',
    sector: '輸送用機器', industry: '自動車', currency: 'JPY', sharesOutstanding: 15_794_987_460, peers: peersOf(AUTO, '7203'),
    targetPrice: 2_860, vol: 0.28, drift: 0.08, avgVolume: 28_000_000, revenueBase: 48_000_000, opMargin: 0.1, fiscalYearEndMonth: 3,
  },
  {
    code: '7267', name: '本田技研工業', nameEn: 'Honda Motor', ticker: 'HMC', market: '東証プライム',
    sector: '輸送用機器', industry: '自動車', currency: 'JPY', sharesOutstanding: 5_280_000_000, peers: peersOf(AUTO, '7267'),
    targetPrice: 1_580, vol: 0.3, drift: 0.05, avgVolume: 15_000_000, revenueBase: 21_000_000, opMargin: 0.065, fiscalYearEndMonth: 3,
  },
  {
    code: '7201', name: '日産自動車', nameEn: 'Nissan Motor', ticker: 'NSANY', market: '東証プライム',
    sector: '輸送用機器', industry: '自動車', currency: 'JPY', sharesOutstanding: 3_690_000_000, peers: peersOf(AUTO, '7201'),
    targetPrice: 360, vol: 0.38, drift: -0.05, avgVolume: 40_000_000, revenueBase: 12_500_000, opMargin: 0.012, fiscalYearEndMonth: 3,
  },
  {
    code: '7269', name: 'スズキ', nameEn: 'Suzuki Motor', ticker: 'SZKMY', market: '東証プライム',
    sector: '輸送用機器', industry: '自動車', currency: 'JPY', sharesOutstanding: 1_960_000_000, peers: peersOf(AUTO, '7269'),
    targetPrice: 1_850, vol: 0.3, drift: 0.1, avgVolume: 6_000_000, revenueBase: 5_800_000, opMargin: 0.1, fiscalYearEndMonth: 3,
  },
  {
    code: '6758', name: 'ソニーグループ', nameEn: 'Sony Group', ticker: 'SONY', market: '東証プライム',
    sector: '電気機器', industry: 'エレクトロニクス・エンタメ', currency: 'JPY', sharesOutstanding: 6_150_000_000, peers: ['6501', '6861'],
    targetPrice: 3_900, vol: 0.3, drift: 0.12, avgVolume: 14_000_000, revenueBase: 13_000_000, opMargin: 0.1, fiscalYearEndMonth: 3,
  },
  {
    code: '6861', name: 'キーエンス', nameEn: 'Keyence', ticker: 'KYCCF', market: '東証プライム',
    sector: '電気機器', industry: 'FA・センサー', currency: 'JPY', sharesOutstanding: 243_000_000, peers: ['6758', '6501'],
    targetPrice: 61_000, vol: 0.27, drift: 0.06, avgVolume: 600_000, revenueBase: 1_050_000, opMargin: 0.51, fiscalYearEndMonth: 3,
  },
  {
    code: '6501', name: '日立製作所', nameEn: 'Hitachi', ticker: 'HTHIY', market: '東証プライム',
    sector: '電気機器', industry: '総合電機', currency: 'JPY', sharesOutstanding: 4_600_000_000, peers: ['6758', '6861'],
    targetPrice: 4_100, vol: 0.3, drift: 0.2, avgVolume: 12_000_000, revenueBase: 9_800_000, opMargin: 0.11, fiscalYearEndMonth: 3,
  },
  {
    code: '8035', name: '東京エレクトロン', nameEn: 'Tokyo Electron', ticker: 'TOELY', market: '東証プライム',
    sector: '電気機器', industry: '半導体製造装置', currency: 'JPY', sharesOutstanding: 460_000_000, peers: peersOf(SEMI, '8035'),
    targetPrice: 24_500, vol: 0.42, drift: 0.15, avgVolume: 3_000_000, revenueBase: 2_400_000, opMargin: 0.28, fiscalYearEndMonth: 3,
  },
  {
    code: '6857', name: 'アドバンテスト', nameEn: 'Advantest', ticker: 'ATEYY', market: '東証プライム',
    sector: '電気機器', industry: '半導体製造装置', currency: 'JPY', sharesOutstanding: 730_000_000, peers: peersOf(SEMI, '6857'),
    targetPrice: 9_800, vol: 0.5, drift: 0.25, avgVolume: 9_000_000, revenueBase: 780_000, opMargin: 0.3, fiscalYearEndMonth: 3,
  },
  {
    code: '6920', name: 'レーザーテック', nameEn: 'Lasertec', ticker: 'LSRCY', market: '東証プライム',
    sector: '電気機器', industry: '半導体製造装置', currency: 'JPY', sharesOutstanding: 94_000_000, peers: peersOf(SEMI, '6920'),
    targetPrice: 16_000, vol: 0.55, drift: 0.05, avgVolume: 2_500_000, revenueBase: 250_000, opMargin: 0.4, fiscalYearEndMonth: 6,
  },
  {
    code: '8306', name: '三菱UFJフィナンシャル・グループ', nameEn: 'Mitsubishi UFJ Financial Group', ticker: 'MUFG', market: '東証プライム',
    sector: '銀行業', industry: 'メガバンク', currency: 'JPY', sharesOutstanding: 12_100_000_000, peers: [],
    targetPrice: 2_050, vol: 0.28, drift: 0.18, avgVolume: 45_000_000, revenueBase: 11_000_000, opMargin: 0.25, fiscalYearEndMonth: 3,
  },
  {
    code: '9984', name: 'ソフトバンクグループ', nameEn: 'SoftBank Group', ticker: 'SFTBY', market: '東証プライム',
    sector: '情報・通信業', industry: '投資持株会社', currency: 'JPY', sharesOutstanding: 1_470_000_000, peers: [],
    targetPrice: 12_800, vol: 0.45, drift: 0.12, avgVolume: 9_000_000, revenueBase: 7_200_000, opMargin: 0.08, fiscalYearEndMonth: 3,
  },
  {
    code: 'AAPL', name: 'アップル', nameEn: 'Apple', ticker: 'AAPL', market: 'NASDAQ',
    sector: 'テクノロジー', industry: 'ハードウェア', currency: 'USD', sharesOutstanding: 15_000_000_000, peers: peersOf(US_TECH, 'AAPL'),
    targetPrice: 238, vol: 0.26, drift: 0.12, avgVolume: 55_000_000, revenueBase: 410_000, opMargin: 0.31, fiscalYearEndMonth: 9,
  },
  {
    code: 'NVDA', name: 'エヌビディア', nameEn: 'NVIDIA', ticker: 'NVDA', market: 'NASDAQ',
    sector: 'テクノロジー', industry: '半導体', currency: 'USD', sharesOutstanding: 24_400_000_000, peers: peersOf(US_TECH, 'NVDA'),
    targetPrice: 182, vol: 0.5, drift: 0.35, avgVolume: 220_000_000, revenueBase: 180_000, opMargin: 0.6, fiscalYearEndMonth: 1,
  },
  {
    code: 'MSFT', name: 'マイクロソフト', nameEn: 'Microsoft', ticker: 'MSFT', market: 'NASDAQ',
    sector: 'テクノロジー', industry: 'ソフトウェア', currency: 'USD', sharesOutstanding: 7_430_000_000, peers: peersOf(US_TECH, 'MSFT'),
    targetPrice: 505, vol: 0.24, drift: 0.14, avgVolume: 22_000_000, revenueBase: 290_000, opMargin: 0.45, fiscalYearEndMonth: 6,
  },
]

/** マスタから公開用の Stock だけを取り出す */
export function toStock(spec: MockStockSpec): Stock {
  return {
    code: spec.code,
    name: spec.name,
    nameEn: spec.nameEn,
    ticker: spec.ticker,
    market: spec.market,
    sector: spec.sector,
    industry: spec.industry,
    currency: spec.currency,
    sharesOutstanding: spec.sharesOutstanding,
    peers: spec.peers,
  }
}

export function findMockStock(code: string): MockStockSpec | undefined {
  const normalized = code.trim().toUpperCase()
  return MOCK_STOCKS.find((s) => s.code === normalized || s.ticker === normalized)
}
