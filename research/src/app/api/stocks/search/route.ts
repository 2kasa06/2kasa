import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handle } from '@/lib/api'
import { getProviders } from '@/lib/providers'

const querySchema = z.string().trim().max(40, '検索語が長すぎます')

export const GET = handle('stocks.search', async (req) => {
  const q = querySchema.parse(req.nextUrl.searchParams.get('q') ?? '')
  const result = await getProviders().market.searchStocks(q, 8)
  if (result.status !== 'ok') return NextResponse.json({ data: [] })
  return NextResponse.json({
    data: result.data.map((s) => ({ code: s.code, name: s.name, nameEn: s.nameEn, ticker: s.ticker, market: s.market })),
    source: result.source,
  })
})
