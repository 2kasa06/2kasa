// ブラウザからチャートのデータを取る。
// 通常はサーバの API を呼ぶ。静的版では株価の JSON を読み、指標とシグナルをブラウザで計算する。

import { buildChartPayload } from './chart-build'
import type { ChartPayload, Study } from './chart-types'
import { IS_STATIC, staticDataUrl } from './static-mode'
import type { Bar, ChartRange, SourceInfo } from './types'

export type ChartLoadResult =
  | { status: 'ok'; data: ChartPayload; source: SourceInfo }
  | { status: 'empty' }
  | { status: 'error' }

/** 静的版で書き出す株価ファイルの形 */
export interface StaticBarsFile {
  source: SourceInfo
  daily: Bar[]
  intraday: { '1d': Bar[]; '1w': Bar[] }
}

// 同じ銘柄のファイルは一度だけ読む（期間や指標を切り替えるたびに取り直さない）
const barsCache = new Map<string, Promise<StaticBarsFile | null>>()

function loadBars(code: string): Promise<StaticBarsFile | null> {
  let p = barsCache.get(code)
  if (!p) {
    p = fetch(staticDataUrl(`bars/${encodeURIComponent(code)}.json`)).then((res) => {
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<StaticBarsFile>
    })
    // 失敗したときは次の操作で取り直せるように覚えない
    p.catch(() => barsCache.delete(code))
    barsCache.set(code, p)
  }
  return p
}

export async function loadChart(code: string, range: ChartRange, studies: Study[], signal: AbortSignal): Promise<ChartLoadResult> {
  if (IS_STATIC) {
    const file = await loadBars(code)
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    if (!file || file.daily.length < 2) return { status: 'empty' }
    const bars = range === '1d' || range === '1w' ? file.intraday[range] : file.daily
    const data = buildChartPayload(code, range, bars, file.daily, file.source, new Set(studies))
    return { status: 'ok', data, source: file.source }
  }

  const res = await fetch(`/api/stocks/${encodeURIComponent(code)}/prices?range=${range}&studies=${studies.join(',')}`, { signal })
  if (res.status === 404) return { status: 'empty' }
  if (!res.ok) return { status: 'error' }
  const json = await res.json()
  return { status: 'ok', data: json.data, source: json.source }
}
