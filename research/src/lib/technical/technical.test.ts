import { describe, expect, it } from 'vitest'
import type { Bar } from '@/lib/types'
import { adx, atr, bollinger, cci, ema, ichimoku, macd, obv, roc, rsi, sma, stochastic, volumeRatio, vwap, williamsR, wma } from './indicators'
import { analyzeSignals, detectEvents, detectStates } from './signals'
import { backtestSignal, MIN_RELIABLE_SAMPLES } from './backtest'

const bar = (i: number, close: number, volume = 1000): Bar => ({
  time: `2026-01-${String(i + 1).padStart(2, '0')}`,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume,
})

function barsFrom(closes: number[], volumes?: number[]): Bar[] {
  return closes.map((c, i) => ({
    time: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: volumes?.[i] ?? 1000,
  }))
}

const close = (a: number | null, b: number, digits = 6) => {
  expect(a).not.toBeNull()
  expect(a as number).toBeCloseTo(b, digits)
}

describe('移動平均', () => {
  it('SMA は足りない先頭を null にする', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })
  it('EMA は SMA で種をまく', () => {
    const e = ema([1, 2, 3, 4, 5], 3)
    expect(e.slice(0, 2)).toEqual([null, null])
    close(e[2], 2)
    close(e[3], 3) // 4*0.5 + 2*0.5
    close(e[4], 4)
  })
  it('WMA は新しい値ほど重い', () => {
    close(wma([1, 2, 3], 3)[2], (1 + 4 + 9) / 6)
  })
})

describe('オシレーター', () => {
  it('RSI: 上げ続けると 100、下げ続けると 0', () => {
    const up = rsi(Array.from({ length: 30 }, (_, i) => 100 + i), 14)
    expect(up[13]).toBeNull()
    expect(up[29]).toBe(100)
    const down = rsi(Array.from({ length: 30 }, (_, i) => 100 - i), 14)
    expect(down[29]).toBe(0)
  })
  it('RSI: Wilder の既知の例に一致する', () => {
    // Wilder の教科書例（14日）。初回 RSI ≈ 70.53
    const closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28]
    close(rsi(closes, 14)[14], 70.46, 1)
  })
  it('ストキャスティクス・%R・CCI・ROC の範囲', () => {
    const bars = barsFrom(Array.from({ length: 60 }, (_, i) => 100 + 10 * Math.sin(i / 5)))
    const st = stochastic(bars)
    for (const v of st.k) if (v !== null) expect(v).toBeGreaterThanOrEqual(0)
    for (const v of williamsR(bars)) if (v !== null) expect(v).toBeLessThanOrEqual(0)
    expect(cci(bars).filter((v) => v !== null).length).toBeGreaterThan(0)
    close(roc([100, 110], 1)[1], 10)
  })
})

describe('トレンド・ボラティリティ・出来高', () => {
  it('MACD のヒストグラム = MACD − シグナル', () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + i * 0.5 + Math.sin(i))
    const m = macd(closes)
    const i = 79
    close(m.histogram[i], (m.macd[i] as number) - (m.signal[i] as number))
    expect(m.signal[30]).toBeNull()
  })
  it('ボリンジャー: 一定値ならバンド幅 0、σ位置 0', () => {
    const b = bollinger(Array(25).fill(10), 20, 2)
    expect(b.upper[24]).toBe(10)
    expect(b.zScore[24]).toBe(0)
  })
  it('ATR・ADX が値を返す', () => {
    const bars = barsFrom(Array.from({ length: 60 }, (_, i) => 100 + i))
    expect(atr(bars)[59]).toBeCloseTo(2, 5)
    const a = adx(bars)
    expect(a.plusDI[59]!).toBeGreaterThan(a.minusDI[59]!)
  })
  it('OBV・VWAP・出来高倍率', () => {
    const bars = [bar(0, 10, 100), bar(1, 11, 200), bar(2, 10, 50)]
    expect(obv(bars)).toEqual([0, 200, 150])
    close(vwap(bars)[0], 10)
    const vr = volumeRatio(barsFrom(Array(22).fill(10), [...Array(21).fill(100), 300]), 20)
    close(vr[21], 3)
  })
  it('一目均衡表: 転換線は9本の高値安値の中値', () => {
    const bars = barsFrom(Array.from({ length: 60 }, (_, i) => i))
    const ich = ichimoku(bars)
    close(ich.tenkan[8], ((8 + 1) + (0 - 1)) / 2)
    expect(ich.displacement).toBe(26)
  })
})

describe('シグナル検出', () => {
  // 下げてから上げる形。25日と75日のクロスが1回ずつ起きる
  const closes = [
    ...Array.from({ length: 120 }, (_, i) => 200 - i * 0.8),
    ...Array.from({ length: 120 }, (_, i) => 104 + i * 1.2),
  ]
  const bars = barsFrom(closes)

  it('ゴールデンクロス（25日・75日）を検出し、発生時の数値を持つ', () => {
    const events = detectEvents(bars)
    const gc = events.filter((e) => e.type === 'ma_gc_25_75')
    expect(gc.length).toBe(1)
    expect(gc[0].values.SMA25).toBeGreaterThan(gc[0].values.SMA75)
    expect(gc[0].active).toBe(true)
    expect(gc[0].condition).toContain('下から上に')
  })
  it('投資判断の語を使わない', () => {
    const { current, history } = analyzeSignals(bars)
    const text = JSON.stringify([...current, ...history])
    for (const word of ['買い', '売り', '推奨', 'おすすめ']) expect(text).not.toContain(word)
  })
  it('RSI 30未満の状態を開始日つきで返す', () => {
    const falling = barsFrom(Array.from({ length: 60 }, (_, i) => 100 - i))
    const states = detectStates(falling)
    const low = states.find((s) => s.type === 'state_rsi_low')
    expect(low).toBeDefined()
    expect(low!.active).toBe(true)
    expect(low!.index).toBeLessThan(59)
  })
})

describe('過去検証', () => {
  it('h 日後の変化率を集計し、サンプル不足を示す', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + 10 * Math.sin(i / 8) + i * 0.05)
    const bars = barsFrom(closes)
    const events = detectEvents(bars)
    const r = backtestSignal(bars, events, 'macd_gc')!
    expect(r.occurrences).toBeGreaterThan(0)
    expect(r.lowSample).toBe(r.occurrences < MIN_RELIABLE_SAMPLES)
    const h5 = r.stats.find((s) => s.horizon === 5)!
    expect(h5.samples).toBeLessThanOrEqual(r.occurrences)
    expect(h5.min!).toBeLessThanOrEqual(h5.max!)
  })
})
