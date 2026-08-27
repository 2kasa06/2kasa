// タイムアウトとリトライ付きの fetch。外の世界は落ちる前提で書く。

const UA =
  'Mozilla/5.0 (compatible; boueishisetsu-watch/1.0; +https://github.com/2kasa06/2kasa)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @returns {Promise<{ok: boolean, status: number, url: string, body: string, error?: string}>}
 * 例外は投げない。呼び出し側が1件の失敗で止まらないようにするため。
 */
export async function get(url, { timeoutMs = 20000, retries = 2, accept } = {}) {
  let lastError = 'unknown'

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': UA,
          'accept-language': 'ja,en;q=0.8',
          ...(accept ? { accept } : {}),
        },
      })
      const body = await res.text()
      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        // 4xx は何度やっても同じなので、429 以外は即あきらめる
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          return { ok: false, status: res.status, url: res.url, body: '', error: lastError }
        }
        continue
      }
      return { ok: true, status: res.status, url: res.url, body }
    } catch (err) {
      lastError = err.name === 'AbortError' ? `timeout (${timeoutMs}ms)` : String(err.message || err)
    } finally {
      clearTimeout(timer)
    }
  }

  return { ok: false, status: 0, url, body: '', error: lastError }
}

/** 同時実行数を絞って走らせる。相手先を叩きすぎないように。 */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}
