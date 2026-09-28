// テクニカル指標の計算。TA-Lib に相当する定義を TypeScript で実装する。
//
// すべて入力と同じ長さの配列を返し、計算に足りない先頭部分は null にする。
// null を 0 で埋めない（チャートや判定で本物の 0 と区別できなくなるため）。

import type { Bar } from '@/lib/types'

export type Series = (number | null)[]

const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

export function sma(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  let sum = 0
  let count = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNum(v)) {
      sum = 0
      count = 0
      continue
    }
    sum += v
    count++
    if (count > period) {
      sum -= values[i - period] as number
      count = period
    }
    if (count === period) out[i] = sum / period
  }
  return out
}

/** 指数移動平均。最初の値は単純移動平均で種をまく（TA-Lib と同じ） */
export function ema(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  const k = 2 / (period + 1)
  let prev: number | null = null
  let seed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNum(v)) continue
    if (prev === null) {
      seed.push(v)
      if (seed.length === period) {
        prev = seed.reduce((a, b) => a + b, 0) / period
        out[i] = prev
        seed = []
      }
      continue
    }
    prev = v * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/** 加重移動平均（新しい値ほど重い） */
export function wma(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  const denom = (period * (period + 1)) / 2
  for (let i = period - 1; i < values.length; i++) {
    let acc = 0
    let ok = true
    for (let j = 0; j < period; j++) {
      const v = values[i - period + 1 + j]
      if (!isNum(v)) {
        ok = false
        break
      }
      acc += v * (j + 1)
    }
    if (ok) out[i] = acc / denom
  }
  return out
}

/** Wilder の平滑化（RSI・ATR・ADX で使う） */
function wilder(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  let prev: number | null = null
  const seed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNum(v)) continue
    if (prev === null) {
      seed.push(v)
      if (seed.length === period) {
        prev = seed.reduce((a, b) => a + b, 0) / period
        out[i] = prev
      }
      continue
    }
    prev = (prev * (period - 1) + v) / period
    out[i] = prev
  }
  return out
}

export function rsi(closes: number[], period = 14): Series {
  const gains: Series = [null]
  const losses: Series = [null]
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gains.push(Math.max(d, 0))
    losses.push(Math.max(-d, 0))
  }
  const g = wilder(gains, period)
  const l = wilder(losses, period)
  return closes.map((_, i) => {
    const gi = g[i]
    const li = l[i]
    if (!isNum(gi) || !isNum(li)) return null
    if (li === 0) return gi === 0 ? 50 : 100
    return 100 - 100 / (1 + gi / li)
  })
}

export interface MacdResult {
  macd: Series
  signal: Series
  histogram: Series
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const f = ema(closes, fast)
  const s = ema(closes, slow)
  const line: Series = closes.map((_, i) => (isNum(f[i]) && isNum(s[i]) ? (f[i] as number) - (s[i] as number) : null))
  const signal = ema(line, signalPeriod)
  const histogram: Series = line.map((v, i) => (isNum(v) && isNum(signal[i]) ? v - (signal[i] as number) : null))
  return { macd: line, signal, histogram }
}

export interface BollingerResult {
  middle: Series
  upper: Series
  lower: Series
  /** (upper - lower) / middle */
  bandwidth: Series
  /** (close - lower) / (upper - lower) */
  percentB: Series
  /** 終値が何σの位置にあるか */
  zScore: Series
}

export function bollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period)
  const upper: Series = []
  const lower: Series = []
  const bandwidth: Series = []
  const percentB: Series = []
  const zScore: Series = []
  for (let i = 0; i < closes.length; i++) {
    const m = middle[i]
    if (!isNum(m)) {
      upper.push(null)
      lower.push(null)
      bandwidth.push(null)
      percentB.push(null)
      zScore.push(null)
      continue
    }
    let variance = 0
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - m) ** 2
    // 母標準偏差（TA-Lib・一般的なチャートソフトと同じ）
    const sd = Math.sqrt(variance / period)
    const u = m + mult * sd
    const l = m - mult * sd
    upper.push(u)
    lower.push(l)
    bandwidth.push(m === 0 ? null : (u - l) / m)
    percentB.push(u === l ? null : (closes[i] - l) / (u - l))
    zScore.push(sd === 0 ? 0 : (closes[i] - m) / sd)
  }
  return { middle, upper, lower, bandwidth, percentB, zScore }
}

function trueRange(bars: Bar[]): Series {
  return bars.map((b, i) => {
    if (i === 0) return b.high - b.low
    const pc = bars[i - 1].close
    return Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc))
  })
}

export function atr(bars: Bar[], period = 14): Series {
  return wilder(trueRange(bars), period)
}

export interface AdxResult {
  adx: Series
  plusDI: Series
  minusDI: Series
}

