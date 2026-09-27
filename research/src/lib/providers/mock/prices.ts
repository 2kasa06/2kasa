// モックの株価と指数。幾何ブラウン運動に局面（上昇・下落・もみ合い）の切り替えを入れて、
// 移動平均のクロスや RSI の行き過ぎが自然に出るようにしている。

import type { Bar, IndexQuote } from '@/lib/types'
import { createRandom, hashString, latestSessionDate, toDateKey, weekdaysBetween } from './random'
import type { MockStockSpec } from './stocks'

const HISTORY_START = new Date(Date.UTC(2016, 0, 4))

function roundPrice(value: number, currency: 'JPY' | 'USD'): number {
  if (currency === 'USD') return Math.round(value * 100) / 100
  // 日本株は呼値を1円に丸める（実際の呼値単位は価格帯で違うが、モックなので簡略化）
  return value >= 10_000 ? Math.round(value / 5) * 5 : Math.round(value)
}

/**
 * 日足の全履歴。最新の終値が spec.targetPrice 近くになるよう全体をスケールする。
 * 同じ銘柄・同じ最新日なら常に同じ結果になる。
 */
export function generateDailyBars(spec: MockStockSpec, asOf: Date = latestSessionDate()): Bar[] {
  const days = weekdaysBetween(HISTORY_START, asOf)
  const rand = createRandom(hashString(`daily:${spec.code}`))
  const dailyVol = spec.vol / Math.sqrt(252)

  // 1. 終値の相対的な道筋（対数）を作る
  const logs: number[] = [0]
  let regimeDrift = spec.drift / 252
  let regimeLeft = 0
  for (let i = 1; i < days.length; i++) {
    if (regimeLeft <= 0) {
      // 30〜90営業日ごとに局面を変える
      regimeLeft = Math.floor(rand.range(30, 90))
      const r = rand.next()
      regimeDrift = (spec.drift + (r < 0.35 ? -0.35 : r < 0.7 ? 0.3 : 0)) / 252
    }
    regimeLeft--
    logs.push(logs[i - 1] + regimeDrift - (dailyVol * dailyVol) / 2 + dailyVol * rand.normal())
  }

  // 2. 直近の形を銘柄ごとに決める。トヨタは「下げてから戻す」形にして、
  //    RSI の売られすぎやMACDのクロスが見えるようにしてある（あくまで表示確認用）。
  const tail = tailShape(spec.code, rand)
  const n = logs.length
  for (let k = 0; k < tail.length; k++) {
    const i = n - tail.length + k
    if (i > 0) logs[i] = logs[i - 1] + tail[k] + dailyVol * 0.25 * rand.normal()
  }

  // 3. 最新値を目標価格に合わせる
  const scale = spec.targetPrice / Math.exp(logs[n - 1])
  const closes = logs.map((l) => Math.exp(l) * scale)

  const bars: Bar[] = []
  for (let i = 0; i < n; i++) {
    const prevClose = i === 0 ? closes[0] : closes[i - 1]
    const close = closes[i]
    const open = prevClose * (1 + dailyVol * 0.3 * rand.normal())
    const spread = Math.abs(close - open) + prevClose * dailyVol * rand.range(0.2, 0.9)
    const high = Math.max(open, close) + spread * rand.range(0.1, 0.6)
    const low = Math.min(open, close) - spread * rand.range(0.1, 0.6)
    const move = Math.abs(Math.log(close / prevClose)) / dailyVol
    // 値動きが大きい日ほど出来高が膨らむ。まれに材料で数倍になる日を混ぜる
    const surge = rand.next() < 0.015 ? rand.range(2.5, 5) : 1
    const volume = spec.avgVolume * Math.exp(0.35 * rand.normal()) * (1 + 0.35 * move) * surge
    bars.push({
      time: toDateKey(days[i]),
      open: roundPrice(open, spec.currency),
      high: roundPrice(high, spec.currency),
      low: roundPrice(Math.max(low, 0.01), spec.currency),
      close: roundPrice(close, spec.currency),
      volume: Math.round(volume / 100) * 100,
    })
  }
  // 丸めで高値・安値が始値・終値の内側に入らないよう整える
  for (const b of bars) {
    b.high = Math.max(b.high, b.open, b.close)
    b.low = Math.min(b.low, b.open, b.close)
  }
  // 最終日は出来高を平均の2倍強にして「出来高急増」の表示も確認できるようにする
  if (spec.code === '7203') bars[bars.length - 1].volume = Math.round(spec.avgVolume * 2.8)
  return bars
}

/** 直近の日次対数リターンの型 */
function tailShape(code: string, rand: ReturnType<typeof createRandom>): number[] {
  if (code === '7203') {
    // 約1ヶ月の下落 → 最後の7日で反発
    return [...Array(18).fill(-0.0065), ...Array(7).fill(0.0085)]
  }
  const pattern = Math.floor(rand.next() * 3)
  if (pattern === 0) return Array(15).fill(0.004) // じり高
  if (pattern === 1) return Array(12).fill(-0.005) // じり安
  return []
}

