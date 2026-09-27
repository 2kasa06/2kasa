import { z } from 'zod'
import { type CodeContext, codeSchema, fromResult, handle } from '@/lib/api'
import { getChartData } from '@/lib/services/chart'
import { STUDIES, type Study } from '@/lib/chart-types'

const rangeSchema = z.enum(['1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', 'max']).catch('6m')

export const GET = handle('stocks.prices', async (req, ctx: CodeContext) => {
  const code = codeSchema.parse((await ctx.params).code)
  const range = rangeSchema.parse(req.nextUrl.searchParams.get('range') ?? '6m')
  // studies=sma,ema,... 知らない名前は無視する
  const studies = new Set(
    (req.nextUrl.searchParams.get('studies') ?? 'sma').split(',').filter((x): x is Study => (STUDIES as string[]).includes(x)),
  )
  return fromResult(await getChartData(code, range, studies), 'stocks.prices')
}, { cacheSeconds: 60 })
