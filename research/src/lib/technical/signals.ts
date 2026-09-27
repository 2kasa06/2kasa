// テクニカル条件（シグナル）の検出。
//
// ここで出すのは「ゴールデンクロスが発生した」「RSI が 30 を下回った」という客観的な事実だけ。
// 「買い」「売り」には変換しない。tone は条件が一般に上昇・下落どちらの方向の動きと
// 結び付けて語られるかを示す分類で、将来の値動きを示すものではない。
// strength も「テクニカル条件としての強さ（どれだけ明確に成立しているか・どの時間軸か）」であって、
// 投資判断の強さではない。

import type { Bar } from '@/lib/types'
import { bollinger, macd, rsi, sma, volumeRatio, type Series } from './indicators'

export type SignalTone = 'up' | 'down' | 'neutral'
export type SignalStrength = 'high' | 'medium' | 'low'
export type SignalCategory = 'trend' | 'ma' | 'oscillator' | 'volatility' | 'volume'

export interface Signal {
  /** 種類と発生日から作る一意なID */
  id: string
  type: string
  label: string
  /** チャートのマーカーに出す短い表記 */
  short: string
  category: SignalCategory
  /** event: ある日に起きた出来事（クロスなど） / state: 今そうなっている状態 */
  kind: 'event' | 'state'
  tone: SignalTone
  strength: SignalStrength
  strengthReason: string
  /** 発生日（state の場合はその状態が始まった日） */
  date: string
  index: number
  /** 現在もその条件が成り立っているか */
  active: boolean
  /** 発生条件の説明 */
  condition: string
  /** 発生時の数値 */
  values: Record<string, number>
  /** 最新時点の数値 */
  current: Record<string, number>
}

export const CATEGORY_LABEL: Record<SignalCategory, string> = {
  trend: 'トレンド',
  ma: '移動平均線',
  oscillator: 'オシレーター',
  volatility: 'ボラティリティ',
  volume: '出来高',
}

export const STRENGTH_LABEL: Record<SignalStrength, string> = { high: '高', medium: '中', low: '低' }

interface Context {
  bars: Bar[]
  closes: number[]
  dates: string[]
  last: number
  ma: Record<5 | 25 | 75 | 200, Series>
  rsi14: Series
  macd: ReturnType<typeof macd>
  bb: ReturnType<typeof bollinger>
  vol: Series
  /** バンド幅が直近120本の下位10%以内か */
  squeeze: boolean[]
}

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits

function buildContext(bars: Bar[]): Context {
  const closes = bars.map((b) => b.close)
  const bb = bollinger(closes, 20, 2)
  const squeeze = bb.bandwidth.map((w, i) => {
    if (w === null || i < 120) return false
    const window = bb.bandwidth.slice(i - 119, i + 1).filter((x): x is number => x !== null)
    const sorted = [...window].sort((a, b) => a - b)
    return w <= sorted[Math.floor(sorted.length * 0.1)]
  })
  return {
    bars,
    closes,
    dates: bars.map((b) => String(b.time)),
    last: bars.length - 1,
    ma: { 5: sma(closes, 5), 25: sma(closes, 25), 75: sma(closes, 75), 200: sma(closes, 200) },
    rsi14: rsi(closes, 14),
    macd: macd(closes, 12, 26, 9),
    bb,
    vol: volumeRatio(bars, 20),
    squeeze,
  }
}

/** a が b を下から上に抜けた（i-1 では a<=b、i では a>b） */
function crossUp(a: Series, b: Series, i: number): boolean {
  const a0 = num(a[i - 1]), b0 = num(b[i - 1]), a1 = num(a[i]), b1 = num(b[i])
  return a0 !== null && b0 !== null && a1 !== null && b1 !== null && a0 <= b0 && a1 > b1
}

function crossDown(a: Series, b: Series, i: number): boolean {
  const a0 = num(a[i - 1]), b0 = num(b[i - 1]), a1 = num(a[i]), b1 = num(b[i])
  return a0 !== null && b0 !== null && a1 !== null && b1 !== null && a0 >= b0 && a1 < b1
}

