// キャッシュの差し替え口。既定はプロセス内メモリ。
// REDIS_URL を使う実装は同じインターフェースで足せる（本番で複数台に分けるとき用）。

export interface Cache {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
}

class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expires: number }>()
  private readonly maxEntries = 500

  async get<T>(key: string) {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expires < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return hit.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    if (this.store.size >= this.maxEntries) {
      // 古いものから捨てる（Map は挿入順）
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
  }
}

const globalForCache = globalThis as unknown as { __researchCache?: Cache }
export const cache: Cache = globalForCache.__researchCache ?? (globalForCache.__researchCache = new MemoryCache())

/** キャッシュにあれば返し、無ければ作って覚える */
export async function cached<T>(key: string, ttlSeconds: number, produce: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key)
  if (hit !== undefined) return hit
  const value = await produce()
  await cache.set(key, value, ttlSeconds)
  return value
}
