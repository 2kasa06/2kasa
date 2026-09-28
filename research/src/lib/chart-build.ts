// チャート用のデータを組む。指標は全履歴で計算してから表示期間を切り出す。
// 先に切り出すと、200日線のような長い指標が表示期間の頭で欠けてしまうため。
//
// サーバ（API）とブラウザ（静的版）の両方から使うので、server-only を付けない。

import type { ChartMarker, ChartPayload, Point, Study } from '@/lib/chart-types'
import { bollinger, ema, ichimoku, macd, rsi, sma, volumeRatio, vwap, type Series } from '@/lib/technical/indicators'
import { analyzeSignals } from '@/lib/technical/signals'
import type { Bar, ChartRange } from '@/lib/types'

const WINDOW: Record<Exclude<ChartRange, '1d' | '1w' | 'max'>, number> = {
  '1m': 21,
  '3m': 63,
  '6m': 126,
  '1y': 252,
  '3y': 756,
  '5y': 1260,
}

const r2 = (v: number) => Math.round(v * 100) / 100

function toPoints(bars: Bar[], series: Series, from: number, shift = 0, times?: Array<string | number>): Point[] {
  const out: Point[] = []
  for (let i = from; i < series.length; i++) {
    const v = series[i]
    if (v === null || !Number.isFinite(v)) continue
    const t = times ? times[i + shift] : bars[i + shift]?.time
    if (t === undefined) continue
    out.push({ time: t, value: r2(v) })
  }
  return out
}

/** 最後の日足の翌営業日から n 日分（土日を除く）。一目の先行スパンを未来に描くのに使う */
function futureWeekdays(last: string, n: number): string[] {
  const out: string[] = []
  let d = new Date(`${last}T00:00:00Z`)
  while (out.length < n) {
    d = new Date(d.getTime() + 86_400_000)
    const w = d.getUTCDay()
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function buildChartPayload(code: string, range: ChartRange, bars: Bar[], daily: Bar[], source: ChartPayload['source'], studies: Set<Study>): ChartPayload {
  const intraday = range === '1d' || range === '1w'
  const on = (study: Study) => studies.has(study)
  const closes = bars.map((b) => b.close)
  const from = intraday ? 0 : Math.max(0, bars.length - (range === 'max' ? bars.length : WINDOW[range]))

  const bb = bollinger(closes, 20, 2)
  const m = macd(closes)
  const ich = ichimoku(bars)
  const vr = volumeRatio(bars, 20)
  const volAvg = sma(bars.map((b) => b.volume), 20)

  // 一目の先行スパンは26本先に描く。日足なら未来の営業日を足す
  const times: Array<string | number> = bars.map((b) => b.time)
  if (!intraday) times.push(...futureWeekdays(String(bars[bars.length - 1].time), ich.displacement))

  // シグナルのマーカーは日足で判定したもの。日中足の画面には出さない
  let markers: ChartMarker[] = []
  const { history, current: currentSignals } = analyzeSignals(daily)
  const current = currentSignals[0]?.current ?? history[0]?.current ?? {}
  if (!intraday) {
    const firstTime = String(bars[from].time)
    // 同じ種類が5本以内に続けて出たとき（RSI が 30 付近を行き来するなど）は最初の1つだけ描く。
    // 履歴の一覧には全件残る。
    const lastShown = new Map<string, number>()
    markers = [...history]
      .reverse()
      .filter((s) => s.date >= firstTime)
      .filter((s) => {
        const prev = lastShown.get(s.type)
        if (prev !== undefined && s.index - prev <= 5) return false
        lastShown.set(s.type, s.index)
        return true
      })
      .map((s) => ({
        time: s.date,
        signalId: s.id,
        type: s.type,
        short: s.short,
        label: s.label,
        tone: s.tone,
        strength: s.strength,
        date: s.date,
        condition: s.condition,
        values: s.values,
        active: s.active,
      }))
  }

  return {
    code,
    range,
    interval: range === '1d' ? '5m' : range === '1w' ? '15m' : '1d',
    bars: bars.slice(from),
    overlays: {
      sma5: on('sma') ? toPoints(bars, sma(closes, 5), from) : [],
      sma25: on('sma') ? toPoints(bars, sma(closes, 25), from) : [],
      sma75: on('sma') ? toPoints(bars, sma(closes, 75), from) : [],
      sma200: on('sma') ? toPoints(bars, sma(closes, 200), from) : [],
      ema12: on('ema') ? toPoints(bars, ema(closes, 12), from) : [],
      ema26: on('ema') ? toPoints(bars, ema(closes, 26), from) : [],
      bbUpper: on('bb') ? toPoints(bars, bb.upper, from) : [],
      bbMiddle: on('bb') ? toPoints(bars, bb.middle, from) : [],
      bbLower: on('bb') ? toPoints(bars, bb.lower, from) : [],
      vwap: on('vwap') ? toPoints(bars, intraday ? vwapBySession(bars) : vwap(bars, 20), from) : [],
      tenkan: on('ichimoku') ? toPoints(bars, ich.tenkan, from) : [],
      kijun: on('ichimoku') ? toPoints(bars, ich.kijun, from) : [],
      spanA: on('ichimoku') ? toPoints(bars, ich.spanA, Math.max(0, from - ich.displacement), ich.displacement, times) : [],
      spanB: on('ichimoku') ? toPoints(bars, ich.spanB, Math.max(0, from - ich.displacement), ich.displacement, times) : [],
      chikou: on('ichimoku') ? toPoints(bars, ich.chikou, from + ich.displacement, -ich.displacement) : [],
    },
    panes: {
      volume: bars.slice(from).map((b, k) => ({
        time: b.time,
        value: b.volume,
        up: b.close >= (k + from > 0 ? bars[k + from - 1].close : b.open),
      })),
      volumeMa: toPoints(bars, volAvg, from),
      rsi: toPoints(bars, rsi(closes, 14), from),
      macd: toPoints(bars, m.macd, from),
      signal: toPoints(bars, m.signal, from),
      histogram: toPoints(bars, m.histogram, from),
    },
    volumeSpikes: bars
      .map((b, i) => ({ time: b.time, ratio: vr[i] ?? 0, i }))
      .filter((x) => x.i >= from && x.ratio >= 2)
      .map(({ time, ratio }) => ({ time, ratio: r2(ratio) })),
    markers,
    current,
    vwapLabel: intraday ? 'VWAP（当日累積）' : 'VWAP（20日）',
    source,
  }
}

/** 日中足の VWAP は日ごとにリセットする */
function vwapBySession(bars: Bar[]): Series {
  const out: Series = []
  let day = ''
  let pv = 0
  let vol = 0
  for (const b of bars) {
    const d = new Date(Number(b.time) * 1000 + 9 * 3600_000).toISOString().slice(0, 10)
    if (d !== day) {
      day = d
      pv = 0
      vol = 0
    }
    pv += ((b.high + b.low + b.close) / 3) * b.volume
    vol += b.volume
    out.push(vol === 0 ? null : pv / vol)
  }
  return out
}