type Template = Omit<Signal, 'id' | 'date' | 'index' | 'active' | 'values' | 'current' | 'kind'>

function make(ctx: Context, t: Template, kind: Signal['kind'], index: number, active: boolean, values: Record<string, number>, current: Record<string, number>): Signal {
  return { ...t, id: `${t.type}:${ctx.dates[index]}`, kind, date: ctx.dates[index], index, active, values, current }
}

/** 値の組を数値だけに絞って丸める */
function vals(entries: Record<string, number | null | undefined>, digits = 2): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(entries)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = round(v, digits)
  return out
}

// --- イベント（ある日に起きたこと） ------------------------------------

interface EventDetector {
  template: Template
  /** i 本目で発生したか */
  test(ctx: Context, i: number): boolean
  /** 発生時と現在の数値 */
  values(ctx: Context, i: number): Record<string, number>
  /** 最新時点でも条件が保たれているか */
  stillValid(ctx: Context, i: number): boolean
}

function maCross(short: 5 | 25, long: 25 | 75, dir: 'gc' | 'dc', strength: SignalStrength, reason: string): EventDetector {
  const gc = dir === 'gc'
  return {
    template: {
      type: `ma_${dir}_${short}_${long}`,
      label: `${gc ? 'ゴールデンクロス' : 'デッドクロス'}（${short}日・${long}日）`,
      short: `${gc ? 'GC' : 'DC'}${short}/${long}`,
      category: 'trend',
      tone: gc ? 'up' : 'down',
      strength,
      strengthReason: reason,
      condition: `${short}日移動平均線が${long}日移動平均線を${gc ? '下から上に' : '上から下に'}突破`,
    },
    test: (ctx, i) => (gc ? crossUp : crossDown)(ctx.ma[short], ctx.ma[long], i),
    values: (ctx, i) => vals({ [`SMA${short}`]: ctx.ma[short][i], [`SMA${long}`]: ctx.ma[long][i], 終値: ctx.closes[i] }),
    stillValid: (ctx) => {
      const s = num(ctx.ma[short][ctx.last]), l = num(ctx.ma[long][ctx.last])
      return s !== null && l !== null && (gc ? s > l : s < l)
    },
  }
}

function priceCrossMa(period: 5 | 25 | 75 | 200, dir: 'up' | 'down'): EventDetector {
  const up = dir === 'up'
  const strength: SignalStrength = period === 200 ? 'high' : period === 5 ? 'low' : 'medium'
  const horizon = period === 5 ? '超短期' : period === 25 ? '短中期' : period === 75 ? '中期' : '長期'
  return {
    template: {
      type: `price_${dir}_ma${period}`,
      label: `${period}日線${up ? '上抜け' : '下抜け'}`,
      short: `MA${period}${up ? '↑' : '↓'}`,
      category: 'ma',
      tone: up ? 'up' : 'down',
      strength,
      strengthReason: `${period}日移動平均線は${horizon}の目安として使われる線`,
      condition: `終値が${period}日移動平均線を${up ? '下から上に' : '上から下に'}抜けた`,
    },
    test: (ctx, i) => (up ? crossUp : crossDown)(ctx.closes, ctx.ma[period], i),
    values: (ctx, i) => vals({ 終値: ctx.closes[i], [`SMA${period}`]: ctx.ma[period][i] }),
    stillValid: (ctx) => {
      const m = num(ctx.ma[period][ctx.last])
      return m !== null && (up ? ctx.closes[ctx.last] > m : ctx.closes[ctx.last] < m)
    },
  }
}

