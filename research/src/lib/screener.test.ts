import { describe, expect, it } from 'vitest'
import type { Bar } from './types'
import { screenStock, sortScreener } from './screener'

const bars = (closes: number[]): Bar[] =>
  closes.map((c, i) => ({ time: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), open: c, high: c + 1, low: c - 1, close: c, volume: 1000 }))

const meta = { code: 'X', name: 'テスト', market: '東証プライム', sector: '' }

describe('スクリーナー', () => {
  it('上昇が続く銘柄は上昇方向の条件が多く、スコアが正になる', () => {
    const rising = screenStock(meta, bars(Array.from({ length: 260 }, (_, i) => 100 + i * 0.5)))!
    expect(rising.up).toBeGreaterThan(rising.down)
    expect(rising.score).toBeGreaterThan(0)
    expect(rising.signals.every((s) => s.label.length > 0)).toBe(true)
  })
  it('下落が続く銘柄はスコアが負になり、並べると後ろに来る', () => {
    const rising = screenStock({ ...meta, code: 'UP' }, bars(Array.from({ length: 260 }, (_, i) => 100 + i * 0.5)))!
    const falling = screenStock({ ...meta, code: 'DOWN' }, bars(Array.from({ length: 260 }, (_, i) => 300 - i * 0.5)))!
    expect(falling.score).toBeLessThan(0)
    expect(sortScreener([falling, rising]).map((x) => x.code)).toEqual(['UP', 'DOWN'])
  })
  it('足が足りなければ null', () => {
    expect(screenStock(meta, bars([1, 2, 3]))).toBeNull()
  })
})
