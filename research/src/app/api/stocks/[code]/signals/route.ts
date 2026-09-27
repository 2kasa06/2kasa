import { type CodeContext, codeSchema, fromResult, handle } from '@/lib/api'
import { getSignalBundle } from '@/lib/services/stock'

export const GET = handle('stocks.signals', async (req, ctx: CodeContext) => {
  const code = codeSchema.parse((await ctx.params).code)
  return fromResult(await getSignalBundle(code), 'stocks.signals')
}, { cacheSeconds: 300 })