const EVENT_DETECTORS: EventDetector[] = [
  maCross(25, 75, 'gc', 'high', '中期（25日）と長期（75日）の線の交差で、日々の変動では起きにくい'),
  maCross(25, 75, 'dc', 'high', '中期（25日）と長期（75日）の線の交差で、日々の変動では起きにくい'),
  maCross(5, 25, 'gc', 'low', '短期の線同士の交差で、頻繁に起きる'),
  maCross(5, 25, 'dc', 'low', '短期の線同士の交差で、頻繁に起きる'),
  ...([5, 25, 75, 200] as const).flatMap((p) => [priceCrossMa(p, 'up'), priceCrossMa(p, 'down')]),
  {
    template: {
      type: 'rsi_below_30', label: 'RSI 30未満', short: 'RSI<30', category: 'oscillator', tone: 'up', strength: 'medium',
      strengthReason: 'RSI(14) が一般的な基準値 30 を下回った', condition: 'RSI(14) が 30 を上から下に割り込んだ',
    },
    test: (ctx, i) => (num(ctx.rsi14[i - 1]) ?? 50) >= 30 && (num(ctx.rsi14[i]) ?? 50) < 30,
    values: (ctx, i) => vals({ RSI: ctx.rsi14[i] }, 1),
    stillValid: (ctx) => (num(ctx.rsi14[ctx.last]) ?? 50) < 30,
  },
  {
    template: {
      type: 'rsi_above_70', label: 'RSI 70超', short: 'RSI>70', category: 'oscillator', tone: 'down', strength: 'medium',
      strengthReason: 'RSI(14) が一般的な基準値 70 を上回った', condition: 'RSI(14) が 70 を下から上に超えた',
    },
    test: (ctx, i) => (num(ctx.rsi14[i - 1]) ?? 50) <= 70 && (num(ctx.rsi14[i]) ?? 50) > 70,
    values: (ctx, i) => vals({ RSI: ctx.rsi14[i] }, 1),
    stillValid: (ctx) => (num(ctx.rsi14[ctx.last]) ?? 50) > 70,
  },
  {
    template: {
      type: 'macd_gc', label: 'MACDゴールデンクロス', short: 'MACD GC', category: 'trend', tone: 'up', strength: 'medium',
      strengthReason: '短期EMAと長期EMAの差（MACD）がシグナル線を上抜け', condition: 'MACD(12,26) がシグナル(9)を下から上に突破',
    },
    test: (ctx, i) => crossUp(ctx.macd.macd, ctx.macd.signal, i),
    values: (ctx, i) => vals({ MACD: ctx.macd.macd[i], シグナル: ctx.macd.signal[i] }),
    stillValid: (ctx) => (num(ctx.macd.histogram[ctx.last]) ?? 0) > 0,
  },
  {
    template: {
      type: 'macd_dc', label: 'MACDデッドクロス', short: 'MACD DC', category: 'trend', tone: 'down', strength: 'medium',
      strengthReason: '短期EMAと長期EMAの差（MACD）がシグナル線を下抜け', condition: 'MACD(12,26) がシグナル(9)を上から下に突破',
    },
    test: (ctx, i) => crossDown(ctx.macd.macd, ctx.macd.signal, i),
    values: (ctx, i) => vals({ MACD: ctx.macd.macd[i], シグナル: ctx.macd.signal[i] }),
    stillValid: (ctx) => (num(ctx.macd.histogram[ctx.last]) ?? 0) < 0,
  },
  {
    template: {
      type: 'macd_zero_up', label: 'MACDゼロライン上抜け', short: 'MACD 0↑', category: 'trend', tone: 'up', strength: 'medium',
      strengthReason: '12日EMAが26日EMAを上回った状態への転換', condition: 'MACD が 0 を下から上に抜けた',
    },
    test: (ctx, i) => (num(ctx.macd.macd[i - 1]) ?? 0) <= 0 && (num(ctx.macd.macd[i]) ?? 0) > 0,
    values: (ctx, i) => vals({ MACD: ctx.macd.macd[i] }),
    stillValid: (ctx) => (num(ctx.macd.macd[ctx.last]) ?? 0) > 0,
  },
  {
    template: {
      type: 'macd_zero_down', label: 'MACDゼロライン下抜け', short: 'MACD 0↓', category: 'trend', tone: 'down', strength: 'medium',
      strengthReason: '12日EMAが26日EMAを下回った状態への転換', condition: 'MACD が 0 を上から下に抜けた',
    },
    test: (ctx, i) => (num(ctx.macd.macd[i - 1]) ?? 0) >= 0 && (num(ctx.macd.macd[i]) ?? 0) < 0,
    values: (ctx, i) => vals({ MACD: ctx.macd.macd[i] }),
    stillValid: (ctx) => (num(ctx.macd.macd[ctx.last]) ?? 0) < 0,
  },
  {
    template: {
      type: 'bb_upper', label: 'ボリンジャーバンド +2σ到達', short: '+2σ', category: 'volatility', tone: 'up', strength: 'low',
      strengthReason: '終値が20日平均から標準偏差の2倍以上離れた', condition: '終値が +2σ 以上に到達',
    },
    test: (ctx, i) => (num(ctx.bb.zScore[i - 1]) ?? 0) < 2 && (num(ctx.bb.zScore[i]) ?? 0) >= 2,
    values: (ctx, i) => vals({ 終値: ctx.closes[i], '+2σ': ctx.bb.upper[i], σ位置: ctx.bb.zScore[i] }),
    stillValid: (ctx) => (num(ctx.bb.zScore[ctx.last]) ?? 0) >= 2,
  },
  {
    template: {
      type: 'bb_lower', label: 'ボリンジャーバンド -2σ到達', short: '-2σ', category: 'volatility', tone: 'down', strength: 'low',
      strengthReason: '終値が20日平均から標準偏差の2倍以上離れた', condition: '終値が -2σ 以下に到達',
    },
    test: (ctx, i) => (num(ctx.bb.zScore[i - 1]) ?? 0) > -2 && (num(ctx.bb.zScore[i]) ?? 0) <= -2,
    values: (ctx, i) => vals({ 終値: ctx.closes[i], '-2σ': ctx.bb.lower[i], σ位置: ctx.bb.zScore[i] }),
    stillValid: (ctx) => (num(ctx.bb.zScore[ctx.last]) ?? 0) <= -2,
  },
  {
    template: {
      type: 'bb_squeeze', label: 'ボリンジャーバンド スクイーズ', short: 'スクイーズ', category: 'volatility', tone: 'neutral', strength: 'low',
      strengthReason: 'バンド幅が直近120日の下位10%まで縮小（値動きが小さい状態）', condition: 'バンド幅が直近120日の下位10%に入った',
    },
    test: (ctx, i) => ctx.squeeze[i] && !ctx.squeeze[i - 1],
    values: (ctx, i) => vals({ バンド幅: (num(ctx.bb.bandwidth[i]) ?? 0) * 100 }),
    stillValid: (ctx) => ctx.squeeze[ctx.last],
  },
  {
    template: {
      type: 'bb_expansion', label: 'ボリンジャーバンド エクスパンション', short: 'エクスパンション', category: 'volatility', tone: 'neutral', strength: 'medium',
      strengthReason: 'スクイーズ後にバンド幅が5日で1.5倍以上に拡大', condition: '直近10日以内のスクイーズの後、バンド幅が5日前の1.5倍以上',
    },
    test: (ctx, i) => {
      if (i < 6) return false
      const w = num(ctx.bb.bandwidth[i]), w5 = num(ctx.bb.bandwidth[i - 5]), wPrev = num(ctx.bb.bandwidth[i - 1]), w6 = num(ctx.bb.bandwidth[i - 6])
      if (w === null || w5 === null || wPrev === null || w6 === null) return false
      const recentSqueeze = ctx.squeeze.slice(Math.max(0, i - 10), i).some(Boolean)
      return recentSqueeze && w >= w5 * 1.5 && wPrev < w6 * 1.5
    },
    values: (ctx, i) => vals({ バンド幅: (num(ctx.bb.bandwidth[i]) ?? 0) * 100, '5日前': (num(ctx.bb.bandwidth[i - 5]) ?? 0) * 100 }),
    stillValid: (ctx) => {
      const w = num(ctx.bb.bandwidth[ctx.last]), w5 = num(ctx.bb.bandwidth[ctx.last - 5])
      return w !== null && w5 !== null && w >= w5 * 1.2
    },
  },
  {
    template: {
      type: 'volume_spike', label: '出来高急増', short: '出来高', category: 'volume', tone: 'neutral', strength: 'medium',
      strengthReason: '出来高が過去20日平均の2倍以上', condition: '出来高が過去20日平均の2倍以上',
    },
    test: (ctx, i) => (num(ctx.vol[i]) ?? 0) >= 2,
    values: (ctx, i) => vals({ 出来高: ctx.bars[i].volume, '20日平均比': ctx.vol[i] }, 2),
    stillValid: (ctx, i) => i === ctx.last,
  },
]

