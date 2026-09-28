import { describe, expect, it } from 'vitest'
import { parseChart, parseSearch } from './client'
import { toSymbol } from './index'

// 2026-09-24/25 の 9:00 JST（= 00:00 UTC）の足
const T1 = Date.UTC(2026, 8, 24, 0, 0) / 1000
const T2 = Date.UTC(2026, 8, 25, 0, 0) / 1000

const chart = (overrides: Record<string, unknown> = {}) => ({
  chart: {
    result: [
      {
        meta: { symbol: '7203.T', currency: 'JPY', gmtoffset: 32400, regularMarketPrice: 2990, longName: 'Toyota Motor Corporation' },
        timestamp: [T1, T2, T2 + 60],
        indicators: {
          quote: [{ open: [2900, 2950, 2960], high: [2950, 3000, 2995], low: [2890, 2940, 2955], close: [2940, 2980, 2990], volume: [100, null, 50] }],
        },
        ...overrides,
      },
    ],
  },
})

describe('Yahoo チャート', () => {
  it('日足は現地日付にし、同じ日の足は後の方を採る', () => {
    const r = parseChart(chart(), true)!
    expect(r.bars.map((b) => b.time)).toEqual(['2026-09-24', '2026-09-25'])
    expect(r.bars[1].close).toBe(2990)
    expect(r.meta.longName).toBe('Toyota Motor Corporation')
  })
  it('値が欠けた足は飛ばし、出来高の欠けは 0 にする', () => {
    const json = chart({
      timestamp: [T1, T2],
      indicators: { quote: [{ open: [null, 2950], high: [null, 3000], low: [null, 2940], close: [null, 2980], volume: [null, null] }] },
    })
    const r = parseChart(json, true)!
    expect(r.bars).toHaveLength(1)
    expect(r.bars[0].volume).toBe(0)
  })
  it('日中足は UNIX 秒のまま', () => {
    expect(parseChart(chart(), false)!.bars[0].time).toBe(T1)
  })
  it('エラー応答や空は null', () => {
    expect(parseChart({ chart: { result: null, error: { code: 'Not Found' } } }, true)).toBeNull()
    expect(parseChart({}, true)).toBeNull()
  })
})

describe('Yahoo 検索', () => {
  it('株式と ETF だけを返す', () => {
    const r = parseSearch({
      quotes: [
        { symbol: 'AAPL', quoteType: 'EQUITY', longname: 'Apple Inc.', exchDisp: 'NASDAQ' },
        { symbol: 'AAPL250117C00100000', quoteType: 'OPTION' },
        { symbol: '1306.T', quoteType: 'ETF', shortname: 'NEXT FUNDS TOPIX', exchange: 'JPX' },
      ],
    })
    expect(r.map((q) => q.symbol)).toEqual(['AAPL', '1306.T'])
    expect(r[0].name).toBe('Apple Inc.')
  })
})

describe('銘柄コードの変換', () => {
  it('東証の4桁コード（英字入りを含む）は .T を付ける', () => {
    expect(toSymbol('7203')).toBe('7203.T')
    expect(toSymbol('130a')).toBe('130A.T')
    expect(toSymbol('aapl')).toBe('AAPL')
  })
})
