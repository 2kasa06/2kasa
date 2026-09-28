import { NextResponse } from 'next/server'
import { dataSource } from '@/lib/data-source'
import { getDb } from '@/lib/db'
import { logger } from '@/lib/logger'

// 監視用。データ提供元と DB の状態を返す（接続文字列などの内部情報は出さない）
export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  let database: 'ok' | 'disabled' | 'error' = 'disabled'
  if (db) {
    try {
      await db.$queryRaw`SELECT 1`
      database = 'ok'
    } catch (err) {
      logger.error('db.health_failed', { err })
      database = 'error'
    }
  }
  const status = database === 'error' ? 503 : 200
  return NextResponse.json(
    { status: status === 200 ? 'ok' : 'degraded', dataSource: dataSource(), database, time: new Date().toISOString() },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}
