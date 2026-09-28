// Route Handler の共通処理。レート制限・入力検証・エラーの隠蔽をここでそろえる。

import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { logger } from './logger'
import type { DataResult } from './types'

// --- レート制限（IP ごとのトークンバケット） ---------------------------
// プロセス内で数える簡易版。複数台で動かすときは Redis などの共有ストアに置き換える。

const CAPACITY = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120)
const buckets = new Map<string, { tokens: number; updated: number }>()

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

export function rateLimited(req: NextRequest): boolean {
  const key = clientKey(req)
  const now = Date.now()
  const b = buckets.get(key) ?? { tokens: CAPACITY, updated: now }
  b.tokens = Math.min(CAPACITY, b.tokens + ((now - b.updated) / 60_000) * CAPACITY)
  b.updated = now
  if (b.tokens < 1) {
    buckets.set(key, b)
    return true
  }
  b.tokens -= 1
  buckets.set(key, b)
  if (buckets.size > 10_000) buckets.clear() // 記憶が膨らみすぎないように
  return false
}

// --- 入力 -------------------------------------------------------------

export const codeSchema = z
  .string()
  .trim()
  .regex(/^[0-9A-Za-z.\-]{1,12}$/, '銘柄コードの形式が正しくありません')
  .transform((s) => s.toUpperCase())

// --- 応答 -------------------------------------------------------------

/** 動的ルートの context（params は Promise） */
export type CodeContext = { params: Promise<{ code: string }> }
type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse>

/**
 * 例外やレート制限をまとめて扱う。内部のエラー内容は利用者に返さず、ログにだけ残す。
 */
export function handle<C = unknown>(name: string, fn: Handler<C>, { cacheSeconds = 60 } = {}): Handler<C> {
  return async (req, ctx) => {
    if (rateLimited(req)) {
      logger.warn('api.rate_limited', { route: name })
      return NextResponse.json({ error: 'リクエストが多すぎます。しばらく待ってから再度お試しください。' }, { status: 429, headers: { 'Retry-After': '30' } })
    }
    try {
      const res = await fn(req, ctx)
      if (res.ok && !res.headers.has('Cache-Control')) {
        res.headers.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 5}`)
      }
      return res
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? '入力が正しくありません' }, { status: 400 })
      }
      logger.error('api.unhandled', { route: name, err })
      return NextResponse.json({ error: 'サーバーでエラーが発生しました' }, { status: 500 })
    }
  }
}

/** DataResult をそのまま HTTP に写す。error は中身を伏せる */
export function fromResult<T>(result: DataResult<T>, route: string): NextResponse {
  if (result.status === 'ok') return NextResponse.json({ data: result.data, source: result.source })
  if (result.status === 'empty') return NextResponse.json({ error: result.message ?? 'データがありません' }, { status: 404 })
  logger.error('api.data_error', { route, message: result.message })
  return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 502 })
}
