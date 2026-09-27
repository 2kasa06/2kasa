// チャート API の応答の形。サーバとブラウザの両方から読む（server-only を付けない）。

import type { Bar, ChartRange, SourceInfo } from './types'
import type { SignalStrength, SignalTone } from './technical/signals'

export interface Point {
  time: string | number
  value: number
}

export interface ChartMarker {
  time: string | number
  signalId: string
  type: string
  short: string
  label: string
  tone: SignalTone
  strength: SignalStrength
  date: string
  condition: string
  values: Record<string, number>
  active: boolean
}

/** チャートに重ねる指標。要求されたものだけ返して応答を軽くする */
export type Study = 'sma' | 'ema' | 'bb' | 'ichimoku' | 'vwap'
export const STUDIES: Study[] = ['sma', 'ema', 'bb', 'ichimoku', 'vwap']

export interface ChartPayload {
  code: string
  range: ChartRange
  interval: '5m' | '15m' | '1d'
  bars: Bar[]
  overlays: {
    sma5: Point[]
    sma25: Point[]
    sma75: Point[]
    sma200: Point[]
    ema12: Point[]
    ema26: Point[]
    bbUpper: Point[]
    bbMiddle: Point[]
    bbLower: Point[]
    vwap: Point[]
    tenkan: Point[]
    kijun: Point[]
    spanA: Point[]
    spanB: Point[]
    chikou: Point[]
  }
  panes: {
    volume: Array<Point & { up: boolean }>
    volumeMa: Point[]
    rsi: Point[]
    macd: Point[]
    signal: Point[]
    histogram: Point[]
  }
  /** 出来高が20本平均の2倍以上だった足 */
  volumeSpikes: Array<{ time: string | number; ratio: number }>
  markers: ChartMarker[]
  /** 最新時点の主な数値（マーカーの詳細で「現在値」として出す） */
  current: Record<string, number>
  vwapLabel: string
  source: SourceInfo
}

export const RANGES: Array<{ id: ChartRange; label: string }> = [
  { id: '1d', label: '1日' },
  { id: '1w', label: '1週' },
  { id: '1m', label: '1ヶ月' },
  { id: '3m', label: '3ヶ月' },
  { id: '6m', label: '6ヶ月' },
  { id: '1y', label: '1年' },
  { id: '3y', label: '3年' },
  { id: '5y', label: '5年' },
  { id: 'max', label: '全期間' },
]
