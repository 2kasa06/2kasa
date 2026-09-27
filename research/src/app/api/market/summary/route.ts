import { NextResponse } from 'next/server'
import { handle } from '@/lib/api'
import { getProviders } from '@/lib/providers'
import { marketFacts } from '@/lib/services/market'

export const GET = handle('market.summary', async () => {
  const indices = await getProviders().market.getIndices()
  if (indices.status !== 'ok') return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 502 })
  return NextResponse.json({ data: { indices: indices.data, facts: marketFacts(indices.data) }, source: indices.source })
})
