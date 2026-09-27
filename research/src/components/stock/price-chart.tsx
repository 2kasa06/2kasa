'use client'

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RANGES, type ChartMarker, type ChartPayload, type Point, type Study } from '@/lib/chart-types'
import { fmtDate, fmtNumber, fmtValues } from '@/lib/format'
import { STRENGTH_LABEL } from '@/lib/technical/signals'
import type { ChartRange, SourceInfo } from '@/lib/types'
import { SourceNote } from '../source-note'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { cn } from '../ui/utils'
import { TONE_LABEL, ToneDot } from './tone'

type Overlay = Study
type Pane = 'volume' | 'rsi' | 'macd'

const OVERLAYS: Array<{ id: Overlay; label: string }> = [
  { id: 'sma', label: 'SMA 5/25/75/200' },
  { id: 'ema', label: 'EMA 12/26' },
  { id: 'bb', label: 'ボリンジャー(20,2σ)' },
  { id: 'ichimoku', label: '一目均衡表' },
  { id: 'vwap', label: 'VWAP' },
]
const PANES: Array<{ id: Pane; label: string }> = [
  { id: 'volume', label: '出来高' },
  { id: 'rsi', label: 'RSI(14)' },
  { id: 'macd', label: 'MACD(12,26,9)' },
]

/** 系列の色。固定の順番で割り当て、表示の有無で塗り替えない */
const SERIES_COLORS = {
  light: { sma5: '#eb6834', sma25: '#2a78d6', sma75: '#1baf7a', sma200: '#d55181', ema12: '#c98500', ema26: '#4a3aa7', bb: '#7d7c76', tenkan: '#e34948', kijun: '#2a78d6', spanA: '#1baf7a', spanB: '#e34948', chikou: '#7d7c76', vwap: '#4a3aa7' },
  dark: { sma5: '#d95926', sma25: '#3987e5', sma75: '#199e70', sma200: '#d55181', ema12: '#c98500', ema26: '#9085e9', bb: '#8d8c86', tenkan: '#e66767', kijun: '#3987e5', spanA: '#199e70', spanB: '#e66767', chikou: '#8d8c86', vwap: '#9085e9' },
}

function readVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** 日中足の UNIX 秒は、軸を日本時間で読めるよう9時間ずらして渡す */
const JST = 9 * 3600
const toTime = (t: string | number): Time => (typeof t === 'number' ? ((t + JST) as UTCTimestamp) : (t as Time))
const line = (pts: Point[]) => pts.map((p) => ({ time: toTime(p.time), value: p.value }))

function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

interface Props {
  code: string
  currency: 'JPY' | 'USD'
  initialRange?: ChartRange
}

