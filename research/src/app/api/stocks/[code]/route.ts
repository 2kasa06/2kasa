import { NextResponse } from 'next/server'
import { type CodeContext, codeSchema, handle } from '@/lib/api'
import { getStockPageData } from '@/lib/services/stock'

export const GET = handle('stocks.detail', async (req, ctx: CodeContext) => {
  const code = codeSchema.parse((await ctx.params).code)
  const data = await getStockPageData(code)
  if (!data) return NextResponse.json({ error: '銘柄が見つかりません' }, { status: 404 })
  return NextResponse.json({ data })
})
