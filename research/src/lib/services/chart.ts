// チャート API 用。データを取り、共通の組み立て処理に渡す。

import 'server-only'
import { buildChartPayload } from '@/lib/chart-build'
import type { ChartPayload, Study } from '@/lib/chart-types'
import { cached } from '@/lib/cache'
import { getProviders } from '@/lib/providers'
import type { ChartRange, DataResult } from '@/lib/types'

export async function getChartData(code: string, range: ChartRange, studies: Set<Study> = new Set(['sma'])): Promise<DataResult<ChartPayload>> {
  const { market } = getProviders()
  const daily = await market.getHistory(code, 'max')
  if (daily.status !== 'ok') return daily
  if (daily.data.length === 0) return { status: 'empty', message: '株価データがありません' }

  const key = `chart:${code}:${range}:${[...studies].sort().join(',')}:${daily.source.asOf}`
  return cached(key, 300, async () => {
    let bars = daily.data
    if (range === '1d' || range === '1w') {
      const intraday = await market.getHistory(code, range)
      if (intraday.status !== 'ok') return intraday
      bars = intraday.data
    }
    if (bars.length < 2) return { status: 'empty', message: '表示できる足がありません' }
    return { status: 'ok', data: buildChartPayload(code, range, bars, daily.data, daily.source, studies), source: daily.source }
  })
}
