// スクリーナー（条件で銘柄を絞り込む）の共通部分。
//
// 並べるのは「テクニカル条件の成り立ち方」であって、値上がりの見込みではない。
// 上昇方向の条件が多い銘柄を上に出すが、推奨や将来の値動きを示すものではない。

import { analyzeSignals, type SignalStrength, type SignalTone } from './technical/signals'
import { rsi, sma, volumeRatio } from './technical/indicators'
import type { Bar } from './types'

export interface ScreenerSignal {
  type: string
  label: string
  tone: SignalTone
  strength: SignalStrength
  date: string
}

export interface ScreenerItem {
  code: string
  name: string
  market: string
  sector: string
  /** 最新の終値と日付 */
  close: number
  asOf: string
  changePct: number | null
  /** 成立中の条件の数（向き別） */
  up: number
  down: number
  neutral: number
  /** 条件の強さで重み付けした 上昇方向 − 下落方向（高3・中2・低1） */
  score: number
  rsi: number | null
  volumeRatio: number | null
  /** 直近20日の平均売買代金（百万円・百万ドル）。流動性の目安 */
  turnover: number | null
  signals: ScreenerSignal[]
}

export interface ScreenerData {
  /** 集計した時刻（ISO）。まだ一度も集計していなければ null */
  generatedAt: string | null
  source: string
  /** 集計した銘柄数と、取得に失敗した数 */
  scanned: number
  failed: number
  items: ScreenerItem[]
}

const WEIGHT: Record<SignalStrength, number> = { high: 3, medium: 2, low: 1 }
const last = <T,>(xs: (T | null)[]) => (xs.length ? xs[xs.length - 1] : null)

/** 1銘柄の日足から、スクリーナーの1行を作る。足りなければ null */
export function screenStock(meta: { code: string; name: string; market: string; sector: string }, bars: Bar[]): ScreenerItem | null {
  if (bars.length < 60) return null
  const { current } = analyzeSignals(bars)
  const active = current.filter((s) => s.active)
  const closes = bars.map((b) => b.close)
  const lastBar = bars[bars.length - 1]
  const prev = bars[bars.length - 2]
  const avgVolume = last(sma(bars.map((b) => b.volume), 20))
  let up = 0
  let down = 0
  let neutral = 0
  let score = 0
  for (const s of active) {
    if (s.tone === 'up') {
      up++
      score += WEIGHT[s.strength]
    } else if (s.tone === 'down') {
      down++
      score -= WEIGHT[s.strength]
    } else neutral++
  }
  const round = (v: number | null, d = 2) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d)
  return {
    ...meta,
    close: lastBar.close,
    asOf: String(lastBar.time),
    changePct: round(prev ? ((lastBar.close - prev.close) / prev.close) * 100 : null),
    up,
    down,
    neutral,
    score,
    rsi: round(last(rsi(closes)), 1),
    volumeRatio: round(last(volumeRatio(bars))),
    turnover: avgVolume === null ? null : round((avgVolume * lastBar.close) / 1e6, 1),
    signals: active.map((s) => ({ type: s.type, label: s.label, tone: s.tone, strength: s.strength, date: s.date })),
  }
}

/** 並べ替え: 重み付きスコア → 上昇方向の数 → 下落方向の少なさ */
export function sortScreener(items: ScreenerItem[]): ScreenerItem[] {
  return [...items].sort((a, b) => b.score - a.score || b.up - a.up || a.down - b.down)
}

/** 絞り込みの条件に使うシグナルの種類（画面のチェック項目） */
export const SIGNAL_FILTERS: Array<{ id: string; label: string; types: string[] }> = [
  { id: 'gc2575', label: 'ゴールデンクロス（25日・75日）', types: ['ma_gc_25_75'] },
  { id: 'macdgc', label: 'MACDゴールデンクロス', types: ['macd_gc'] },
  { id: 'macd0', label: 'MACDゼロライン上抜け', types: ['macd_zero_up'] },
  { id: 'ma25up', label: '25日線上抜け', types: ['price_up_ma25'] },
  { id: 'ma75up', label: '75日線上抜け', types: ['price_up_ma75'] },
  { id: 'ma200up', label: '200日線上抜け', types: ['price_up_ma200'] },
  { id: 'above200', label: '200日線を上回る', types: ['state_above_ma200', 'price_up_ma200'] },
  { id: 'rsi30', label: 'RSI 30未満', types: ['rsi_below_30', 'state_rsi_low'] },
  { id: 'volspike', label: '出来高急増', types: ['volume_spike'] },
  { id: 'walkup', label: 'バンドウォーク（+2σ沿い）', types: ['state_bb_walk_up'] },
]