export function adx(bars: Bar[], period = 14): AdxResult {
  const plusDM: Series = [null]
  const minusDM: Series = [null]
  for (let i = 1; i < bars.length; i++) {
    const up = bars[i].high - bars[i - 1].high
    const down = bars[i - 1].low - bars[i].low
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
  }
  const tr = trueRange(bars)
  tr[0] = null
  const trS = wilder(tr, period)
  const pS = wilder(plusDM, period)
  const mS = wilder(minusDM, period)
  const plusDI: Series = bars.map((_, i) => (isNum(trS[i]) && isNum(pS[i]) && trS[i] !== 0 ? (100 * (pS[i] as number)) / (trS[i] as number) : null))
  const minusDI: Series = bars.map((_, i) => (isNum(trS[i]) && isNum(mS[i]) && trS[i] !== 0 ? (100 * (mS[i] as number)) / (trS[i] as number) : null))
  const dx: Series = bars.map((_, i) => {
    const p = plusDI[i]
    const m = minusDI[i]
    if (!isNum(p) || !isNum(m) || p + m === 0) return null
    return (100 * Math.abs(p - m)) / (p + m)
  })
  return { adx: wilder(dx, period), plusDI, minusDI }
}

export interface StochasticResult {
  k: Series
  d: Series
}

/** スロー・ストキャスティクス（%K を smoothK で平滑化し、%D はその移動平均） */
export function stochastic(bars: Bar[], period = 14, smoothK = 3, smoothD = 3): StochasticResult {
  const fastK: Series = bars.map((b, i) => {
    if (i < period - 1) return null
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, bars[j].high)
      ll = Math.min(ll, bars[j].low)
    }
    return hh === ll ? 50 : ((b.close - ll) / (hh - ll)) * 100
  })
  const k = sma(fastK, smoothK)
  return { k, d: sma(k, smoothD) }
}

export function williamsR(bars: Bar[], period = 14): Series {
  return bars.map((b, i) => {
    if (i < period - 1) return null
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, bars[j].high)
      ll = Math.min(ll, bars[j].low)
    }
    return hh === ll ? -50 : ((hh - b.close) / (hh - ll)) * -100
  })
}

export function cci(bars: Bar[], period = 20): Series {
  const tp = bars.map((b) => (b.high + b.low + b.close) / 3)
  const m = sma(tp, period)
  return tp.map((v, i) => {
    const mi = m[i]
    if (!isNum(mi)) return null
    let dev = 0
    for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - mi)
    dev /= period
    return dev === 0 ? 0 : (v - mi) / (0.015 * dev)
  })
}

/** 変化率（%） */
export function roc(closes: number[], period = 12): Series {
  return closes.map((c, i) => (i < period || closes[i - period] === 0 ? null : ((c - closes[i - period]) / closes[i - period]) * 100))
}

export function obv(bars: Bar[]): Series {
  let acc = 0
  return bars.map((b, i) => {
    if (i > 0) {
      if (b.close > bars[i - 1].close) acc += b.volume
      else if (b.close < bars[i - 1].close) acc -= b.volume
    }
    return acc
  })
}

/**
 * VWAP。日中足ではその日の始まりからの累積、日足では直近 period 本の出来高加重平均。
 * 日足に「当日の VWAP」は無いので、期間を明示した移動版として扱う。
 */
export function vwap(bars: Bar[], period?: number): Series {
  const tp = bars.map((b) => ((b.high + b.low + b.close) / 3) * b.volume)
  if (!period) {
    let pv = 0
    let vol = 0
    return bars.map((b, i) => {
      pv += tp[i]
      vol += b.volume
      return vol === 0 ? null : pv / vol
    })
  }
  return bars.map((_, i) => {
    if (i < period - 1) return null
    let pv = 0
    let vol = 0
    for (let j = i - period + 1; j <= i; j++) {
      pv += tp[j]
      vol += bars[j].volume
    }
    return vol === 0 ? null : pv / vol
  })
}

export interface IchimokuResult {
  tenkan: Series
  kijun: Series
  /** 先行スパン。この配列の i 番目は、i + displacement 本目の位置に描く */
  spanA: Series
  spanB: Series
  /** 遅行スパン。終値を displacement 本前に描く（配列は終値そのもの） */
  chikou: Series
  displacement: number
}

function midpoint(bars: Bar[], period: number): Series {
  return bars.map((_, i) => {
    if (i < period - 1) return null
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, bars[j].high)
      ll = Math.min(ll, bars[j].low)
    }
    return (hh + ll) / 2
  })
}

export function ichimoku(bars: Bar[], conversion = 9, base = 26, spanBPeriod = 52, displacement = 26): IchimokuResult {
  const tenkan = midpoint(bars, conversion)
  const kijun = midpoint(bars, base)
  const spanA: Series = tenkan.map((t, i) => (isNum(t) && isNum(kijun[i]) ? (t + (kijun[i] as number)) / 2 : null))
  const spanB = midpoint(bars, spanBPeriod)
  return { tenkan, kijun, spanA, spanB, chikou: bars.map((b) => b.close), displacement }
}

/** 出来高の移動平均に対する倍率 */
export function volumeRatio(bars: Bar[], period = 20): Series {
  const avg = sma(
    bars.map((b) => b.volume),
    period,
  )
  // 当日を含めない平均と比べる（当日の急増で平均自体が膨らむのを避ける）
  return bars.map((b, i) => {
    const a = avg[i - 1]
    return i > 0 && isNum(a) && a > 0 ? b.volume / a : null
  })
}