export function PriceChart({ code, currency, initialRange = '6m' }: Props) {
  const [range, setRange] = useState<ChartRange>(initialRange)
  const [payload, setPayload] = useState<ChartPayload | null>(null)
  const [source, setSource] = useState<SourceInfo | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'empty'>('loading')
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(['sma']))
  const [panes, setPanes] = useState<Set<Pane>>(new Set(['volume', 'rsi', 'macd']))
  const [showMarkers, setShowMarkers] = useState(true)
  const [showWeak, setShowWeak] = useState(false)
  const [selected, setSelected] = useState<ChartMarker[] | null>(null)
  const [legend, setLegend] = useState<string>('')
  const box = useRef<HTMLDivElement>(null)
  // 表示する指標が変わったら取り直す（使わない指標は受け取らない）
  const studiesKey = [...overlays].sort().join(',')
  const dark = useIsDark()

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/stocks/${encodeURIComponent(code)}/prices?range=${range}&studies=${studiesKey}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = await res.json()
        if (res.status === 404) return setState('empty')
        if (!res.ok) return setState('error')
        setPayload(json.data)
        setSource(json.source)
        setState('ok')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setState('error')
      })
    return () => ctrl.abort()
  }, [code, range, studiesKey])

  const changeRange = (next: ChartRange) => {
    if (next === range) return
    setState('loading')
    setSelected(null)
    setRange(next)
  }

  const visibleMarkers = useMemo(
    () => (payload && showMarkers ? payload.markers.filter((m) => showWeak || m.strength !== 'low') : []),
    [payload, showMarkers, showWeak],
  )

  const digits = currency === 'USD' ? 2 : payload && payload.bars.at(-1)!.close < 1000 ? 1 : 0

  const onClick = useCallback(
    (param: MouseEventParams<Time>) => {
      if (!param.time) return setSelected(null)
      const hits = visibleMarkers.filter((m) => toTime(m.time) === param.time)
      setSelected(hits.length ? hits : null)
    },
    [visibleMarkers],
  )

  useEffect(() => {
    if (!payload || !box.current) return
    const c = dark ? SERIES_COLORS.dark : SERIES_COLORS.light
    const up = readVar('--up')
    const down = readVar('--down')
    const fg = readVar('--muted-foreground')
    const grid = readVar('--chart-grid')

    const chart: IChartApi = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: fg, fontSize: 11, panes: { separatorColor: grid } },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: payload.interval !== '1d', secondsVisible: false },
      localization: { locale: 'ja-JP', priceFormatter: (p: number) => fmtNumber(p, digits) },
    })

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down,
      priceLineVisible: true,
    })
    candles.setData(payload.bars.map((b) => ({ time: toTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close })))

    const addLine = (pts: Point[], color: string, opts: { width?: 1 | 2; style?: LineStyle; pane?: number; title?: string } = {}) => {
      const s = chart.addSeries(
        LineSeries,
        { color, lineWidth: opts.width ?? 1, lineStyle: opts.style ?? LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: opts.title },
        opts.pane ?? 0,
      )
      s.setData(line(pts))
      return s
    }

    const o = payload.overlays
    if (overlays.has('sma')) {
      addLine(o.sma5, c.sma5)
      addLine(o.sma25, c.sma25, { width: 2 })
      addLine(o.sma75, c.sma75, { width: 2 })
      addLine(o.sma200, c.sma200, { width: 2 })
    }
    if (overlays.has('ema')) {
      addLine(o.ema12, c.ema12, { style: LineStyle.Dashed })
      addLine(o.ema26, c.ema26, { style: LineStyle.Dashed })
    }
    if (overlays.has('bb')) {
      addLine(o.bbUpper, c.bb)
      addLine(o.bbMiddle, c.bb, { style: LineStyle.Dotted })
      addLine(o.bbLower, c.bb)
    }
    if (overlays.has('ichimoku')) {
      addLine(o.tenkan, c.tenkan)
      addLine(o.kijun, c.kijun)
      addLine(o.spanA, c.spanA, { style: LineStyle.Dashed })
      addLine(o.spanB, c.spanB, { style: LineStyle.Dashed })
      addLine(o.chikou, c.chikou, { style: LineStyle.Dotted })
    }
    if (overlays.has('vwap')) addLine(o.vwap, c.vwap, { width: 2 })

    // シグナルのマーカー。同じ日に複数あるときは縦に並ぶ。
    // 幅の狭い画面では文字が重なって読めなくなるので、印だけにしてタップで詳細を出す
    const narrow = box.current.clientWidth < 640
    const markers: SeriesMarker<Time>[] = visibleMarkers.map((m) => ({
      id: m.signalId,
      time: toTime(m.time),
      position: m.tone === 'down' ? 'aboveBar' : m.tone === 'up' ? 'belowBar' : 'inBar',
      shape: m.tone === 'down' ? 'arrowDown' : m.tone === 'up' ? 'arrowUp' : 'circle',
      color: m.tone === 'up' ? up : m.tone === 'down' ? down : readVar('--neutral'),
      text: narrow ? undefined : m.short,
      size: m.strength === 'high' ? 1.4 : 1,
    }))
    createSeriesMarkers(candles, markers)

    let paneIndex = 1
    if (panes.has('volume')) {
      const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false, title: '出来高' }, paneIndex)
      vol.setData(payload.panes.volume.map((v) => ({ time: toTime(v.time), value: v.value, color: v.up ? `${up}88` : `${down}88` })))
      addLine(payload.panes.volumeMa, fg, { pane: paneIndex })
      // 出来高が20本平均の2倍以上の足に印を付ける
      createSeriesMarkers(
        vol,
        payload.volumeSpikes.map((s) => ({ time: toTime(s.time), position: 'aboveBar', shape: 'circle', color: readVar('--neutral'), text: `×${s.ratio.toFixed(1)}`, size: 0.6 })),
      )
      paneIndex++
    }
    if (panes.has('rsi')) {
      const r = addLine(payload.panes.rsi, c.sma25, { width: 2, pane: paneIndex, title: 'RSI' })
      r.createPriceLine({ price: 70, color: down, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: '70' })
      r.createPriceLine({ price: 30, color: up, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: '30' })
      paneIndex++
    }
    if (panes.has('macd')) {
      const h = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, paneIndex)
      h.setData(payload.panes.histogram.map((p) => ({ time: toTime(p.time), value: p.value, color: p.value >= 0 ? `${up}99` : `${down}99` })))
      addLine(payload.panes.macd, c.sma25, { width: 2, pane: paneIndex, title: 'MACD' })
      addLine(payload.panes.signal, c.sma5, { pane: paneIndex, title: 'シグナル' })
    }

    const allPanes = chart.panes()
    allPanes[0]?.setStretchFactor(3)
    for (const p of allPanes.slice(1)) p.setStretchFactor(1)

    // 十字線の位置の四本値を上に出す
    const onMove = (param: MouseEventParams<Time>) => {
      const d = param.time ? (param.seriesData.get(candles) as { open: number; high: number; low: number; close: number } | undefined) : undefined
      setLegend(d ? `始 ${fmtNumber(d.open, digits)}  高 ${fmtNumber(d.high, digits)}  安 ${fmtNumber(d.low, digits)}  終 ${fmtNumber(d.close, digits)}` : '')
    }
    chart.subscribeCrosshairMove(onMove)
    chart.subscribeClick(onClick)
    chart.timeScale().fitContent()

    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      chart.unsubscribeClick(onClick)
      chart.remove()
    }
  }, [payload, overlays, panes, visibleMarkers, dark, digits, onClick])

  const toggle = <T,>(set: Set<T>, value: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    apply(next)
  }

  const colors = dark ? SERIES_COLORS.dark : SERIES_COLORS.light
  const height = 420 + panes.size * 110

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b pb-2" role="group" aria-label="表示期間">
        {RANGES.map((r) => (
          <Button key={r.id} variant="segment" size="xs" aria-pressed={range === r.id} onClick={() => changeRange(r.id)}>
            {r.label}
          </Button>
        ))}
        {payload && <span className="ml-auto text-[11px] text-muted-foreground">{payload.interval === '1d' ? '日足' : payload.interval === '15m' ? '15分足' : '5分足'}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-xs">
        {OVERLAYS.map((o) => (
          <label key={o.id} className="inline-flex cursor-pointer items-center gap-1">
            <input type="checkbox" checked={overlays.has(o.id)} onChange={() => toggle(overlays, o.id, setOverlays)} className="accent-primary" />
            {o.id === 'vwap' && payload ? payload.vwapLabel : o.label}
          </label>
        ))}
        <span className="text-muted-foreground">|</span>
        {PANES.map((p) => (
          <label key={p.id} className="inline-flex cursor-pointer items-center gap-1">
            <input type="checkbox" checked={panes.has(p.id)} onChange={() => toggle(panes, p.id, setPanes)} className="accent-primary" />
            {p.label}
          </label>
        ))}
        <span className="text-muted-foreground">|</span>
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input type="checkbox" checked={showMarkers} onChange={() => setShowMarkers((v) => !v)} className="accent-primary" />
          シグナル
        </label>
        <label className={cn('inline-flex cursor-pointer items-center gap-1', !showMarkers && 'opacity-50')}>
          <input type="checkbox" checked={showWeak} disabled={!showMarkers} onChange={() => setShowWeak((v) => !v)} className="accent-primary" />
          強さ「低」も表示
        </label>
      </div>

      {/* 系列の凡例（色だけで区別させない） */}
      {overlays.size > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pb-1 text-[11px] text-muted-foreground">
          {overlays.has('sma') &&
            (['sma5', 'sma25', 'sma75', 'sma200'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-3" style={{ background: colors[k] }} />
                SMA{k.slice(3)}
              </span>
            ))}
          {overlays.has('ema') &&
            (['ema12', 'ema26'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: colors[k] }} />
                EMA{k.slice(3)}
              </span>
            ))}
          {overlays.has('bb') && <span>ボリンジャー: 灰色（±2σ・中心は点線）</span>}
          {overlays.has('ichimoku') && <span>一目: 転換線(赤) 基準線(青) 先行スパンA(緑破線) B(赤破線) 遅行スパン(灰点線)</span>}
          {overlays.has('vwap') && payload && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ background: colors.vwap }} />
              {payload.vwapLabel}
            </span>
          )}
        </div>
      )}

      <div className="tabular flex h-4 justify-between gap-2 text-[11px] text-muted-foreground" aria-live="off">
        <span>{legend}</span>
        {showMarkers && <span className="hidden sm:inline">マーカーのある足をクリックすると、発生条件と数値を表示します</span>}
        {showMarkers && <span className="sm:hidden">印のある足をタップで詳細</span>}
      </div>

      <div className="relative" style={{ height }}>
        <div ref={box} className="absolute inset-0" />
        {state !== 'ok' && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/70 text-sm text-muted-foreground">
            {state === 'loading' && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {state === 'loading' ? '読み込み中…' : state === 'empty' ? 'データなし' : 'データ取得失敗'}
          </div>
        )}
      </div>

      {payload?.interval !== '1d' && state === 'ok' && (
        <p className="mt-1 text-[11px] text-muted-foreground">シグナルのマーカーは日足で判定しているため、日中足の表示では出しません。</p>
      )}

      {selected && (
        <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">{fmtDate(selected[0].date)} に発生したシグナル</span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelected(null)} aria-label="閉じる">
              <X className="size-4" />
            </Button>
          </div>
          <ul className="space-y-3">
            {selected.map((m) => (
              <li key={m.signalId}>
                <div className="flex flex-wrap items-center gap-2">
                  <ToneDot tone={m.tone} />
                  <span className="font-medium">{m.label}</span>
                  <Badge variant="outline">条件の強さ: {STRENGTH_LABEL[m.strength]}</Badge>
                  <Badge variant={m.active ? 'primary' : 'default'}>{m.active ? '現在も成立' : '現在は不成立'}</Badge>
                  <span className="text-xs text-muted-foreground">{TONE_LABEL[m.tone]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">発生条件: {m.condition}</p>
                <p className="tabular mt-0.5 text-xs">
                  発生時: {fmtValues(m.values)}
                </p>
                <p className="tabular text-xs text-muted-foreground">
                  現在値: {payload ? fmtValues(payload.current) : '—'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SourceNote source={source} className="mt-2" label="株価" />
    </div>
  )
}