/**
 * 日中足。dayOffset 日前（0 = 最新日）の1日分を stepMinutes 分刻みで作る。
 * 前日終値から始まり、その日の日足の終値で終わる。
 */
export function generateIntradayBars(spec: MockStockSpec, daily: Bar[], dayOffset = 0, stepMinutes = 5): Bar[] {
  const last = daily[daily.length - 1 - dayOffset]
  const prev = daily[daily.length - 2 - dayOffset] ?? last
  const rand = createRandom(hashString(`intraday:${spec.code}:${last.time}`))
  const date = new Date(`${last.time}T00:00:00Z`)

  // 分は UTC の0時からの経過。東証 9:00-11:30, 12:30-15:30（JST = UTC 0:00-2:30, 3:30-6:30）。
  // 米国株 9:30-16:00（米東部夏時間 = UTC 13:30-20:00）。
  const sessions: Array<[number, number]> =
    spec.currency === 'JPY' ? [[0, 150], [210, 390]] : [[810, 1200]]

  const slots: number[] = []
  for (const [from, to] of sessions) {
    for (let m = from; m < to; m += stepMinutes) slots.push(m)
  }

  const path: number[] = [prev.close]
  const stepVol = (spec.vol / Math.sqrt(252)) / Math.sqrt(slots.length)
  for (let i = 1; i <= slots.length; i++) path.push(path[i - 1] * Math.exp(stepVol * rand.normal()))
  // ブラウン橋で終値を日足に合わせる
  const drift = Math.log(last.close / path[path.length - 1])
  const bars: Bar[] = []
  for (let i = 0; i < slots.length; i++) {
    const adj = (k: number) => path[k] * Math.exp((drift * k) / slots.length)
    const open = adj(i)
    const close = adj(i + 1)
    const wiggle = Math.abs(close - open) + open * stepVol * 0.5
    bars.push({
      time: Math.floor(date.getTime() / 1000) + slots[i] * 60,
      open: roundPrice(open, spec.currency),
      high: roundPrice(Math.max(open, close) + wiggle * rand.next(), spec.currency),
      low: roundPrice(Math.min(open, close) - wiggle * rand.next(), spec.currency),
      close: roundPrice(close, spec.currency),
      volume: Math.round((last.volume / slots.length) * Math.exp(0.5 * rand.normal()) / 100) * 100,
    })
  }
  return bars
}

// --- 指数 -------------------------------------------------------------

interface IndexSpec {
  id: string
  name: string
  group: IndexQuote['group']
  base: number
  vol: number
  digits: number
  unit?: string
}

const INDICES: IndexSpec[] = [
  { id: 'n225', name: '日経平均', group: '日本', base: 45_200, vol: 0.013, digits: 2, unit: '円' },
  { id: 'topix', name: 'TOPIX', group: '日本', base: 3_150, vol: 0.011, digits: 2 },
  { id: 'growth', name: '東証グロース250', group: '日本', base: 760, vol: 0.016, digits: 2 },
  { id: 'reit', name: '東証REIT指数', group: '日本', base: 1_880, vol: 0.008, digits: 2 },
  { id: 'spx', name: 'S&P 500', group: '米国', base: 6_600, vol: 0.01, digits: 2 },
  { id: 'ndq', name: 'NASDAQ総合', group: '米国', base: 22_300, vol: 0.013, digits: 2 },
  { id: 'dji', name: 'NYダウ', group: '米国', base: 46_100, vol: 0.009, digits: 2, unit: 'ドル' },
  { id: 'usdjpy', name: 'ドル円', group: '為替・金利', base: 148.5, vol: 0.005, digits: 3, unit: '円' },
  { id: 'us10y', name: '米10年債利回り', group: '為替・金利', base: 4.15, vol: 0.02, digits: 3, unit: '%' },
  { id: 'gold', name: '金（NY先物）', group: '商品', base: 3_750, vol: 0.01, digits: 1, unit: 'ドル' },
  { id: 'wti', name: 'WTI原油', group: '商品', base: 64.5, vol: 0.02, digits: 2, unit: 'ドル' },
  { id: 'vix', name: 'VIX', group: 'ボラティリティ', base: 16.2, vol: 0.06, digits: 2 },
  { id: 'btc', name: 'ビットコイン', group: '暗号資産', base: 112_000, vol: 0.025, digits: 0, unit: 'ドル' },
]

export function generateIndices(asOf: Date = latestSessionDate()): IndexQuote[] {
  const key = toDateKey(asOf)
  return INDICES.map((spec) => {
    const rand = createRandom(hashString(`index:${spec.id}:${key}`))
    const previousClose = spec.base * (1 + spec.vol * 2 * rand.normal())
    const changePct = spec.vol * 100 * rand.normal()
    const value = previousClose * (1 + changePct / 100)
    return {
      id: spec.id,
      name: spec.name,
      group: spec.group,
      value,
      previousClose,
      change: value - previousClose,
      changePct,
      digits: spec.digits,
      unit: spec.unit,
      time: `${key}T06:00:00.000Z`,
    }
  })
}