/** 出来高急増は倍率で強さを変える */
function adjustStrength(signal: Signal): Signal {
  if (signal.type !== 'volume_spike') return signal
  const ratio = signal.values['20日平均比'] ?? 0
  const strength: SignalStrength = ratio >= 5 ? 'high' : ratio >= 3 ? 'medium' : 'low'
  const tier = ratio >= 5 ? 5 : ratio >= 3 ? 3 : 2
  return { ...signal, strength, strengthReason: `出来高が過去20日平均の${tier}倍以上（${ratio.toFixed(1)}倍）` }
}

function currentValues(ctx: Context): Record<string, number> {
  const i = ctx.last
  return vals({
    終値: ctx.closes[i],
    RSI: ctx.rsi14[i],
    MACD: ctx.macd.macd[i],
    SMA25: ctx.ma[25][i],
    SMA75: ctx.ma[75][i],
    σ位置: ctx.bb.zScore[i],
  })
}

/** 全期間のイベントを古い順に */
export function detectEvents(bars: Bar[]): Signal[] {
  if (bars.length < 3) return []
  const ctx = buildContext(bars)
  const current = currentValues(ctx)
  const out: Signal[] = []
  for (let i = 1; i < bars.length; i++) {
    for (const d of EVENT_DETECTORS) {
      if (!d.test(ctx, i)) continue
      out.push(adjustStrength(make(ctx, d.template, 'event', i, d.stillValid(ctx, i), d.values(ctx, i), current)))
    }
  }
  return out
}

