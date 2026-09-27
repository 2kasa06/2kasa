// 過去に同じ条件が出たあと、株価がどう動いたかの集計。
// 過去の結果は将来を保証しない。サンプル数を必ず一緒に出す。

import type { Bar } from '@/lib/types'
import type { Signal } from './signals'

export const HORIZONS = [1, 5, 10, 20] as const
export type Horizon = (typeof HORIZONS)[number]

/** これ未満のサンプル数では「参考値」として扱う */
export const MIN_RELIABLE_SAMPLES = 20

export interface HorizonStats {
  horizon: Horizon
  samples: number
  mean: number | null
  median: number | null
  max: number | null
  min: number | null
  /** 上昇したケースの割合（%） */
  upRatio: number | null
}

export interface BacktestResult {
  type: string
  label: string
  occurrences: number
  /** 集計に使った期間 */
  from: string
  to: string
  stats: HorizonStats[]
  lowSample: boolean
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * 同じ type のイベントについて、発生日の終値から h 営業日後の終値までの変化率を集計する。
 * h 営業日後がまだ来ていないケースは、その期間の集計から外す。
 */
export function backtestSignal(bars: Bar[], events: Signal[], type: string): BacktestResult | null {
  const hits = events.filter((e) => e.type === type && e.kind === 'event')
  if (hits.length === 0) return null
  const stats = HORIZONS.map((h): HorizonStats => {
    const returns = hits
      .filter((e) => e.index + h < bars.length)
      .map((e) => ((bars[e.index + h].close - bars[e.index].close) / bars[e.index].close) * 100)
    if (returns.length === 0) return { horizon: h, samples: 0, mean: null, median: null, max: null, min: null, upRatio: null }
    return {
      horizon: h,
      samples: returns.length,
      mean: returns.reduce((a, b) => a + b, 0) / returns.length,
      median: median(returns),
      max: Math.max(...returns),
      min: Math.min(...returns),
      upRatio: (returns.filter((r) => r > 0).length / returns.length) * 100,
    }
  })
  return {
    type,
    label: hits[0].label,
    occurrences: hits.length,
    from: String(bars[0].time),
    to: String(bars[bars.length - 1].time),
    stats,
    lowSample: hits.length < MIN_RELIABLE_SAMPLES,
  }
}

/** 過去検証の対象になる種類（イベントのみ） */
export function backtestAll(bars: Bar[], events: Signal[]): Record<string, BacktestResult> {
  const out: Record<string, BacktestResult> = {}
  for (const type of new Set(events.map((e) => e.type))) {
    const r = backtestSignal(bars, events, type)
    if (r) out[type] = r
  }
  return out
}
