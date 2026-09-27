// データベース接続。DATABASE_URL が無い環境（モックだけで動かす開発初期など）では null を返す。
// 呼び出し側は null のとき DB を使わない経路に切り替える。

import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { logger } from './logger'

const globalForDb = globalThis as unknown as { __prisma?: PrismaClient | null }

export function getDb(): PrismaClient | null {
  if (globalForDb.__prisma !== undefined) return globalForDb.__prisma
  const url = process.env.DATABASE_URL
  if (!url) {
    logger.info('db.disabled', { reason: 'DATABASE_URL が未設定のため DB を使いません' })
    globalForDb.__prisma = null
    return null
  }
  globalForDb.__prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  return globalForDb.__prisma
}