// --- 状態（今そうなっていること） --------------------------------------

/** 条件が連続して成り立っている始まりの位置 */
function streakStart(test: (i: number) => boolean, last: number): number {
  let i = last
  while (i > 0 && test(i - 1)) i--
  return i
}

export function detectStates(bars: Bar[]): Signal[] {
  if (bars.length < 30) return []
  const ctx = buildContext(bars)
  const i = ctx.last
  const current = currentValues(ctx)
  const out: Signal[] = []
  const push = (t: Template, test: (k: number) => boolean, values: Record<string, number>) => {
    if (!test(i)) return
    out.push(make(ctx, t, 'state', streakStart(test, i), true, values, current))
  }

  const r = num(ctx.rsi14[i])
  if (r !== null) {
    push(
      { type: 'state_rsi_low', label: 'RSI 30未満', short: 'RSI<30', category: 'oscillator', tone: 'up', strength: r < 20 ? 'high' : 'medium',
        strengthReason: r < 20 ? 'RSI が 20 も下回っている' : 'RSI が基準値 30 を下回っている', condition: 'RSI(14) < 30' },
      (k) => (num(ctx.rsi14[k]) ?? 50) < 30, vals({ RSI: r }, 1),
    )
    push(
      { type: 'state_rsi_high', label: 'RSI 70超', short: 'RSI>70', category: 'oscillator', tone: 'down', strength: r > 80 ? 'high' : 'medium',
        strengthReason: r > 80 ? 'RSI が 80 も上回っている' : 'RSI が基準値 70 を上回っている', condition: 'RSI(14) > 70' },
      (k) => (num(ctx.rsi14[k]) ?? 50) > 70, vals({ RSI: r }, 1),
    )
  }

  // ヒストグラムの拡大・縮小（3本連続で絶対値が増える・減る）
  const h = ctx.macd.histogram
  const absAt = (k: number) => Math.abs(num(h[k]) ?? 0)
  const expanding = (k: number) => k >= 2 && num(h[k]) !== null && Math.sign(num(h[k])!) === Math.sign(num(h[k - 1]) ?? 0) && absAt(k) > absAt(k - 1) && absAt(k - 1) > absAt(k - 2)
  const shrinking = (k: number) => k >= 2 && num(h[k]) !== null && Math.sign(num(h[k])!) === Math.sign(num(h[k - 1]) ?? 0) && absAt(k) < absAt(k - 1) && absAt(k - 1) < absAt(k - 2)
  const histSide = (num(h[i]) ?? 0) >= 0 ? 'プラス' : 'マイナス'
  push(
    { type: 'state_macd_hist_expand', label: `MACDヒストグラム拡大（${histSide}側）`, short: 'Hist↑', category: 'trend',
      tone: (num(h[i]) ?? 0) >= 0 ? 'up' : 'down', strength: 'low', strengthReason: 'ヒストグラムの絶対値が3日続けて拡大', condition: '|MACD − シグナル| が3日連続で増加' },
    expanding, vals({ ヒストグラム: h[i] }),
  )
  push(
    { type: 'state_macd_hist_shrink', label: `MACDヒストグラム縮小（${histSide}側）`, short: 'Hist↓', category: 'trend',
      tone: 'neutral', strength: 'low', strengthReason: 'ヒストグラムの絶対値が3日続けて縮小', condition: '|MACD − シグナル| が3日連続で減少' },
    shrinking, vals({ ヒストグラム: h[i] }),
  )

  // バンドウォーク（直近5本のうち3本以上が ±1.8σ の外側に張り付いている）
  const z = ctx.bb.zScore
  const walk = (k: number, side: 1 | -1) => {
    if (k < 4) return false
    let hits = 0
    for (let j = k - 4; j <= k; j++) if ((num(z[j]) ?? 0) * side >= 1.8) hits++
    return hits >= 3 && (num(z[k]) ?? 0) * side >= 1.5
  }
  push(
    { type: 'state_bb_walk_up', label: 'バンドウォーク（+2σ沿い）', short: 'Walk↑', category: 'volatility', tone: 'up', strength: 'medium',
      strengthReason: '終値が+2σ付近に複数日張り付いている', condition: '直近5日のうち3日以上で σ位置 ≥ +1.8' },
    (k) => walk(k, 1), vals({ σ位置: z[i] }),
  )
  push(
    { type: 'state_bb_walk_down', label: 'バンドウォーク（-2σ沿い）', short: 'Walk↓', category: 'volatility', tone: 'down', strength: 'medium',
      strengthReason: '終値が-2σ付近に複数日張り付いている', condition: '直近5日のうち3日以上で σ位置 ≤ −1.8' },
    (k) => walk(k, -1), vals({ σ位置: z[i] }),
  )
  const zi = num(z[i])
  if (zi !== null && !walk(i, 1) && !walk(i, -1)) {
    push(
      { type: 'state_bb_near_lower', label: 'ボリンジャーバンド -2σ付近', short: '-2σ付近', category: 'volatility', tone: 'neutral', strength: 'low',
        strengthReason: '終値が-2σの近くにある', condition: 'σ位置 ≤ −1.7' },
      (k) => (num(z[k]) ?? 0) <= -1.7, vals({ σ位置: zi, '-2σ': ctx.bb.lower[i] }),
    )
    push(
      { type: 'state_bb_near_upper', label: 'ボリンジャーバンド +2σ付近', short: '+2σ付近', category: 'volatility', tone: 'neutral', strength: 'low',
        strengthReason: '終値が+2σの近くにある', condition: 'σ位置 ≥ +1.7' },
      (k) => (num(z[k]) ?? 0) >= 1.7, vals({ σ位置: zi, '+2σ': ctx.bb.upper[i] }),
    )
  }
  push(
    { type: 'state_bb_squeeze', label: 'ボリンジャーバンド スクイーズ中', short: 'スクイーズ', category: 'volatility', tone: 'neutral', strength: 'low',
      strengthReason: 'バンド幅が直近120日の下位10%', condition: 'バンド幅が直近120日の下位10%以内' },
    (k) => ctx.squeeze[k], vals({ バンド幅: (num(ctx.bb.bandwidth[i]) ?? 0) * 100 }),
  )

  // 移動平均線との位置関係
  for (const p of [25, 75, 200] as const) {
    const m = num(ctx.ma[p][i])
    if (m === null) continue
    const gap = ((ctx.closes[i] - m) / m) * 100
    const strength: SignalStrength = p === 200 ? 'medium' : 'low'
    if (Math.abs(gap) <= 1) {
      push(
        { type: `state_near_ma${p}`, label: `${p}日移動平均線付近`, short: `MA${p}付近`, category: 'ma', tone: 'neutral', strength: 'low',
          strengthReason: `終値と${p}日線の差が1%以内`, condition: `|終値 − SMA${p}| ≤ 1%` },
        (k) => {
          const mk = num(ctx.ma[p][k])
          return mk !== null && Math.abs((ctx.closes[k] - mk) / mk) <= 0.01
        },
        vals({ 終値: ctx.closes[i], [`SMA${p}`]: m, 乖離率: gap }),
      )
    } else {
      const above = gap > 0
      push(
        { type: `state_${above ? 'above' : 'below'}_ma${p}`, label: `${p}日移動平均線を${above ? '上回る' : '下回る'}`, short: `MA${p}${above ? '上' : '下'}`, category: 'ma',
          tone: above ? 'up' : 'down', strength, strengthReason: `終値が${p}日線より${Math.abs(gap).toFixed(1)}%${above ? '上' : '下'}`, condition: `終値 ${above ? '>' : '<'} SMA${p}` },
        (k) => {
          const mk = num(ctx.ma[p][k])
          return mk !== null && (above ? ctx.closes[k] > mk : ctx.closes[k] < mk)
        },
        vals({ 終値: ctx.closes[i], [`SMA${p}`]: m, 乖離率: gap }),
      )
    }
  }
  return out
}

export interface SignalSnapshot {
  /** 直近 recentBars 本以内に発生し、今も条件が保たれているイベントと、現在の状態 */
  current: Signal[]
  /** 全期間のイベント（新しい順） */
  history: Signal[]
}

/** 向きだけが違う種類を同じ系統として扱う */
export function signalFamily(type: string): string {
  return type
    .replace(/^price_(up|down)_/, 'price_')
    .replace(/^ma_(gc|dc)_/, 'ma_')
    .replace(/^macd_(gc|dc)$/, 'macd_cross')
    .replace(/^macd_zero_(up|down)$/, 'macd_zero')
}

const STRENGTH_ORDER: Record<SignalStrength, number> = { high: 0, medium: 1, low: 2 }

export function analyzeSignals(bars: Bar[], recentBars = 10): SignalSnapshot {
  const events = detectEvents(bars)
  const states = detectStates(bars)
  const last = bars.length - 1
  // 同じ系統（同じ線の上抜けと下抜けなど）は最新の1件だけ残す。
  // 古い「上抜け」と新しい「下抜け」が並ぶと、今の状態が読み取れなくなる。
  const latestByFamily = new Map<string, Signal>()
  for (const e of events) {
    if (e.index < last - recentBars + 1) continue
    const family = signalFamily(e.type)
    const seen = latestByFamily.get(family)
    if (!seen || e.index >= seen.index) latestByFamily.set(family, e)
  }
  const recent = [...latestByFamily.values()]
  // 同じ意味の状態とイベントが両方あるとき（RSI 30未満など）は、発生日のあるイベントを優先する
  // 移動平均線の上抜け・下抜けイベントが生きている間は、同じ線の「上回る・下回る」状態は重複なので出さない
  const active = recent.filter((e) => e.active)
  const eventLabels = new Set(active.map((e) => e.label))
  const crossedMa = new Set(active.map((e) => /^price_(?:up|down)_ma(\d+)$/.exec(e.type)?.[1]).filter(Boolean))
  const redundant = (s: Signal) => {
    const p = /^state_(?:above|below)_ma(\d+)$/.exec(s.type)?.[1]
    return eventLabels.has(s.label) || (p !== undefined && crossedMa.has(p))
  }
  const current = [...recent, ...states.filter((s) => !redundant(s))].sort(
    (a, b) => Number(b.active) - Number(a.active) || STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] || b.index - a.index,
  )
  return { current, history: [...events].reverse() }
}
